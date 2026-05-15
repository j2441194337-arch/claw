import dotenv from 'dotenv';
import path from 'path';
import { rootDir } from './file.js';
import { readJson } from './file.js';

dotenv.config();

const configPath = path.join(rootDir, 'config.json');
const config = readJson(configPath, {});

function parseCsv(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  apiKeys: parseCsv(process.env.API_KEYS),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || ''
};

export { config };
