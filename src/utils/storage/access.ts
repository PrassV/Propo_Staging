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