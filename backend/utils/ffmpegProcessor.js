const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const MAX_LONG_SIDE = 1920;
const MAX_SHORT_SIDE = 1080;

/* ── Codec / resolution helpers ─────────────────────────────────────────── */

const H264_CODECS = ['h264', 'avc', 'avc1'];

function isH264(codec) {
  return codec && H264_CODECS.includes(codec.toLowerCase());
}

function isHD(width, height) {
  if (!width || !height) return false;
  const isPortrait = height > width;
  const longSide = isPortrait ? height : width;
  const shortSide = isPortrait ? width : height;
  return longSide <= MAX_LONG_SIDE && shortSide <= MAX_SHORT_SIDE;
}

function needsConversion(dims) {
  return !isH264(dims.codec) || !isHD(dims.width, dims.height);
}

/* ── ffprobe ────────────────────────────────────────────────────────────── */

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    console.log('\n[PROBE] Probing video file:', filePath);
    
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,duration,codec_name',
      '-show_entries', 'format=duration',
      '-of', 'json',
      filePath,
    ];
    
    console.log('🔍 [PROBE] ffprobe args:', args.join(' '));
    
    const ffprobe = spawn(ffprobePath, args);
    let out = '';
    let err = '';
    ffprobe.stdout.on('data', (d) => (out += d.toString()));
    ffprobe.stderr.on('data', (d) => (err += d.toString()));
    ffprobe.on('error', reject);
    ffprobe.on('close', (code) => {
      if (code !== 0) {
        console.error('[PROBE ERROR] ffprobe failed with code:', code);
        return reject(new Error(err || `ffprobe exited with code ${code}`));
      }
      try {
        const data = JSON.parse(out);
        console.log('[PROBE] Raw ffprobe output:', JSON.stringify(data, null, 2));
        
        const stream = data.streams && data.streams[0];
        const duration = parseFloat(
          (stream && stream.duration) || (data.format && data.format.duration) || 0
        );
        let fps = 30;
        if (stream && stream.r_frame_rate) {
          const [num, den] = stream.r_frame_rate.split('/').map(Number);
          if (den) fps = num / den;
        }
        
        const result = {
          width: stream ? stream.width : null,
          height: stream ? stream.height : null,
          duration,
          fps: Math.round(fps * 100) / 100,
          codec: stream ? stream.codec_name : null,
        };
        
        console.log('\n[PROBE STATTS] Parsed video info:');
        console.log('   ├─ Resolution:', `${result.width}x${result.height}`);
        console.log('   ├─ Duration:', `${result.duration}s (${formatDuration(result.duration)})`);
        console.log('   ├─ FPS:', result.fps);
        console.log('   ├─ Codec:', result.codec);
        console.log('   ├─ Is H264:', isH264(result.codec) ? 'Yes' : 'No');
        console.log('   └─ Is HD (≤1920x1080):', isHD(result.width, result.height) ? 'Yes' : 'No');
        
        resolve(result);
      } catch (e) {
        console.error('[PROBE ERROR] Failed to parse ffprobe output:', e.message);
        reject(e);
      }
    });
  });
}

/* ── Duration formatter ─────────────────────────────────────────────────── */

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── Rect utilities ─────────────────────────────────────────────────────── */

function clampRect(r) {
  const round2 = (n) => Math.max(2, Math.round(n / 2) * 2);
  return {
    x: Math.max(0, Math.round(r.x)),
    y: Math.max(0, Math.round(r.y)),
    w: round2(r.w),
    h: round2(r.h),
    start: r.start,
    end: r.end,
    angle: r.angle || 0,
  };
}

function buildEnableExpr(rect) {
  if (rect.start === undefined || rect.start === null || rect.end === undefined || rect.end === null) {
    return null;
  }
  return `between(t\\,${rect.start}\\,${rect.end})`;
}

