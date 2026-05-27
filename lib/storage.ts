import { supabase } from './supabase';

/**
 * Convert a Supabase public URL to a signed URL (works even if bucket is private).
 * Falls back to the original URL if anything goes wrong.
 *
 * URL format: .../storage/v1/object/public/BUCKET/PATH
 */
export async function getSignedUrl(
  publicUrl: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  if (!publicUrl) return null;

  // Extract bucket + path from the public URL
  const match = publicUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!match) return publicUrl;

  const [, bucket, path] = match;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(decodeURIComponent(path), expiresIn);

  if (error || !data?.signedUrl) {
    console.warn('getSignedUrl fallback:', error?.message);
    return publicUrl;
  }
  return data.signedUrl;
}

/**
 * Convert multiple public URLs to signed URLs in parallel.
 */
export async function getSignedUrls(
  urls: (string | null)[],
  expiresIn = 3600,
): Promise<(string | null)[]> {
  return Promise.all(urls.map(u => getSignedUrl(u, expiresIn)));
}
