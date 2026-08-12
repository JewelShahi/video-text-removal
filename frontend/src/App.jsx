import React, { useState, useEffect, useRef } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import RectangleEditor from './components/RectangleEditor.jsx';
import RectangleList from './components/RectangleList.jsx';
import { uploadVideo, processVideo } from './api.js';

export default function App() {
  const [meta, setMeta] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [mode, setMode] = useState('blur');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const heartbeatRef = useRef(null);

  // ── Session Heartbeat & Cleanup ────────────────────────────────────────
  useEffect(() => {
    if (!meta?.filename) return;

    const filename = meta.filename;

    // Ping every 15s to keep session alive
    heartbeatRef.current = setInterval(() => {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
    }, 15000);

    // Auto-cleanup when tab closes or user navigates away
    const handleBeforeUnload = () => {
      const blob = new Blob([JSON.stringify({ filename })], { type: 'application/json' });
      navigator.sendBeacon('/api/cleanup', blob);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [meta?.filename]);

  const handleSelect = async (file) => {
    setError(null);
    setResult(null);
    setRectangles([]);
    setUploading(true);
    try {
      const data = await uploadVideo(file);
      setMeta(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!meta || rectangles.length === 0) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const payload = rectangles.map((r) => ({
        // Convert internal x,y back to top-left x,y for the backend
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        angle: r.angle || 0, // Pass the rotation!
        start: r.start,
        end: r.end,
      }));
      const data = await processVideo(meta.filename, payload, mode);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setMeta(null);
    setRectangles([]);
    setResult(null);
    setError(null);
  };

  return (
    <div data-theme="night" className="min-h-screen bg-base-300">
      <div className="navbar bg-base-100 shadow-md px-6">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xl">🎬</span>
          <span className="text-lg font-bold">Video Text Remover</span>
        </div>
        {meta && (
          <button className="btn btn-sm btn-ghost" onClick={reset}>
            Start over
          </button>
        )}
      </div>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {!meta && (
          <>
            <div className="alert bg-base-100 shadow text-sm">
              <span>
                Upload a video, draw boxes over any text or logo, and it'll be removed —
                only those regions are touched, so the rest of the frame stays sharp and
                undistorted. Output is normalized to <b>H.264</b>, capped at{' '}
                <b>1080p HD</b> if the source is larger.
              </span>
            </div>
            <VideoUploader onSelect={handleSelect} uploading={uploading} />
          </>
        )}

        {meta && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="badge badge-outline">{meta.width}×{meta.height}</div>
                  <div className="badge badge-outline">{meta.codec}</div>
                  <div className="badge badge-outline">{meta.duration?.toFixed(1)}s</div>
                </div>
                <RectangleEditor
                  videoUrl={meta.url}
                  naturalWidth={meta.width}
                  naturalHeight={meta.height}
                  duration={meta.duration}
                  rectangles={rectangles}
                  setRectangles={setRectangles}
                />
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-base">
                  Regions
                  {rectangles.length > 0 && (
                    <span className="badge badge-primary">{rectangles.length}</span>
                  )}
                </h3>

                <RectangleList rectangles={rectangles} setRectangles={setRectangles} duration={meta.duration} />

                <div className="divider my-2" />

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text">Removal mode</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="blur">Blur — safe for any background</option>
                    <option value="cover">Cover — stretch edges (best for solid backgrounds)</option>
                    <option value="delogo">Delogo — interpolate (static backgrounds)</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary w-full mt-4"
                  disabled={rectangles.length === 0 || processing}
                  onClick={handleProcess}
                >
                  {processing && <span className="loading loading-spinner loading-sm" />}
                  {processing
                    ? 'Processing…'
                    : `Remove text (${rectangles.length} region${rectangles.length !== 1 ? 's' : ''})`}
                </button>
                <p className="text-xs text-base-content/50 mt-2">
                  Output: H.264, {meta.width > 1920 || meta.height > 1080 ? 'downscaled to' : 'kept at'} HD or below.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error shadow-lg">
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-success">✓</span> Done
                <div className="badge badge-outline">{result.codec}</div>
                <div className="badge badge-outline">{result.width}×{result.height}</div>
              </h3>
              <video src={`${result.url}?v=${Date.now()}`} controls className="rounded-lg w-full max-h-[520px]" />
              <div className="card-actions justify-end mt-2">
                <a href={`/api/download/${result.filename}`} className="btn btn-success btn-sm">
                  Download video
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}