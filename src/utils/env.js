import dotenv from 'dotenv';
import path from 'path';
import { rootDir } from './file.js';
import { readJson } from './file.js';

dotenv.config();

const configPath = path.join(rootDir, 'config.json');
const config = readJson(configPath, {});

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL !== 'false',
  deliveryEncryptionKey: process.env.DELIVERY_ENCRYPTION_KEY || '',
  adminToken: process.env.ADMIN_TOKEN || '',
  thirdPartyAccount: process.env.THIRD_PARTY_ACCOUNT || '',
  thirdPartyPassword: process.env.THIRD_PARTY_PASSWORD || ''
};

export { config };
