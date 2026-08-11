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
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
    const meta = await probeVideo(req.file.path);
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

router.post('/process', async (req, res) => {
  try {
    const { filename, rectangles, mode } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });
    if (!Array.isArray(rectangles) || rectangles.length === 0) {
      return res.status(400).json({ error: 'At least one rectangle is required' });
    }

    const inputPath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(inputPath)) return res.status(404).json({ error: 'Uploaded video not found' });

    // Re-probe to get authoritative source dimensions for the HD-cap decision.
    const meta = await probeVideo(inputPath);

    const outFilename = `${path.parse(filename).name}-clean.mp4`;
    const outputPath = path.join(PROCESSED_DIR, outFilename);

    await processVideo(inputPath, outputPath, rectangles, mode || 'blur', {
      width: meta.width,
      height: meta.height,
    });

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

module.exports = router;
