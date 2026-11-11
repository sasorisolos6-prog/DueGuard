import { Hono } from 'hono';
import { serializeTracker } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import { PLAN_LIMITS, type AppVariables, type Env, type TrackerRow } from '../types';

export const attachmentRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

attachmentRoutes.use('*', requireAuth);

const ALLOWED_MIMES: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB

function matchesImageSignature(mime: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (mime === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/webp') {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

attachmentRoutes.post('/:id/attachment', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const tracker = await c.env.DB.prepare(
    'SELECT * FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<TrackerRow>();

  if (!tracker) return c.json({ error: 'Tracker not found.' }, 404);

  // Enforce attachment limit unless replacing an existing attachment on this tracker
  if (!tracker.attachment_key) {
    const countRes = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM trackers WHERE user_id = ? AND attachment_key IS NOT NULL'
    )
      .bind(authUser.id)
      .first<{ total: number }>();

    const maxAttach = PLAN_LIMITS[authUser.plan].maxAttachments;
    if ((countRes?.total ?? 0) >= maxAttach) {
      return c.json(
        {
          error: `Free plan allows up to ${maxAttach} invoice screenshots. Delete an old attachment or upgrade to Pro.`,
          code: 'PLAN_LIMIT_REACHED',
        },
        403
      );
    }
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) return c.json({ error: 'Multipart form data required.' }, 400);

  const fileEntry = formData.get('file') as unknown;
  if (
    !fileEntry ||
    typeof fileEntry !== 'object' ||
    typeof (fileEntry as File).arrayBuffer !== 'function' ||
    typeof (fileEntry as File).type !== 'string'
  ) {
    return c.json({ error: 'Missing image file.' }, 400);
  }
  const file = fileEntry as File;

  const ext = ALLOWED_MIMES[file.type];
  if (!ext) {
    return c.json({ error: 'Only PNG, JPEG, and WebP images are supported.' }, 400);
  }
  if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) {
    return c.json({ error: 'Image must be smaller than 2 MB.' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!matchesImageSignature(file.type, bytes)) {
    return c.json({ error: 'Invalid image file signature.' }, 400);
  }

  const objectKey = `${authUser.id}/${id}-${crypto.randomUUID()}.${ext}`;
  await c.env.VAULT_BUCKET.put(objectKey, buffer, {
    httpMetadata: { contentType: file.type },
  });

  if (tracker.attachment_key) {
    await c.env.VAULT_BUCKET.delete(tracker.attachment_key);
  }

  const safeName = file.name.slice(0, 120) || `invoice.${ext}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE trackers
     SET attachment_key = ?, attachment_mime = ?, attachment_name = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(objectKey, file.type, safeName, now, id, authUser.id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .first<TrackerRow>();

  return c.json({ tracker: serializeTracker(updated!) });
});

attachmentRoutes.get('/:id/attachment', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const tracker = await c.env.DB.prepare(
    'SELECT attachment_key, attachment_mime FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<Pick<TrackerRow, 'attachment_key' | 'attachment_mime'>>();

  if (!tracker || !tracker.attachment_key) {
    return c.json({ error: 'Attachment not found.' }, 404);
  }

  const object = await c.env.VAULT_BUCKET.get(tracker.attachment_key);
  if (!object) {
    return c.json({ error: 'Attachment file missing from vault storage.' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', tracker.attachment_mime || 'application/octet-stream');
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(object.body, { headers });
});

attachmentRoutes.delete('/:id/attachment', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const tracker = await c.env.DB.prepare(
    'SELECT attachment_key FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<Pick<TrackerRow, 'attachment_key'>>();

  if (!tracker) return c.json({ error: 'Tracker not found.' }, 404);

  if (tracker.attachment_key) {
    await c.env.VAULT_BUCKET.delete(tracker.attachment_key);
  }

  await c.env.DB.prepare(
    `UPDATE trackers
     SET attachment_key = NULL, attachment_mime = NULL, attachment_name = NULL, updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(new Date().toISOString(), id, authUser.id)
    .run();

  return c.json({ ok: true });
});
