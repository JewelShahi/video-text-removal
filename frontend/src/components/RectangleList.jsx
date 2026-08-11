import React from 'react';

const COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];

export default function RectangleList({ rectangles, setRectangles, duration }) {
  const updateRect = (id, patch) => {
    setRectangles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // keep start <= end
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
      <div className="text-sm text-base-content/50 italic py-6 text-center">
        No regions yet — draw one on the video preview.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rectangles.map((r, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <div key={r.id} className="rounded-lg bg-base-200 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="badge badge-lg text-black font-semibold border-none"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              <div className="text-sm flex-1">
                <div className="font-medium">
                  {Math.round(r.w)}×{Math.round(r.h)} px
                </div>
                <div className="text-xs text-base-content/50">
                  at ({Math.round(r.x)}, {Math.round(r.y)})
                </div>
              </div>
              <button
                className="btn btn-ghost btn-xs btn-circle text-error"
                onClick={() => removeRect(r.id)}
                title="Remove region"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="input input-bordered input-xs flex items-center gap-1 flex-1">
                <span className="text-xs opacity-60 shrink-0">Start</span>
                <input
                  type="number"
                  min="0"
                  max={duration || undefined}
                  step="0.1"
                  value={r.start}
                  onChange={(e) => updateRect(r.id, { start: parseFloat(e.target.value) || 0 })}
                  className="w-full"
                />
                <span className="text-xs opacity-40">s</span>
              </label>
              <label className="input input-bordered input-xs flex items-center gap-1 flex-1">
                <span className="text-xs opacity-60 shrink-0">End</span>
                <input
                  type="number"
                  min="0"
                  max={duration || undefined}
                  step="0.1"
                  value={r.end}
                  onChange={(e) => updateRect(r.id, { end: parseFloat(e.target.value) || 0 })}
                  className="w-full"
                />
                <span className="text-xs opacity-40">s</span>
              </label>
            </div>
            <button
              className="btn btn-ghost btn-xs self-start"
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
