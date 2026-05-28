/**
 * Virtual try-on via Replicate IDM-VTON.
 * Docs: https://replicate.com/cuuupid/idm-vton
 *
 * Limitation: CC BY-NC-SA 4.0 — non-commercial use only.
 * One garment per prediction. Priority: 外套 > 上衣 > 下著.
 */

const IDMVTON_VERSION =
  '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';

const CATEGORY_MAP: Record<string, string> = {
  外套: 'upper_body',
  上衣: 'upper_body',
  下著: 'lower_body',
};

export type TryOnItem = {
  category: string;
  name: string;
  brand: string | null;
  photo_url: string | null;
};

/**
 * Run virtual try-on.
 * @param humanImgUrl  Supabase signed URL of the user's full-body photo.
 * @param items        Selected wardrobe items (already have signed photo_url).
 * @param apiToken     Replicate API token.
 * @returns            Public image URL of the try-on result, or null on failure.
 */
export async function virtualTryOnReplicate(
  humanImgUrl: string,
  items: TryOnItem[],
  apiToken: string,
): Promise<string | null> {
  // Pick the highest-priority garment that has a photo
  const priority = ['外套', '上衣', '下著'];
  const item = priority
    .map(cat => items.find(i => i.category === cat && i.photo_url))
    .find(Boolean);

  if (!item?.photo_url) {
    console.warn('[IDM-VTON] no eligible garment with photo');
    return null;
  }

  const category = CATEGORY_MAP[item.category] ?? 'upper_body';
  const garmentDesc = item.brand
    ? `${item.name} by ${item.brand}`
    : item.name;

  console.log('[IDM-VTON] starting prediction — category:', category, 'item:', item.name);

  const predRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60', // block up to 60 s for sync result
    },
    body: JSON.stringify({
      version: IDMVTON_VERSION,
      input: {
        human_img: humanImgUrl,
        garm_img: item.photo_url,
        garment_des: garmentDesc,
        category,
        crop: true,
        steps: 30,
        seed: 42,
      },
    }),
  });

  if (!predRes.ok) {
    const errText = await predRes.text().catch(() => '');
    throw new Error(`[IDM-VTON] create prediction failed ${predRes.status}: ${errText.slice(0, 200)}`);
  }

  const prediction = await predRes.json();
  console.log('[IDM-VTON] prediction id:', prediction.id, 'status:', prediction.status);

  // Prefer: wait=60 may have already resolved it
  if (prediction.status === 'succeeded') {
    const out = prediction.output;
    return typeof out === 'string' ? out : Array.isArray(out) ? out[0] : null;
  }

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    throw new Error(`[IDM-VTON] prediction ${prediction.status}: ${prediction.error ?? ''}`);
  }

  // Poll every 3 s, up to 90 s total
  const id: string = prediction.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Bearer ${apiToken}` } },
    );
    const poll = await pollRes.json();
    console.log('[IDM-VTON] poll status:', poll.status);

    if (poll.status === 'succeeded') {
      const out = poll.output;
      return typeof out === 'string' ? out : Array.isArray(out) ? out[0] : null;
    }
    if (poll.status === 'failed' || poll.status === 'canceled') {
      throw new Error(`[IDM-VTON] prediction ${poll.status}: ${poll.error ?? ''}`);
    }
  }

  throw new Error('[IDM-VTON] prediction timed out after 90 s');
}
