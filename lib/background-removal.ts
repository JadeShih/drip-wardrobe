import * as FileSystem from 'expo-file-system/legacy';

/**
 * Remove the background from a local photo URI using PhotoRoom API.
 * Returns a new local URI pointing to a PNG with transparent background.
 * Falls back to the original URI if anything fails.
 */
export async function removeBackground(localUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_PHOTOROOM_API_KEY;
  if (!apiKey) {
    console.warn('removeBackground: EXPO_PUBLIC_PHOTOROOM_API_KEY not set, skipping');
    return localUri;
  }

  try {
    // Build multipart form with the image
    const formData = new FormData();
    formData.append('image_file', {
      uri: localUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    formData.append('crop', 'false'); // keep original image dimensions, don't crop to subject

    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('removeBackground API error:', response.status, errText);
      // 402 = quota exhausted — surface a readable error so the caller can inform the user
      if (response.status === 402) {
        throw new Error('QUOTA_EXHAUSTED');
      }
      return localUri;
    }

    // Response is a PNG binary — save to a temp file
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const resultBase64 = btoa(binary);

    const outPath = `${FileSystem.cacheDirectory}rmbg_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(outPath, resultBase64, {
      encoding: 'base64' as any,
    });

    console.log('removeBackground: done →', outPath);
    return outPath;
  } catch (e) {
    console.error('removeBackground failed:', e);
    return localUri; // safe fallback
  }
}
