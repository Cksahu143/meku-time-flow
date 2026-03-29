import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sso-secret',
};

// Hash function matching the one in generate-sso-token
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max attempts per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(clientIp)) {
      console.warn(`Rate limited SSO verify attempt from ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests', valid: false }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate shared secret
    const ssoSecret = Deno.env.get('SSO_SHARED_SECRET');
    if (ssoSecret) {
      const providedSecret = req.headers.get('x-sso-secret');
      if (providedSecret !== ssoSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', valid: false }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided token
    const tokenHash = await hashToken(token);

    // Look up the token in the database
    const { data: ssoToken, error: lookupError } = await supabaseAdmin
      .from('sso_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (lookupError || !ssoToken) {
      console.warn(`Failed SSO verify attempt from ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired token',
          valid: false
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used (single-use)
    await supabaseAdmin
      .from('sso_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', ssoToken.id);

    // Return verified user data
    return new Response(
      JSON.stringify({
        valid: true,
        user: {
          edasUserId: ssoToken.edas_user_id,
          email: ssoToken.email,
          name: ssoToken.name,
          role: ssoToken.role,
          source: 'edas'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SSO token verification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
