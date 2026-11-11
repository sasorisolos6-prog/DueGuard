import { createMiddleware } from 'hono/factory';
import { verifyAuthToken } from '../lib/crypto';
import type { AppVariables, Env, UserRow } from '../types';

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = await verifyAuthToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Invalid or expired session token.' }, 401);
  }

  // Re-verify user exists and read latest plan tier from D1
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, plan FROM users WHERE id = ?'
  )
    .bind(payload.id)
    .first<Pick<UserRow, 'id' | 'email' | 'name' | 'plan'>>();

  if (!user) {
    return c.json({ error: 'Account no longer exists.' }, 401);
  }

  c.set('authUser', {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
  });

  await next();
});
