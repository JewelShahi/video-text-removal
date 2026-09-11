const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const videoRoutes = require('./routes/video');

const app = express();
const PORT = process.env.PORT || 5000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');

[UPLOAD_DIR, PROCESSED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ─── Session and file cleanup ───────────────────────────────────────────── */

const sessions = new Map();

function createSession(filename) {
  sessions.set(filename, {
    timestamp: Date.now(),
    files: new Set([filename]),
  });
}

function addProcessedFile(originalFilename, processedFilename) {
  const session = sessions.get(originalFilename);
  if (session) {
    session.files.add(processedFilename);
    session.timestamp = Date.now();
  }
}

function touchSession(filename) {
  const session = sessions.get(filename);
  if (session) {
    session.timestamp = Date.now();
  }
}

function findSessionByFile(filename) {
  for (const [key, session] of sessions) {
    if (session.files.has(filename)) return key;
  }
  return null;
}

function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (e) {
    console.warn(`[cleanup] failed to delete ${filePath}: ${e.message}`);
  }
  return false;
}

function cleanupSession(filename, reason = 'Unknown') {
  let sessionKey = filename;
  if (!sessions.has(filename)) {
    sessionKey = findSessionByFile(filename);
  }

  const session = sessions.get(sessionKey);
  if (session) {
    for (const f of session.files) {
      safeDelete(path.join(UPLOAD_DIR, f));
      safeDelete(path.join(PROCESSED_DIR, f));
    }
    sessions.delete(sessionKey);
    console.log(`[cleanup] Session purged [${reason}]: ${sessionKey}`);
  }
}

function cleanupProcessedFiles(originalFilename) {
  let sessionKey = originalFilename;
  if (!sessions.has(originalFilename)) {
    sessionKey = findSessionByFile(originalFilename);
  }

  const session = sessions.get(sessionKey);
  if (session) {
    const toDelete = [];
    for (const f of session.files) {
      if (f !== originalFilename) {
        toDelete.push(f);
      }
    }
    
    toDelete.forEach((f) => {
      if (safeDelete(path.join(__dirname, 'processed', f))) {
        console.log(`[cleanup] Removed old processed file before re-processing: ${f}`);
      }
      session.files.delete(f);
    });
  }
}

const STALE_TIMEOUT = 2 * 60 * 1000; 
setInterval(() => {
  const now = Date.now();
  for (const [filename, session] of sessions) {
    if (now - session.timestamp > STALE_TIMEOUT) {
      cleanupSession(filename, 'Inactive for 2+ minutes');
    }
  }
}, 60 * 1000);

app.set('sessionStore', {
  createSession,
  addProcessedFile,
  touchSession,
  cleanupSession,
  findSessionByFile,
  cleanupProcessedFiles,
});

/* ─── Middleware and routes ──────────────────────────────────────────────── */

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/processed', express.static(PROCESSED_DIR));
app.use('/api', videoRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Video text remover backend listening on http://localhost:${PORT}`);
});
