import * as crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function generateToken(payload: { id: string; username: string; role: string; name: string }): string {
  const data = {
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours expiry
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function verifyToken(token: string): { id: string; username: string; role: string; name: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (data.exp < Date.now()) {
      return null;
    }
    return {
      id: data.id,
      username: data.username,
      role: data.role,
      name: data.name,
    };
  } catch {
    return null;
  }
}
