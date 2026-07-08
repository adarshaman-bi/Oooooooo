// =========================================================================
// BIOVISED — Signed URL Generator Edge Function
// =========================================================================
// Generates short-lived signed URLs for secure file access from storage.
// Call: POST /functions/v1/signed-url with { bucket, path } + Bearer token
// Returns: { url: "https://...", expiresIn: 3600 }
// =========================================================================
// Deploy: supabase functions deploy signed-url
// JWT verification is handled by Supabase Gateway (--verify-jwt by default)
// =========================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'No auth token' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }

    const { bucket, path, expiresIn = 3600 } = await req.json();

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bucket, path' }),
        { status: 400 }
      );
    }

    // Validate user owns the file (path starts with their UID)
    if (bucket === 'user-content') {
      const ownerId = path.split('/')[0];
      if (ownerId !== user.id) {
        return new Response(
          JSON.stringify({ error: 'You do not own this file' }),
          { status: 403 }
        );
      }
    }

    const signedUrlExpiry = Math.min(Math.max(expiresIn, 60), 86400); // 1min – 24h

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, signedUrlExpiry);

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message || 'Failed to generate signed URL' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        url: data.signedUrl,
        expiresIn: signedUrlExpiry,
        expiresAt: new Date(Date.now() + signedUrlExpiry * 1000).toISOString(),
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('[signed-url] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
