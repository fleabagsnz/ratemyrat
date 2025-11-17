// lib/uploadRatImage.ts
import { supabase } from '@/lib/supabase';

// small helper to decode base64 in RN/Expo
function base64ToUint8Array(base64: string): Uint8Array {
  // atob is usually available in Expo; if not, we can swap this later
  const binaryString = global.atob ? global.atob(base64) : atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function uploadRatPngBase64(userId: string, base64: string) {
  // base64 from Skia is raw, not "data:image/png;base64,..."
  const bytes = base64ToUint8Array(base64);
  const filePath = `${userId}/${Date.now()}.png`;

  const { error } = await supabase.storage
    .from('rats')
    .upload(filePath, bytes, {
      contentType: 'image/png',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('rats')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
