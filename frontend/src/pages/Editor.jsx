import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import VideoUploader from '../components/VideoUploader.jsx';
import RectangleEditor from '../components/RectangleEditor.jsx';
import RectangleList from '../components/RectangleList.jsx';
import { uploadVideo, processVideo } from '../api.js';
import { RotateCcw, Pencil, Play, CircleCheckBig } from 'lucide-react';

export default function Editor() {
  const [meta, setMeta] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [mode, setMode] = useState('blur');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const heartbeatRef = useRef(null);
  const heroRef = useRef(null);
  const workspaceRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    document.title = 'Studio — Vanish';
  }, []);

  // ── Session heartbeat and cleanup ─────────────────────────────
  useEffect(() => {
    if (!meta?.filename) return;
    const filename = meta.filename;
    heartbeatRef.current = setInterval(() => {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
    }, 15000);
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

  // ── Entrance animations ──────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!meta && heroRef.current) {
        gsap.fromTo(
          heroRef.current.children,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.1 }
        );
      }
      if (meta && workspaceRef.current) {
        gsap.fromTo(
          workspaceRef.current.children,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: 'power3.out' }
        );
      }
    });
    return () => ctx.revert();
  }, [meta]);

  useEffect(() => {
    if (result && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { y: 18, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [result]);

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
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        angle: r.angle || 0,
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8">
      {!meta && (
        <div ref={heroRef} className="max-w-2xl mx-auto text-center space-y-5 sm:space-y-6 py-4 sm:py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/35 text-[11px] sm:text-xs text-white/70">Frame-accurate removal
          </div>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Erase text & logos
            <br className="hidden sm:block" /> without touching the rest.
          </h1>
          <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto px-2">
            Draw a box, pick a range, and only that region gets reconstructed — the rest of the
            frame stays sharp. Output in H.264, capped at 1080p.
          </p>
          <VideoUploader onSelect={handleSelect} uploading={uploading} />
        </div>
      )}

      {meta && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg sm:text-xl font-semibold">Studio</h2>
            <button className="btn btn-xs sm:btn-sm btn-ghost gap-1.5" onClick={reset}>
              <span className="text-xs"><RotateCcw className="w-4 h-4" /></span> Start over
            </button>
          </div>

          <div ref={workspaceRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-base-100/60 backdrop-blur-sm shadow-2xl shadow-black/20 p-3 sm:p-5">
              <p className="text-sm text-base-content/70 mb-3">Uploaded video information</p>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="badge badge-sm border-white/10 bg-white/5 text-base-content/70">
                  {meta.width} x {meta.height}
                </span>
                <span className="badge badge-sm border-white/10 bg-white/5 text-base-content/70">{meta.codec}</span>
                <span className="badge badge-sm border-white/10 bg-white/5 text-base-content/70">
                  {meta.duration?.toFixed(1)}s
                </span>
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

            <div className="rounded-2xl border border-white/5 bg-base-100/60 backdrop-blur-sm shadow-2xl shadow-black/20 p-4 sm:p-5 flex flex-col">
              <h3 className="font-display text-sm font-semibold flex items-center gap-2 mb-3">
                Regions
                {rectangles.length > 0 && <span className="badge badge-primary badge-sm">{rectangles.length}</span>}
              </h3>
              <RectangleList rectangles={rectangles} setRectangles={setRectangles} duration={meta.duration} />
              <div className="border-t border-white/5 my-4" />
              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-xs text-base-content/50 mb-1">Removal mode</span>
                </label>
                <select
                  className="select select-sm bg-base-200 border-white/10"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="blur">Blur — frosted blurry background</option>
                  <option value="delogo">Delogo — smudged blurry background</option>
                </select>
              </div>
              <button
                className="btn w-full mt-4 border-none bg-gradient-to-r from-primary to-accent font-extrabold text-black/70 hover:brightness-110 transition-all disabled:opacity-40 disabled:from-base-200 disabled:to-base-200"
                disabled={rectangles.length === 0 || processing}
                onClick={handleProcess}
              >
                {processing && <span className="loading loading-spinner loading-sm" />}
                {processing ? 'Processing…' : `Remove text (${rectangles.length})`}
              </button>
              <p className="text-[11px] text-base-content/40 mt-2 text-center">
                Output H.264 · {meta.width > 1920 || meta.height > 1080 ? 'downscaled to HD' : 'kept at source res'}
              </p>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="alert bg-error/10 border border-error/30 text-red-700 text-sm rounded-xl ">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div
          ref={resultRef}
          className="rounded-2xl border border-white/5 bg-base-100/60 backdrop-blur-sm shadow-2xl shadow-black/20 p-4 sm:p-5"
        >
          <h3 className="font-display text-sm font-semibold flex flex-wrap items-center gap-2 mb-4">
            <span className="text-accent">
              <CircleCheckBig className="w-5 h-5" />
            </span>

            <span>Done</span>

            <p className="w-full font-thin text-sm text-base-content/60 mb-3">
              Edited video information
            </p>

            <span className="badge badge-sm border-white/10 bg-white/5 text-base-content/70">
              {result.codec}
            </span>

            <span className="badge badge-sm border-white/10 bg-white/5 text-base-content/70">
              {result.width} x {result.height}
            </span>
          </h3>

          <video src={`${result.url}?v=${Date.now()}`} controls className="rounded-xl w-full max-h-[520px] bg-black mt-1" />
          <div className="flex justify-end mt-4">
            <a
              href={`/api/download/${result.filename}`}
              className="btn btn-sm border-none bg-gradient-to-r from-primary to-accent font-extrabold text-black/70 hover:scale-105 transition-all"
            >
              Download video
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