/* ── Scale target ───────────────────────────────────────────────────────── */

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
  const result = isPortrait ? { w: newShort, h: newLong } : { w: newLong, h: newShort };
  
  console.log('[SCALE INFO] Computed scale target:');
  console.log('   ├─ Original:', `${width}x${height}`);
  console.log('   ├─ Orientation:', isPortrait ? 'Portrait' : 'Landscape');
  console.log('   ├─ Scale factor:', (factor * 100).toFixed(2) + '%');
  console.log('   └─ Target:', `${result.w}x${result.h}`);
  
  return result;
}

/* ── Filter builder ─────────────────────────────────────────────────────── */

function buildFilterComplex(rectangles, mode, dims) {
  console.log('\n[FILTER INFO] Building filter complex:');
  console.log('   ├─ Mode:', mode);
  console.log('   ├─ Video dims:', `${dims.width}x${dims.height}`);
  console.log('   └─ Rectangles count:', rectangles.length);
  
  const rects = rectangles.map(clampRect);
  
  // Log clamped rectangles
  console.log('\n[FILTER] Clamped rectangles:');
  rects.forEach((r, i) => {
    console.log(`   ├─ Rect ${i + 1}:`, `{ x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h}, angle: ${r.angle}°, start: ${r.start}, end: ${r.end} }`);
  });
  
  const shouldScale = !isHD(dims.width, dims.height);
  const scaleTarget = shouldScale ? computeScaleTarget(dims.width, dims.height) : null;
  
  if (shouldScale && scaleTarget) {
    console.log('[FILTER] Scaling will be applied:', `${scaleTarget.w}x${scaleTarget.h}`);
  } else {
    console.log('[FILTER] No scaling needed (already HD or smaller)');
  }

  /* ── delogo mode ───────────────────────────────────────────────────── */
  if (mode === 'delogo') {
    let chain = rects
      .map((r) => `delogo=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}:show=0`)
      .join(',');
    if (scaleTarget) chain += `,scale=${scaleTarget.w}:${scaleTarget.h}`;
    
    console.log('\n[FILTER] Delogo filter chain:');
    console.log('   └─', chain);
    
    return { filterComplex: null, videoFilter: chain, outLabel: null };
  }

  /* ── blur mode ─────────────────────────────────────────────────────── */
  const BLUR_PADDING = 100;
  const videoW = dims.width || 1920;
  const videoH = dims.height || 1080;
  
  console.log('\n[FILTER] Blur mode - building complex filter graph...');

  function safeBoxBlur(cropW, cropH) {
    const minSide = Math.min(cropW, cropH);
    const chromaMinSide = Math.floor(minSide / 2);
    const maxRadius = Math.floor((chromaMinSide - 3) / 2);
    const radius = Math.max(4, Math.min(40, maxRadius));
    const power = radius < 15 ? 4 : radius < 30 ? 3 : 2;
    return `boxblur=${radius}:${power}`;
  }

  const lines = [];
  let prevLabel = '0:v';

  rects.forEach((r, i) => {
    const angle = r.angle || 0;
    const enable = buildEnableExpr(r);
    const enablePart = enable ? `:enable='${enable}'` : '';
    const outLabel = i === rects.length - 1 ? 'vout' : `v${i}`;
    
    console.log(`\n   > Processing rect ${i + 1}/${rects.length} (angle: ${angle}°)`);

    if (Math.abs(angle) < 0.5) {
      console.log('     └─ Using axis-aligned blur');
      
      const cropX = Math.max(0, r.x - BLUR_PADDING);
      const cropY = Math.max(0, r.y - BLUR_PADDING);
      const cropRight = Math.min(videoW, r.x + r.w + BLUR_PADDING);
      const cropBottom = Math.min(videoH, r.y + r.h + BLUR_PADDING);
      const innerX = r.x - cropX;
      const innerY = r.y - cropY;

      let cropW = Math.max(cropRight - cropX, innerX + r.w);
      let cropH = Math.max(cropBottom - cropY, innerY + r.h);
      cropW = Math.max(2, Math.ceil(cropW / 2) * 2);
      cropH = Math.max(2, Math.ceil(cropH / 2) * 2);

      console.log(`       ├─ Crop region: ${cropW}x${cropH} at (${cropX}, ${cropY})`);
      console.log(`       ├─ Inner offset: (${innerX}, ${innerY})`);
      console.log(`       └─ Blur: ${safeBoxBlur(cropW, cropH)}`);

      lines.push(`[0:v]crop=${cropW}:${cropH}:${cropX}:${cropY},${safeBoxBlur(cropW, cropH)}[pad${i}]`);
      lines.push(`[pad${i}]crop=${r.w}:${r.h}:${innerX}:${innerY}[b${i}]`);
      lines.push(`[${prevLabel}][b${i}]overlay=${r.x}:${r.y}${enablePart}[${outLabel}]`);

    } else {
      console.log('     └─ Using rotated mask-based blur');
      
      const rad = angle * (Math.PI / 180);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;

      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      let aabbW = Math.ceil(r.w * absCos + r.h * absSin);
      let aabbH = Math.ceil(r.w * absSin + r.h * absCos);

      let cropX = Math.round(cx - aabbW / 2 - BLUR_PADDING / 2);
      let cropY = Math.round(cy - aabbH / 2 - BLUR_PADDING / 2);
      cropX = Math.max(0, cropX);
      cropY = Math.max(0, cropY);

      let cropW = aabbW + BLUR_PADDING;
      let cropH = aabbH + BLUR_PADDING;

      if (cropX + cropW > videoW) cropW = videoW - cropX;
      if (cropY + cropH > videoH) cropH = videoH - cropY;
      cropW = Math.max(2, Math.ceil(cropW / 2) * 2);
      cropH = Math.max(2, Math.ceil(cropH / 2) * 2);

      const patch_cx = Math.round(cx - cropX);
      const patch_cy = Math.round(cy - cropY);

      console.log(`       ├─ AABB size: ${aabbW}x${aabbH}`);
      console.log(`       ├─ Crop region: ${cropW}x${cropH} at (${cropX}, ${cropY})`);
      console.log(`       ├─ Patch center: (${patch_cx}, ${patch_cy})`);
      console.log(`       └─ Blur: ${safeBoxBlur(cropW, cropH)}`);

      const boxX = Math.round(patch_cx - r.w / 2);
      const boxY = Math.round(patch_cy - r.h / 2);
      
      lines.push(`[0:v]crop=${cropW}:${cropH}:${cropX}:${cropY}[aabb${i}]`);
      lines.push(`[aabb${i}]${safeBoxBlur(cropW, cropH)}[blurred${i}]`);
      lines.push(`color=c=black:s=${cropW}x${cropH}:d=1,format=yuva420p,drawbox=x=${boxX}:y=${boxY}:w=${r.w}:h=${r.h}:color=white:t=fill,rotate=${rad}:c=black:ow=${cropW}:oh=${cropH}[mask${i}]`);
      lines.push(`[blurred${i}]format=yuva420p[blurred_a${i}]`);
      lines.push(`[blurred_a${i}][mask${i}]alphamerge[masked_blur${i}]`);
      lines.push(`[${prevLabel}][masked_blur${i}]overlay=${cropX}:${cropY}${enablePart}[${outLabel}]`);
    }

    prevLabel = outLabel;
  });

  let finalLabel = prevLabel;
  if (scaleTarget) {
    lines.push(`[${finalLabel}]scale=${scaleTarget.w}:${scaleTarget.h}[vscaled]`);
    finalLabel = 'vscaled';
  }

  const filterComplexStr = lines.join(';');
  
  console.log('\n[FILTER INFO] Generated filter_complex:');
  console.log('   └─', filterComplexStr);
  console.log('\n[FILTER OUTPUT] Output label:', finalLabel);
  
  return { filterComplex: filterComplexStr, videoFilter: null, outLabel: finalLabel };
}

