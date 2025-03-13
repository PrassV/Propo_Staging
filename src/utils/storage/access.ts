import { supabase } from '../../lib/supabase';

export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('propertyimage')
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}

export async function getMultipleSignedUrls(paths: string[]): Promise<string[]> {
  return Promise.all(paths.map(path => getSignedUrl(path)));
}

/**
 * Refreshes a signed URL that might be expired
 * @param url The original signed URL
 * @param expiresIn Expiration time in seconds (default: 7 days)
 * @returns A new signed URL with a fresh expiration
 */
export async function refreshSignedUrl(url: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<string> {
  try {
    // Extract the path from the URL
    // URL format: https://[project].supabase.co/storage/v1/object/sign/propertyimage/[path]?token=[token]
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/propertyimage\/(.*)/);
    
    if (!pathMatch || !pathMatch[1]) {
      console.error('Could not extract path from signed URL:', url);
      return url; // Return original URL if we can't parse it
    }
    
    const path = pathMatch[1];
    return getSignedUrl(path, expiresIn);
  } catch (error) {
    console.error('Error refreshing signed URL:', error);
    return url; // Return original URL on error
  }
}

/**
 * Checks if a signed URL is expired and refreshes it if needed
 * @param url The signed URL to check
 * @returns The original URL if valid, or a new signed URL if expired
 */
export async function ensureValidSignedUrl(url: string): Promise<string> {
  try {
    // If it's not a signed URL, return as is
    if (!url.includes('/storage/v1/object/sign/')) {
      return url;
    }
    
    // Extract token from URL
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    
    if (!token) {
      return url; // Not a valid signed URL
    }
    
    // Decode the JWT to check expiration
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return url; // Not a valid JWT
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      
      // If token expires in less than 24 hours, refresh it
      const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
      if (expirationTime < oneDayFromNow) {
        console.log('Signed URL is expiring soon, refreshing:', url);
        return refreshSignedUrl(url);
      }
      
      return url; // URL is still valid
    } catch (tokenError) {
      console.error('Error parsing token:', tokenError);
      return refreshSignedUrl(url); // Refresh on error
    }
  } catch (error) {
    console.error('Error checking signed URL validity:', error);
    return url; // Return original URL on error
  }
}