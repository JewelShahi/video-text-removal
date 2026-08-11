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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/processed', express.static(PROCESSED_DIR));
app.use('/api', videoRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Video text remover backend listening on http://localhost:${PORT}`);
});