/* ── Main process function ──────────────────────────────────────────────── */

async function processVideo(inputPath, outputPath, rectangles, mode, dims) {
  console.log('\n' + '═'.repeat(60));
  console.log('[PROCESS] Starting video processing');
  console.log('═'.repeat(60));
  console.log('[PROCESS INPUT] Input:', inputPath);
  console.log('[PROCESS OUTPUT] Output:', outputPath);
  console.log('[PROCESS MODE] Mode:', mode);
  
  const { filterComplex, videoFilter, outLabel } = buildFilterComplex(rectangles, mode, dims);
  const convert = needsConversion(dims);
  
  console.log('\n[PROCESS] Conversion analysis:');
  console.log('   ├─ Needs codec conversion:', !isH264(dims.codec) ? 'Yes' : 'No', `(${dims.codec} → h264)`);
  console.log('   ├─ Needs resolution scaling:', !isHD(dims.width, dims.height) ? 'Yes' : 'No');
  console.log('   └─ Full conversion needed:', convert ? 'Yes' : 'No');

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

  if (convert) {
    console.log('\n[PROCESS] Using RE-ENCODE settings (full conversion):');
    console.log('   ├─ Video codec: libx264');
    console.log('   ├─ Preset: medium');
    console.log('   ├─ CRF: 23');
    console.log('   ├─ Pixel format: yuv420p');
    console.log('   ├─ Audio codec: aac');
    console.log('   ├─ Audio bitrate: 128k');
    console.log('   └─ Movflags: +faststart');
    
    args = args.concat([
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ]);
  } else {
    console.log('\n[PROCESS] Using FAST-PASS settings (stream copy where possible):');
    console.log('   ├─ Video codec: libx264');
    console.log('   ├─ Preset: fast');
    console.log('   ├─ CRF: 18');
    console.log('   ├─ Pixel format: yuv420p');
    console.log('   ├─ Audio codec: copy');
    console.log('   └─ Movflags: +faststart');
    
    args = args.concat([
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ]);
  }

  console.log('\n[PROCESS] Full ffmpeg command:');
  console.log('   └─', ffmpegPath, args.join(' '));

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log('\n[PROCESS STARTED] Starting ffmpeg...');
    
    const ffmpeg = spawn(ffmpegPath, args);
    let stderr = '';
    
    ffmpeg.stderr.on('data', (d) => {
      const msg = d.toString();
      stderr += msg;
      
      // Parse and log progress
      const timeMatch = msg.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
      const speedMatch = msg.match(/speed=\s*([\d.]+)x/);
      if (timeMatch && speedMatch) {
        const elapsed = (Date.now() - startTime) / 1000;
        process.stdout.write(`\rProgress: ${timeMatch[1]} | Speed: ${speedMatch[1]}x | Elapsed: ${elapsed.toFixed(1)}s`);
      }
    });
    
    ffmpeg.on('error', (err) => {
      console.error('\nPROCESS ERROR] ffmpeg spawn error:', err.message);
      reject(err);
    });
    
    ffmpeg.on('close', async (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n');
      
      if (code === 0) {
        console.log('[PROCESS COMPLETED] ffmpeg completed successfully!');
        console.log(`   └─ Processing time: ${elapsed}s`);
        
        // Probe the output video to get new info
        console.log('\n' + '─'.repeat(60));
        console.log('[RESULT] Probing output video...');
        console.log('─'.repeat(60));
        
        try {
          const newDims = await probeVideo(outputPath);
          
          console.log('\n' + '═'.repeat(60));
          console.log('[COMPARISON STATS] Before vs After');
          console.log('═'.repeat(60));
          console.log('                    │ BEFORE              │ AFTER');
          console.log('   ─────────────────┼─────────────────────┼─────────────────────');
          console.log(`   Resolution       │ ${String(dims.width + 'x' + dims.height).padEnd(19)} │ ${newDims.width}x${newDims.height}`);
          console.log(`   Duration         │ ${formatDuration(dims.duration).padEnd(19)} │ ${formatDuration(newDims.duration)}`);
          console.log(`   FPS              │ ${String(dims.fps).padEnd(19)} │ ${newDims.fps}`);
          console.log(`   Codec            │ ${String(dims.codec || 'N/A').padEnd(19)} │ ${newDims.codec}`);
          console.log(`   Is H264          │ ${String(isH264(dims.codec) ? 'Yes' : 'No').padEnd(19)} │ ${isH264(newDims.codec) ? 'Yes' : 'No'}`);
          console.log(`   Is HD            │ ${String(isHD(dims.width, dims.height) ? 'Yes' : 'No').padEnd(19)} │ ${isHD(newDims.width, newDims.height) ? 'Yes' : 'No'}`);
          console.log('═'.repeat(60));
          console.log(`[RESULT OUTPUT] Output file: ${outputPath}`);
          console.log(`[RESULT PROCESSING TIME] Total processing time: ${elapsed}s`);
          console.log('═'.repeat(60) + '\n');
          
          resolve({ outputPath, newDims, processingTime: elapsed });
        } catch (probeErr) {
          console.warn('[RESULT WARNING] Could not probe output video:', probeErr.message);
          console.log(`[RESULT OUTPUT] Output file: ${outputPath}`);
          console.log(`[RESULT PROCESSING TIME] Processing time: ${elapsed}s\n`);
          resolve({ outputPath, newDims: null, processingTime: elapsed });
        }
      } else {
        console.error('[PROCESS ERROR] ffmpeg failed with code:', code);
        console.error('[PROCESS ERROR] Last 2000 chars of stderr:');
        console.error(stderr.slice(-2000));
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
      }
    });
  });
}

