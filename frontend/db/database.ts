import * as SQLite from "expo-sqlite";
import { Centre, LocalAnalysis } from "../types/centre";

const DB_NAME = "cervixvision.db";

let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync(DB_NAME);
  return _db;
}

// ── Schema ────────────────────────────────────────────────────────────────────

export function initDatabase(): void {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS centres (
      code       TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id                TEXT PRIMARY KEY NOT NULL,
      centre_code       TEXT NOT NULL,
      image_path        TEXT NOT NULL,
      prediction        TEXT NOT NULL,
      confidence        REAL NOT NULL,
      risk_score        REAL NOT NULL,
      risk_level        TEXT NOT NULL,
      uncertainty_score REAL NOT NULL,
      uncertainty_level TEXT NOT NULL,
      lesion_class      TEXT NOT NULL,
      recommendation    TEXT NOT NULL,
      source            TEXT NOT NULL DEFAULT 'on_device',
      created_at        TEXT NOT NULL,
      synced            INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_centre
      ON analyses (centre_code, created_at DESC);
  `);
}

// ── Centre helpers ────────────────────────────────────────────────────────────

export function saveCentre(centre: Centre): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO centres (code, name, created_at) VALUES (?, ?, ?)`,
    [centre.code, centre.name, centre.createdAt]
  );
}

export function getCentreByCode(code: string): Centre | null {
  const row = getDb().getFirstSync<{ code: string; name: string; created_at: string }>(
    `SELECT * FROM centres WHERE code = ?`,
    [code]
  );
  if (!row) return null;
  return { code: row.code, name: row.name, createdAt: row.created_at };
}

export function getAllCentres(): Centre[] {
  return getDb()
    .getAllSync<{ code: string; name: string; created_at: string }>(
      `SELECT * FROM centres ORDER BY created_at DESC`
    )
    .map((r) => ({ code: r.code, name: r.name, createdAt: r.created_at }));
}

// ── Analysis helpers ──────────────────────────────────────────────────────────

export function saveAnalysis(a: LocalAnalysis): void {
  getDb().runSync(
    `INSERT INTO analyses
       (id, centre_code, image_path, prediction, confidence, risk_score,
        risk_level, uncertainty_score, uncertainty_level, lesion_class,
        recommendation, source, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      a.id, a.centreCode, a.imagePath, a.prediction,
      a.confidence, a.risk_score, a.risk_level,
      a.uncertainty_score, a.uncertainty_level, a.lesion_class,
      a.recommendation, a.source, a.createdAt, a.synced ? 1 : 0,
    ]
  );
}

export function getAnalysesByCentre(centreCode: string): LocalAnalysis[] {
  return getDb()
    .getAllSync<Record<string, unknown>>(
      `SELECT * FROM analyses WHERE centre_code = ? ORDER BY created_at DESC`,
      [centreCode]
    )
    .map(rowToAnalysis);
}

export function getAnalysisById(id: string): LocalAnalysis | null {
  const row = getDb().getFirstSync<Record<string, unknown>>(
    `SELECT * FROM analyses WHERE id = ?`,
    [id]
  );
  return row ? rowToAnalysis(row) : null;
}

function rowToAnalysis(r: Record<string, unknown>): LocalAnalysis {
  return {
    id:                r.id as string,
    centreCode:        r.centre_code as string,
    imagePath:         r.image_path as string,
    prediction:        r.prediction as "Positive" | "Negative",
    confidence:        r.confidence as number,
    risk_score:        r.risk_score as number,
    risk_level:        r.risk_level as string,
    uncertainty_score: r.uncertainty_score as number,
    uncertainty_level: r.uncertainty_level as "High" | "Low",
    lesion_class:      r.lesion_class as string,
    recommendation:    r.recommendation as string,
    source:            "on_device",
    createdAt:         r.created_at as string,
    synced:            (r.synced as number) === 1,
  };
}
