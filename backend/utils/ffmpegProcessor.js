const { spawn } = require('child_process');

// Prebuilt binaries installed straight into this project's node_modules —
// no system-wide ffmpeg/ffprobe install required.
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const MAX_LONG_SIDE = 1920; // HD long edge
const MAX_SHORT_SIDE = 1080; // HD short edge

/**
 * Run ffprobe to get width/height/duration/fps/codec of a video file.
 */
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,duration,codec_name',
      '-show_entries', 'format=duration',
      '-of', 'json',
      filePath,
    ];
    const ffprobe = spawn(ffprobePath, args);
    let out = '';
    let err = '';
    ffprobe.stdout.on('data', (d) => (out += d.toString()));
    ffprobe.stderr.on('data', (d) => (err += d.toString()));
    ffprobe.on('error', reject);
    ffprobe.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `ffprobe exited with code ${code}`));
      try {
        const data = JSON.parse(out);
        const stream = data.streams && data.streams[0];
        const duration = parseFloat(
          (stream && stream.duration) || (data.format && data.format.duration) || 0
        );
        let fps = 30;
        if (stream && stream.r_frame_rate) {
          const [num, den] = stream.r_frame_rate.split('/').map(Number);
          if (den) fps = num / den;
        }
        resolve({
          width: stream ? stream.width : null,
          height: stream ? stream.height : null,
          duration,
          fps,
          codec: stream ? stream.codec_name : null,
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Non-negative, integer, even width/height (some filters/encoders require even dims).
function clampRect(r) {
  const round2 = (n) => Math.max(2, Math.round(n / 2) * 2);
  return {
    x: Math.max(0, Math.round(r.x)),
    y: Math.max(0, Math.round(r.y)),
    w: round2(r.w),
    h: round2(r.h),
    start: r.start,
    end: r.end,
  };
}

function buildEnableExpr(rect) {
  if (rect.start === undefined || rect.start === null || rect.end === undefined || rect.end === null) {
    return null;
  }
  return `between(t\\,${rect.start}\\,${rect.end})`;
}

/**
 * If the source exceeds HD (1920x1080, orientation-aware), compute a
 * downscale target that fits within HD while preserving aspect ratio.
 * Returns null if the source is already HD or smaller (no upscaling).
 */
function computeScaleTarget(width, height) {
  if (!width || !height) return null;
  const isPortrait = height > width;
  const longSide = isPortrait ? height : width;
  const shortSide = isPortrait ? width : height;
  if (longSide <= MAX_LONG_SIDE && shortSide <= MAX_SHORT_SIDE) return null;

  const factor = Math.min(MAX_LONG_SIDE / longSide, MAX_SHORT_SIDE / shortSide, 1);
  const evenRound = (n) => Math.max(2, Math.round((n * factor) / 2) * 2);
  const newLong = evenRound(longSide);
  const newShort = evenRound(shortSide);
  return isPortrait ? { w: newShort, h: newLong } : { w: newLong, h: newShort };
}

/**
 * Build the ffmpeg filter for the given rectangles/mode/source dimensions.
 *
 * mode = 'blur'   -> crop each region from the ORIGINAL frame, boxblur it,
 *                    then overlay it back at the exact same position.
 *                    Nothing else in the frame is resized/distorted.
 *
 * mode = 'delogo' -> ffmpeg's built-in delogo filter (interpolates the
 *                    region from surrounding pixels).
 *
 * A downscale-to-HD step is appended at the very end (after text removal),
 * only if the source exceeds HD.
 */
function buildFilterComplex(rectangles, mode, dims) {
  const rects = rectangles.map(clampRect);
  const scaleTarget = computeScaleTarget(dims.width, dims.height);

  if (mode === 'delogo') {
    let chain = rects
      .map((r) => `delogo=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}:show=0`)
      .join(',');
    if (scaleTarget) chain += `,scale=${scaleTarget.w}:${scaleTarget.h}`;
    return { filterComplex: null, videoFilter: chain, outLabel: null };
  }

  // blur mode
  const lines = [];
  rects.forEach((r, i) => {
    lines.push(`[0:v]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=20:10[b${i}]`);
  });

  let prevLabel = '0:v';
  rects.forEach((r, i) => {
    const outLabel = i === rects.length - 1 ? 'vout' : `v${i}`;
    const enable = buildEnableExpr(r);
    const enablePart = enable ? `:enable='${enable}'` : '';
    lines.push(`[${prevLabel}][b${i}]overlay=${r.x}:${r.y}${enablePart}[${outLabel}]`);
    prevLabel = outLabel;
  });

  let finalLabel = prevLabel;
  if (scaleTarget) {
    lines.push(`[${finalLabel}]scale=${scaleTarget.w}:${scaleTarget.h}[vscaled]`);
    finalLabel = 'vscaled';
  }

  return { filterComplex: lines.join(';'), videoFilter: null, outLabel: finalLabel };
}

/**
 * Process the video: remove text per rectangles/mode, and always normalize
 * output to H.265 (HEVC), capped at HD resolution if the source is larger.
 */
function processVideo(inputPath, outputPath, rectangles, mode, dims) {
  return new Promise((resolve, reject) => {
    const { filterComplex, videoFilter, outLabel } = buildFilterComplex(rectangles, mode, dims);

    let args = ['-y', '-i', inputPath];

    if (filterComplex) {
      args = args.concat([
        '-filter_complex', filterComplex,
        '-map', `[${outLabel}]`,
        '-map', '0:a?',
      ]);
    } else {
      args = args.concat(['-vf', videoFilter, '-map', '0:v', '-map', '0:a?']);
    }

    args = args.concat([
      // Always normalize to H.265/HEVC, HD-capped, regardless of source codec/size.
      '-c:v', 'libx265',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-tag:v', 'hvc1', // Apple/QuickTime/Safari compatibility for HEVC in mp4
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ]);

    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = '';
    ffmpeg.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

module.exports = { probeVideo, processVideo, buildFilterComplex, computeScaleTarget };
