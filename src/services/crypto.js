import crypto from 'crypto';
import { env } from '../utils/env.js';

function getEncryptionKey() {
  if (!env.deliveryEncryptionKey && env.nodeEnv === 'production') {
    const error = new Error('Missing DELIVERY_ENCRYPTION_KEY');
    error.code = 'missing_encryption_key';
    throw error;
  }

  const source = env.deliveryEncryptionKey || 'development-only-delivery-key';
  return crypto.createHash('sha256').update(source).digest();
}

export function encryptConnectionCode(rawConnectionCode) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(rawConnectionCode, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.from(JSON.stringify({
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  })).toString('base64url');
}
