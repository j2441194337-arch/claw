import dotenv from 'dotenv';
import path from 'path';
import { rootDir } from './file.js';
import { readJson } from './file.js';

dotenv.config();

const configPath = path.join(rootDir, 'config.json');
const config = readJson(configPath, {});

function parseAllowedModels(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  provider: process.env.DEFAULT_PROVIDER || process.env.PROVIDER || config?.routing?.defaultProvider || 'openai',
  adminSecret: process.env.ADMIN_SECRET || 'change-me',
  dbPath: path.resolve(rootDir, process.env.JSON_DB_PATH || './data/db.json'),
  requestLogPath: path.resolve(rootDir, process.env.REQUEST_LOG_PATH || './logs/requests.log'),
  dailyStatsPath: path.resolve(rootDir, process.env.DAILY_STATS_PATH || './logs/daily-stats.json'),
  defaultMarkupRate: Number(process.env.DEFAULT_MARKUP_RATE || config?.pricing?.markupRate || 1.35),
  defaultSubscriptionMonthly: Number(process.env.DEFAULT_SUBSCRIPTION_MONTHLY || config?.pricing?.monthlySubscription || 99),
  thirdPartyApiBaseUrl: process.env.THIRD_PARTY_API_BASE_URL || '',
  thirdPartyApiKeysEnv: 'THIRD_PARTY_API_KEYS',
  defaultModel: process.env.DEFAULT_MODEL || '',
  allowedModels: parseAllowedModels(process.env.ALLOWED_MODELS)
};

export { config };
