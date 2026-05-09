import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(process.cwd());

export function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function appendLine(filePath, line) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

export { rootDir };
