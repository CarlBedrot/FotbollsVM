import { getSupabaseAdmin } from '../supabase';

export const AVATAR_BUCKET = 'avatars';

/** Allowed image content types mapped to the file extension we store them as. */
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

/** Derive a storage file extension from an image content type, or null if unsupported. */
export function extFromContentType(contentType: string): string | null {
  return CONTENT_TYPE_EXT[contentType.toLowerCase()] ?? null;
}

/**
 * Append a version query to a public URL. The stored object path is stable
 * (`${userId}.${ext}`), so a re-upload of the same format yields a byte-identical
 * URL — the browser keeps the old `<img src>` and the CDN serves a cached copy.
 * A unique `?v=` per upload makes the URL change so both refetch the new image.
 */
export function cacheBustedUrl(publicUrl: string, version: number | string): string {
  const sep = publicUrl.includes('?') ? '&' : '?';
  return `${publicUrl}${sep}v=${version}`;
}

/**
 * Create the public `avatars` bucket if it doesn't already exist. Idempotent: a
 * concurrent/repeat creation that races into an "already exists" error is swallowed.
 */
export async function ensureAvatarBucket(): Promise<void> {
  const storage = getSupabaseAdmin().storage;
  const { data: buckets, error: listError } = await storage.listBuckets();
  if (listError) throw new Error(listError.message);
  if (buckets?.some((b) => b.name === AVATAR_BUCKET)) return;

  const { error: createError } = await storage.createBucket(AVATAR_BUCKET, { public: true });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}

/**
 * Upload an avatar image for a user and return its public URL. The bucket is
 * created on demand. The object is stored at `${userId}.${ext}` and overwritten
 * on each upload so a user only ever has one avatar object.
 */
export async function uploadAvatar(
  userId: string,
  file: { buffer: Buffer | Uint8Array; contentType: string; ext: string },
): Promise<string> {
  await ensureAvatarBucket();
  const storage = getSupabaseAdmin().storage;
  const path = `${userId}.${file.ext}`;

  const { error: uploadError } = await storage
    .from(AVATAR_BUCKET)
    .upload(path, file.buffer, { upsert: true, contentType: file.contentType });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return cacheBustedUrl(data.publicUrl, Date.now());
}
