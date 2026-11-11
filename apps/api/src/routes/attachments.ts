import { Hono } from 'hono';
import { fromBase64, toBase64 } from '../lib/crypto';
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
// Keep comfortably below D1 1 MB row/statement limit even after base64 overhead
const MAX_ATTACHMENT_BYTES = 350 * 1024;

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
          error: `Account limit reached (max ${maxAttach} saved invoice screenshots). Delete an old attachment first.`,
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
    return c.json(
      { error: 'Image must be 350 KB or smaller after compression.' },
      400
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!matchesImageSignature(file.type, bytes)) {
    return c.json({ error: 'Invalid image file signature.' }, 400);
  }

  const now = new Date().toISOString();
  const dataBase64 = toBase64(bytes);
  const safeName = file.name.slice(0, 120) || `invoice.${ext}`;
  const attachmentKey = `d1:${id}`;

  await c.env.DB.prepare(
    `INSERT INTO tracker_attachments (tracker_id, user_id, mime, data_base64, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(tracker_id) DO UPDATE SET
       mime = excluded.mime,
       data_base64 = excluded.data_base64,
       size_bytes = excluded.size_bytes,
       created_at = excluded.created_at`
  )
    .bind(id, authUser.id, file.type, dataBase64, bytes.length, now)
    .run();

  await c.env.DB.prepare(
    `UPDATE trackers
     SET attachment_key = ?, attachment_mime = ?, attachment_name = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(attachmentKey, file.type, safeName, now, id, authUser.id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM trackers WHERE id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .first<TrackerRow>();

  return c.json({ tracker: serializeTracker(updated!) });
});

attachmentRoutes.get('/:id/attachment', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    'SELECT mime, data_base64 FROM tracker_attachments WHERE tracker_id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<{ mime: string; data_base64: string }>();

  if (!row) {
    return c.json({ error: 'Attachment not found.' }, 404);
  }

  const bytes = fromBase64(row.data_base64);
  const headers = new Headers();
  headers.set('Content-Type', row.mime || 'application/octet-stream');
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(bytes, { headers });
});

attachmentRoutes.delete('/:id/attachment', async (c) => {
  const authUser = c.get('authUser');
  const id = c.req.param('id');

  const tracker = await c.env.DB.prepare(
    'SELECT id FROM trackers WHERE id = ? AND user_id = ?'
  )
    .bind(id, authUser.id)
    .first<Pick<TrackerRow, 'id'>>();

  if (!tracker) return c.json({ error: 'Tracker not found.' }, 404);

  await c.env.DB.prepare('DELETE FROM tracker_attachments WHERE tracker_id = ? AND user_id = ?')
    .bind(id, authUser.id)
    .run();

  await c.env.DB.prepare(
    `UPDATE trackers
     SET attachment_key = NULL, attachment_mime = NULL, attachment_name = NULL, updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(new Date().toISOString(), id, authUser.id)
    .run();

  return c.json({ ok: true });
});
