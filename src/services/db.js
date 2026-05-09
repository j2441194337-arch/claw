import { env } from '../utils/env.js';
import { readJson, writeJson } from '../utils/file.js';

export function loadDb() {
  return readJson(env.dbPath, {
    users: [],
    providerState: {},
    usage: [],
    subscriptions: []
  });
}

export function saveDb(db) {
  writeJson(env.dbPath, db);
}

export function mutateDb(mutator) {
  const db = loadDb();
  const result = mutator(db) || db;
  saveDb(result);
  return result;
}
