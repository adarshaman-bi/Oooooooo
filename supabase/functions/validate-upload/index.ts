// =========================================================================
// BIOVISED — Storage Upload Validation Edge Function
// =========================================================================
// Runs as a Supabase Edge Function triggered on storage.objects INSERT.
// Validates MIME type, magic bytes, file size, filename safety, and
// user ownership before allowing the upload to complete.
// =========================================================================
// Deploy: supabase functions deploy validate-upload --no-verify-jwt
// (JWT is verified manually inside the function for granular control)
// =========================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface UploadEvent {
  type: 'INSERT';
  table: string;
  schema: string;
  record: {
    id: string;
    bucket_id: string;
    name: string;
    owner: string;
    size: number;
    content_type: string;
    metadata: Record<string, unknown>;
  };
  old_record: Record<string, unknown>;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif',
  '.pdf', '.txt',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
  'image/avif': [new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])],
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
};

function sanitizeFilename(name: string): boolean {
  // Reject path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  // Reject hidden files
  if (name.startsWith('.')) return false;
  // Reject shell metacharacters
  if (/[;&|`$(){}]/.test(name)) return false;
  // Must have an allowed extension
  const ext = '.' + name.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function isSVG(contentType: string): boolean {
  return contentType === 'image/svg+xml';
}

async function validateMagicBytes(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  expectedMime: string
): Promise<boolean> {
  // For SVG, skip magic byte check (SVGs are text/XML, not binary)
  if (isSVG(expectedMime)) {
    return true;
  }

  const magicPatterns = MAGIC_BYTES[expectedMime];
  if (!magicPatterns) return false; // Unknown MIME type

  try {
    const { data, error } = await supabase.storage
      .from('user-content')
      .download(filePath);

    if (error || !data) return false;

    const buffer = await data.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 16));

    return magicPatterns.some(pattern =>
      pattern.every((byte, i) => header[i] === byte)
    );
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  try {
    // Verify JWT manually
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

    // Parse webhook payload
    const event: UploadEvent = await req.json();
    const { bucket_id, name, owner, size, content_type } = event.record;

    // 1. Bucket check — only validate 'user-content'
    if (bucket_id !== 'user-content') {
      return new Response(JSON.stringify({ allowed: true }), { status: 200 });
    }

    // 2. Ownership check
    if (owner !== user.id) {
      return new Response(
        JSON.stringify({ allowed: false, error: 'File owner does not match authenticated user' }),
        { status: 403 }
      );
    }

    // 3. File size check
    if (size > MAX_FILE_SIZE) {
      // Delete the oversized file
      await supabase.storage.from(bucket_id).remove([name]);
      return new Response(
        JSON.stringify({ allowed: false, error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` }),
        { status: 413 }
      );
    }

    // 4. MIME type check
    if (!ALLOWED_MIME_TYPES.has(content_type)) {
      await supabase.storage.from(bucket_id).remove([name]);
      return new Response(
        JSON.stringify({ allowed: false, error: `MIME type ${content_type} not allowed` }),
        { status: 415 }
      );
    }

    // 5. Filename sanitization
    if (!sanitizeFilename(name)) {
      await supabase.storage.from(bucket_id).remove([name]);
      return new Response(
        JSON.stringify({ allowed: false, error: 'Invalid filename' }),
        { status: 400 }
      );
    }

    // 6. SVG sanitization — reject SVG uploads (XSS vector)
    if (isSVG(content_type)) {
      await supabase.storage.from(bucket_id).remove([name]);
      return new Response(
        JSON.stringify({ allowed: false, error: 'SVG uploads are not supported' }),
        { status: 415 }
      );
    }

    // 7. Magic byte validation
    const validMagic = await validateMagicBytes(supabase, name, content_type);
    if (!validMagic) {
      await supabase.storage.from(bucket_id).remove([name]);
      return new Response(
        JSON.stringify({ allowed: false, error: 'File content does not match declared MIME type' }),
        { status: 415 }
      );
    }

    // 8. Virus scanning — invoke external scanner (placeholder)
    // TODO: Integrate with ClamAV or similar:
    // const scanResult = await scanFile(supabase, bucket_id, name);
    // if (!scanResult.clean) { ... reject }

    return new Response(
      JSON.stringify({ allowed: true, message: 'Upload validated successfully' }),
      { status: 200 }
    );
  } catch (err) {
    console.error('[validate-upload] Error:', err);
    return new Response(
      JSON.stringify({ allowed: false, error: 'Internal validation error' }),
      { status: 500 }
    );
  }
});
