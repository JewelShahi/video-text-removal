const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { probeVideo, processVideo } = require('../utils/ffmpegProcessor');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const PROCESSED_DIR = path.join(__dirname, '..', 'processed');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

/* ── Upload ─────────────────────────────────────────────────────────────── */

router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

    const meta = await probeVideo(req.file.path);

    // Register this file in a new session
    const sessionStore = req.app.get('sessionStore');
    sessionStore.createSession(req.file.filename);

    res.json({
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      fps: meta.fps,
      codec: meta.codec,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read uploaded video', details: err.message });
  }
});

/* ── Process ────────────────────────────────────────────────────────────── */

router.post('/process', async (req, res) => {
  try {
    const { filename, rectangles, mode } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });
    if (!Array.isArray(rectangles) || rectangles.length === 0) {
      return res.status(400).json({ error: 'At least one rectangle is required' });
    }

    const inputPath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(inputPath)) return res.status(404).json({ error: 'Uploaded video not found' });

    const sessionStore = req.app.get('sessionStore');
    sessionStore.touchSession(filename);

    const meta = await probeVideo(inputPath);

    // FIX: Added -${Date.now()} to force a unique filename every time.
    // This prevents the browser from showing a cached version of the old video.
    const outFilename = `${path.parse(filename).name}-clean-${Date.now()}.mp4`;
    const outputPath = path.join(PROCESSED_DIR, outFilename);

    await processVideo(inputPath, outputPath, rectangles, mode || 'blur', {
      width: meta.width,
      height: meta.height,
      codec: meta.codec,
    });

    // Track the processed file so it gets cleaned up together
    sessionStore.addProcessedFile(filename, outFilename);

    const outMeta = await probeVideo(outputPath);

    res.json({
      url: `/processed/${outFilename}`,
      filename: outFilename,
      width: outMeta.width,
      height: outMeta.height,
      codec: outMeta.codec,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process video', details: err.message });
  }
});

/* ── Download — deletes all files for this session after serving ────────── */

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(PROCESSED_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Prevent browser cache so a re-download doesn't serve a ghost file
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  res.download(filePath, filename, (err) => {
    // Remove all files (upload + processed) once download finishes or fails
    const sessionStore = req.app.get('sessionStore');
    sessionStore.cleanupSession(filename);
  });
});

/* ── Heartbeat — client pings this every ~15 s to stay "active" ─────────── */

router.post('/heartbeat', (req, res) => {
  const { filename } = req.body;
  if (filename) {
    req.app.get('sessionStore').touchSession(filename);
  }
  res.json({ ok: true });
});

/* ── Cleanup — client sends this on beforeunload / tab close ────────────── */

router.post('/cleanup', (req, res) => {
  const { filename } = req.body;
  if (filename) {
    req.app.get('sessionStore').cleanupSession(filename);
  }
  res.json({ ok: true });
});

module.exports = router;