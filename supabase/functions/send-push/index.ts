import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Base64 helpers ---
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function stdBase64ToUint8Array(base64: string): Uint8Array {
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

// --- VAPID JWT ---
async function createVapidJWT(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: "mailto:edas-push@lovable.app",
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const rawKey = urlBase64ToUint8Array(VAPID_PRIVATE_KEY);
  const d = base64UrlEncode(rawKey);
  const pubBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const x = base64UrlEncode(pubBytes.slice(1, 33));
  const y = base64UrlEncode(pubBytes.slice(33, 65));

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d, x, y },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsigned)
    )
  );

  // Web Crypto ECDSA returns raw r||s (64 bytes) for P-256
  const sigB64 = base64UrlEncode(signature);
  return `${unsigned}.${sigB64}`;
}

// --- RFC 8291 Web Push Encryption ---
async function encryptPayload(
  clientPublicKeyB64: string, // standard base64
  clientAuthB64: string,      // standard base64
  payloadText: string
): Promise<Uint8Array> {
  const clientPublicKey = stdBase64ToUint8Array(clientPublicKeyB64);
  const clientAuth = stdBase64ToUint8Array(clientAuthB64);
  const payload = new TextEncoder().encode(payloadText);

  // 1. Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );

  // 2. Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      serverKeyPair.privateKey,
      256
    )
  );

  // 4. Random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. Derive IKM: HKDF(salt=clientAuth, ikm=sharedSecret, info="WebPush: info\0" || client_pub || server_pub)
  const keyInfo = concatBuffers(
    new TextEncoder().encode("WebPush: info\0"),
    clientPublicKey,
    serverPublicKeyRaw
  );
  const sharedSecretKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: clientAuth, info: keyInfo },
      sharedSecretKey,
      256
    )
  );

  // 6. Derive CEK (16 bytes) and nonce (12 bytes)
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: aes128gcm\0") },
      ikmKey,
      128
    )
  );
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("Content-Encoding: nonce\0") },
      ikmKey,
      96
    )
  );

  // 7. Pad payload: content + 0x02 delimiter (last record)
  const padded = new Uint8Array(payload.length + 1);
  padded.set(payload, 0);
  padded[payload.length] = 2;

  // 8. AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  // 9. Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(serverPub) + ciphertext
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  rsBytes[0] = (rs >> 24) & 0xff;
  rsBytes[1] = (rs >> 16) & 0xff;
  rsBytes[2] = (rs >> 8) & 0xff;
  rsBytes[3] = rs & 0xff;
  const idLen = new Uint8Array([serverPublicKeyRaw.length]);

  return concatBuffers(salt, rsBytes, idLen, serverPublicKeyRaw, encrypted);
}

// --- Send push to a single endpoint ---
async function sendPushToEndpoint(
  endpoint: string,
  p256dh: string,
  auth: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  tag = "default"
) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJWT(audience);

  const pushPayload = JSON.stringify({
    title,
    body,
    data,
    tag,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    requireInteraction: true,
    actions: data.callId
      ? [
          { action: "answer", title: "✅ Answer" },
          { action: "reject", title: "❌ Decline" },
        ]
      : [],
  });

  const encryptedBody = await encryptPayload(p256dh, auth, pushPayload);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "60",
      Urgency: "high",
    },
    body: encryptedBody,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`Push failed for ${endpoint}: ${response.status} ${text}`);
  }

  return { status: response.status, ok: response.ok };
}

// --- Main handler ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data, tag } = await req.json();

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "userId and title required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPushToEndpoint(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          title,
          body || "",
          data || {},
          tag || "default"
        )
      )
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).ok
    ).length;

    // Clean up expired/invalid subscriptions (410 Gone)
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (
        r.status === "fulfilled" &&
        ((r.value as any).status === 410 || (r.value as any).status === 404)
      ) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subs[i].endpoint);
      }
    }

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
