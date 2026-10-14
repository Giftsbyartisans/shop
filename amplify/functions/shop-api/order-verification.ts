import { createHash, randomInt, randomBytes } from 'node:crypto';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function newChallenge(email: string, now = Math.floor(Date.now() / 1000)) {
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const token = randomBytes(32).toString('hex');
  return { code, token, record: { id: digest(email), token, codeHash: digest(`${token}:${code}`), expiresAt: now + 600, sentAt: now, attempts: 0 } };
}
export function orderPreview(order: Record<string, unknown>) {
  return { orderNumber: order.orderNumber, createdAt: order.createdAt, status: order.status };
}
export function publicOrder(order: Record<string, unknown>) {
  const { owner: _owner, requestFingerprint: _fingerprint, __typename: _typename, ...details } = order;
  return details;
}