/* ── Main wrapper function ──────────────────────────────────────────────── */

async function processAndLog(inputPath, outputPath, rectangles, mode = 'blur') {
  console.log('\n' + '█'.repeat(60));
  console.log('█' + ' '.repeat(58) + '█');
  console.log('█' + '  VIDEO TEXT REMOVAL - FULL PROCESS LOG  '.padStart(40).padEnd(58) + '█');
  console.log('█' + ' '.repeat(58) + '█');
  console.log('█'.repeat(60));
  
  try {
    // Step 1 - Probe original video
    console.log('\n[STEP 1/3] Analyzing source video...');
    const dims = await probeVideo(inputPath);
    
    // Step 2 - Build filters and show what will be done
    console.log('\nSTEP 2/3] Planning transformations...');
    console.log('\n[PLAN] Operations to be performed:');
    console.log(`   ├─ Text removal mode: ${mode}`);
    console.log(`   ├─ Number of regions: ${rectangles.length}`);
    
    if (rectangles.length > 0) {
      console.log('   ├─ Regions:');
      rectangles.forEach((r, i) => {
        const isRotated = r.angle && Math.abs(r.angle) >= 0.5;
        const timing = (r.start !== undefined && r.end !== undefined) 
          ? ` [${r.start}s - ${r.end}s]` 
          : ' [full duration]';
        console.log(`   │   └─ ${i + 1}. ${r.w}x${r.h} at (${r.x}, ${r.y})${isRotated ? ` rotated ${r.angle}°` : ''}${timing}`);
      });
    }
    
    if (!isH264(dims.codec)) {
      console.log(`   ├─ Codec conversion: ${dims.codec} → h264`);
    }
    
    if (!isHD(dims.width, dims.height)) {
      const target = computeScaleTarget(dims.width, dims.height);
      if (target) {
        console.log(`   ├─ Resolution scaling: ${dims.width}x${dims.height} → ${target.w}x${target.h}`);
      }
    }
    
    console.log('   └─ Ready to process!');
    
    // Step 3 - Process the video
    console.log('\n[STEP 3/3] Processing video...');
    const result = await processVideo(inputPath, outputPath, rectangles, mode, dims);
    
    return result;
    
  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('[FATAL ERROR] Processing failed:');
    console.error('═'.repeat(60));
    console.error('   └─ Error:', error.message);
    console.error('═'.repeat(60) + '\n');
    throw error;
  }
}

module.exports = { 
  probeVideo, 
  processVideo, 
  buildFilterComplex, 
  computeScaleTarget, 
  needsConversion,
  processAndLog
};
