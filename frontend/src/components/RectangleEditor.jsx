import React, { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];

export default function RectangleEditor({
  videoUrl,
  naturalWidth,
  naturalHeight,
  duration,
  rectangles,
  setRectangles,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const updateSize = useCallback(() => {
    if (videoRef.current) {
      setDisplaySize({
        w: videoRef.current.clientWidth,
        h: videoRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateSize]);

  const scaleX = naturalWidth ? displaySize.w / naturalWidth : 1;
  const scaleY = naturalHeight ? displaySize.h / naturalHeight : 1;

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    const pos = getPos(e);
    setDrawing({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    setDrawing((d) => ({ ...d, curX: pos.x, curY: pos.y }));
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    const x1 = Math.min(drawing.startX, drawing.curX);
    const y1 = Math.min(drawing.startY, drawing.curY);
    const w = Math.abs(drawing.curX - drawing.startX);
    const h = Math.abs(drawing.curY - drawing.startY);
    setDrawing(null);
    if (w < 5 || h < 5) return;

    const natRect = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: x1 / scaleX,
      y: y1 / scaleY,
      w: w / scaleX,
      h: h / scaleY,
      start: 0,
      end: duration || 0,
    };
    setRectangles((prev) => [...prev, natRect]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '12px sans-serif';

    rectangles.forEach((r, i) => {
      const color = COLORS[i % COLORS.length];
      const x = r.x * scaleX;
      const y = r.y * scaleY;
      const w = r.w * scaleX;
      const h = r.h * scaleY;
      ctx.fillStyle = `${color}26`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 16, 20, 16);
      ctx.fillStyle = '#0b0e14';
      ctx.fillText(String(i + 1), x + 6, y - 4);
    });

    if (drawing) {
      const x = Math.min(drawing.startX, drawing.curX);
      const y = Math.min(drawing.startY, drawing.curY);
      const w = Math.abs(drawing.curX - drawing.startX);
      const h = Math.abs(drawing.curY - drawing.startY);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [rectangles, drawing, scaleX, scaleY, displaySize]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-base-content/60">
          Click and drag on the video to mark each text/logo area.
        </p>
        {rectangles.length > 0 && (
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => setRectangles([])}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="relative inline-block max-w-full rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          onLoadedMetadata={updateSize}
          className="block max-w-full"
        />
        <canvas
          ref={canvasRef}
          width={displaySize.w}
          height={displaySize.h}
          className="absolute top-0 left-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => drawing && setDrawing(null)}
        />
      </div>
    </div>
  );
}
