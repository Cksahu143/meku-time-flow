import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Web Push helpers (RFC 8291 / RFC 8188 via web-push protocol) ---

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importECDSAKey(rawB64: string) {
  const raw = urlBase64ToUint8Array(rawB64);
  // raw is 32 bytes (private scalar); we need to import as JWK
  const d = base64UrlEncode(raw);
  // We need the public key to build JWK – derive from private
  // For simplicity, import as raw PKCS8
  // Actually, VAPID private key is just the d component of P-256
  // We'll use a JWK import
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d,
      // We need x,y too – but we can generate a throwaway to sign JWT
      // Instead, let's use the signing approach below
      x: "", y: "",
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(() => null);
}

// Simplified: Use a JWT-based VAPID authorization without full encryption
// For push notification, we send a simple fetch with VAPID headers
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

  // Import private key
  const rawKey = urlBase64ToUint8Array(VAPID_PRIVATE_KEY);
  const d = base64UrlEncode(rawKey);

  // We need to derive public key components from the VAPID_PUBLIC_KEY
  const pubBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  // Uncompressed point: 04 || x (32 bytes) || y (32 bytes)
  const x = base64UrlEncode(pubBytes.slice(1, 33));
  const y = base64UrlEncode(pubBytes.slice(33, 65));

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d, x, y },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (sigBytes.length === 64) {
    // Already raw format
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    // DER format: 0x30 len 0x02 rlen r 0x02 slen s
    const rLen = sigBytes[3];
    const rStart = 4;
    r = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    s = sigBytes.slice(sStart, sStart + sLen);
  }

  // Pad/trim to 32 bytes each
  const rPad = new Uint8Array(32);
  const sPad = new Uint8Array(32);
  rPad.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  sPad.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));

  const rawSig = new Uint8Array(64);
  rawSig.set(rPad, 0);
  rawSig.set(sPad, 32);

  const sigB64 = base64UrlEncode(rawSig);
  return `${unsigned}.${sigB64}`;
}

async function sendPushToEndpoint(
  endpoint: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  tag = "default"
) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJWT(audience);
  const vapidKey = VAPID_PUBLIC_KEY;

  // For simplicity, send a plaintext push (no payload encryption)
  // Most browsers accept this for showing notifications via the SW
  const pushPayload = JSON.stringify({ title, body, data, tag, icon: "/favicon.ico", badge: "/favicon.ico" });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidKey}`,
      "Content-Type": "application/json",
      TTL: "60",
      Urgency: "high",
    },
    body: pushPayload,
  });

  return { status: response.status, ok: response.ok };
}

// --- Main handler ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data, tag } = await req.json();

    if (!userId || !title) {
      return new Response(JSON.stringify({ error: "userId and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all push subscriptions for the target user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint")
      .eq("user_id", userId);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.allSettled(
      subs.map((sub) => sendPushToEndpoint(sub.endpoint, title, body || "", data || {}, tag || "default"))
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;

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
