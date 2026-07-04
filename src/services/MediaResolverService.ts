export class MediaResolverService {
  /**
   * Resolves a relative storage path (e.g. avatars/channels/xyz.webp) 
   * into an absolute delivery URL using custom CDN or Supabase Storage.
   */
  public static resolveUrl(relativePath: string, isPrivate: boolean = false): string {
    if (!relativePath) {
      return '';
    }

    // If it's already a full absolute URL (like a YouTube direct link), return it
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }

    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    
    // Support custom CDN if provided via env
    const customCdn = (import.meta as any).env?.VITE_MEDIA_CDN || null;
    if (customCdn && customCdn.toLowerCase() !== 'none' && customCdn.trim() !== '') {
      const normalizedCdn = customCdn.replace(/\/$/, '');
      return `${normalizedCdn}/${cleanPath}`;
    }

    // Fallback to Supabase Storage bucket resolution
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
    return `${cleanUrl}/storage/v1/object/public/media/${cleanPath}`;
  }
}
