const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function ensureDirectory(targetPath) {
    if (!targetPath) return;
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
}

function sanitizeFileTimestamp(timestamp) {
    return timestamp.replace(/[:]/g, '-').replace(/[.]/g, '-').replace('Z', '');
}

function initDataStore({ dbPath, backupDir }) {
    if (!dbPath) {
        throw new Error('Database path is required');
    }

    ensureDirectory(path.dirname(dbPath));
    if (backupDir) ensureDirectory(backupDir);

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    db.prepare(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

    db.prepare(`
    CREATE TABLE IF NOT EXISTS snapshot_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      note TEXT,
      value TEXT NOT NULL
    )
  `).run();

    const getSnapshotStmt = db.prepare('SELECT value FROM app_state WHERE key = ?');
    const upsertSnapshotStmt = db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (@key, @value, @updated_at)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
    const insertHistoryStmt = db.prepare('INSERT INTO snapshot_history (created_at, note, value) VALUES (@created_at, @note, @value)');
    const listHistoryStmt = db.prepare('SELECT id, created_at, note FROM snapshot_history ORDER BY id DESC LIMIT ?');
    const getHistoryStmt = db.prepare('SELECT id, value FROM snapshot_history WHERE id = ?');

    function parseSnapshot(row) {
        if (!row || !row.value) return null;
        try {
            return JSON.parse(row.value);
        } catch (error) {
            console.error('Failed to parse snapshot JSON', error);
            return null;
        }
    }

    function writeBackupFile(payload, createdAt) {
        if (!backupDir) return null;
        try {
            const filename = `snapshot-${sanitizeFileTimestamp(createdAt)}.json`;
            const filePath = path.join(backupDir, filename);
            fs.writeFileSync(filePath, payload, 'utf8');
            return filePath;
        } catch (error) {
            console.error('Failed to write backup file', error);
            return null;
        }
    }

    return {
        getSnapshot() {
            const row = getSnapshotStmt.get('snapshot');
            return parseSnapshot(row);
        },
        saveSnapshot(snapshot, { note } = {}) {
            if (typeof snapshot !== 'object' || snapshot === null) {
                throw new Error('Snapshot must be a non-null object');
            }
            const payload = JSON.stringify(snapshot);
            const now = new Date().toISOString();
            upsertSnapshotStmt.run({ key: 'snapshot', value: payload, updated_at: now });
            insertHistoryStmt.run({ created_at: now, note: note || null, value: payload });
            writeBackupFile(payload, now);
            return { updatedAt: now };
        },
        listArchives(limit = 20) {
            return listHistoryStmt.all(limit);
        },
        restoreArchive(id) {
            const row = getHistoryStmt.get(id);
            if (!row) {
                throw new Error(`Archive ${id} not found`);
            }
            const value = parseSnapshot(row);
            if (!value) {
                throw new Error(`Archive ${id} contains invalid data`);
            }
            this.saveSnapshot(value, { note: `restore:${id}` });
            return value;
        }
    };
}

module.exports = { initDataStore };
