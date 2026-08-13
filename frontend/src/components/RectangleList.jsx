import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';

const COLORS = ['#7c5cff', '#22d3ee', '#f472b6', '#4ade80', '#facc15', '#fb923c', '#a78bfa', '#f87171'];

export default function RectangleList({ rectangles, setRectangles, duration }) {
  const listRef = useRef(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (!listRef.current) return;
    const cards = listRef.current.children;
    if (rectangles.length > prevCount.current && cards.length) {
      gsap.fromTo(
        cards[cards.length - 1],
        { opacity: 0, y: 10, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
    prevCount.current = rectangles.length;
  }, [rectangles.length]);

  const updateRect = (id, patch) => {
    setRectangles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (next.start > next.end) {
          if ('start' in patch) next.end = next.start;
          else next.start = next.end;
        }
        return next;
      })
    );
  };

  const setFullDuration = (id) => updateRect(id, { start: 0, end: duration || 0 });
  const removeRect = (id) => setRectangles((prev) => prev.filter((r) => r.id !== id));

  if (rectangles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-10 gap-2 text-base-content/40">
        <div className="w-10 h-10 rounded-lg border border-dashed border-white/15" />
        <p className="text-xs">No regions yet — draw one on the preview.</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex flex-col gap-2.5 max-h-[420px] lg:max-h-none overflow-y-auto pr-1">
      {rectangles.map((r, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <div
            key={r.id}
            className="rounded-xl bg-base-200/60 border border-white/5 p-3 flex flex-col gap-2.5"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-base-300 shrink-0"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              <div className="text-xs flex-1 min-w-0">
                <div className="font-medium truncate">
                  {Math.round(r.w)}×{Math.round(r.h)} px
                </div>
                <div className="text-base-content/40">
                  at ({Math.round(r.x)}, {Math.round(r.y)})
                </div>
              </div>
              <button
                className="btn btn-ghost btn-xs btn-circle text-error/70 hover:text-error hover:bg-error/10"
                onClick={() => removeRect(r.id)}
                title="Remove region"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="input input-bordered input-xs flex items-center gap-1 flex-1 bg-base-300/60 border-white/10">
                <span className="text-[10px] opacity-50 shrink-0">Start</span>
                <input
                  type="number"
                  min="0"
                  max={duration || undefined}
                  step="0.1"
                  value={r.start}
                  onChange={(e) => updateRect(r.id, { start: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent"
                />
                <span className="text-[10px] opacity-30">s</span>
              </label>
              <label className="input input-bordered input-xs flex items-center gap-1 flex-1 bg-base-300/60 border-white/10">
                <span className="text-[10px] opacity-50 shrink-0">End</span>
                <input
                  type="number"
                  min="0"
                  max={duration || undefined}
                  step="0.1"
                  value={r.end}
                  onChange={(e) => updateRect(r.id, { end: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent"
                />
                <span className="text-[10px] opacity-30">s</span>
              </label>
            </div>
            <button
              className="btn btn-ghost btn-xs self-start text-primary/80 hover:text-primary"
              onClick={() => setFullDuration(r.id)}
            >
              Apply to full video
            </button>
          </div>
        );
      })}
    </div>
  );
}