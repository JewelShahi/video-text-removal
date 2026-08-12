import React, { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];
const HANDLE_SIZE = 8; 
const ROTATE_HANDLE_DIST = 25; // Distance of the rotation handle from the top edge

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
  const [interaction, setInteraction] = useState(null);
  const [hoveredId, setHoveredId] = useState(null); // Tracks which rect is hovered to show rotate handle
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  // When false, the canvas stops intercepting mouse events (pointer-events: none)
  // so clicks pass through to the video's native controls — lets the user scrub
  // / play the video to find where to draw instead of always drawing on click.
  const [drawMode, setDrawMode] = useState(true);

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

  useEffect(() => {
    if (!drawMode) {
      setInteraction(null);
      setHoveredId(null);
    }
  }, [drawMode]);

  const scaleX = naturalWidth ? displaySize.w / naturalWidth : 1;
  const scaleY = naturalHeight ? displaySize.h / naturalHeight : 1;

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // --- ROTATION MATH HELPERS ---
  // Get center of rectangle from top-left x,y
  const getCenter = (r) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 });

  // Transform global mouse coordinates into the rectangle's local unrotated space
  const getLocalPos = (natPos, r) => {
    const { cx, cy } = getCenter(r);
    const dx = natPos.x - cx;
    const dy = natPos.y - cy;
    const rad = -r.angle * (Math.PI / 180);
    return {
      x: dx * Math.cos(rad) - dy * Math.sin(rad),
      y: dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  };

  // Rotate a local-space vector (dx, dy) into world-space, given angle in degrees.
  // This is the inverse of getLocalPos's rotation step.
  const localVecToWorld = (dx, dy, angleDeg) => {
    const rad = angleDeg * (Math.PI / 180);
    return {
      x: dx * Math.cos(rad) - dy * Math.sin(rad),
      y: dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  };

  // Local coordinates for the 8 resize handles (relative to center)
  const getHandlesLocal = (r) => [
    { id: 'tl', x: -r.w / 2, y: -r.h / 2 },
    { id: 'tr', x: r.w / 2, y: -r.h / 2 },
    { id: 'bl', x: -r.w / 2, y: r.h / 2 },
    { id: 'br', x: r.w / 2, y: r.h / 2 },
    { id: 't',  x: 0, y: -r.h / 2 },
    { id: 'b',  x: 0, y: r.h / 2 },
    { id: 'l',  x: -r.w / 2, y: 0 },
    { id: 'r',  x: r.w / 2, y: 0 },
  ];

  const handleMouseDown = (e) => {
    if (!drawMode) return;
    const pos = getPos(e);
    const natPos = { x: pos.x / scaleX, y: pos.y / scaleY };
    const hitRadius = 12 / scaleX; // Forgiving click area

    for (let i = rectangles.length - 1; i >= 0; i--) {
      const r = rectangles[i];
      const localPos = getLocalPos(natPos, r);
      const handles = getHandlesLocal(r);

      // 1. Check Rotation Handle (only if it was visible, i.e., hoveredId matches)
      if (hoveredId === r.id) {
        const rotHandleLocalY = -r.h / 2 - ROTATE_HANDLE_DIST / scaleX;
        if (Math.abs(localPos.x) < hitRadius && Math.abs(localPos.y - rotHandleLocalY) < hitRadius) {
          const { cx, cy } = getCenter(r);
          setInteraction({ type: 'rotate', id: r.id, cx, cy });
          return;
        }
      }

      // 2. Check Resize Handles
      for (const h of handles) {
        if (Math.abs(localPos.x - h.x) < hitRadius && Math.abs(localPos.y - h.y) < hitRadius) {
          setInteraction({ type: 'resize', id: r.id, handle: h.id, startNat: natPos, origRect: { ...r } });
          return;
        }
      }

      // 3. Check Move (inside body bounds)
      if (Math.abs(localPos.x) <= r.w / 2 && Math.abs(localPos.y) <= r.h / 2) {
        setInteraction({ type: 'move', id: r.id, startNat: natPos, origRect: { ...r } });
        return;
      }
    }

    // 4. Draw new
    setInteraction({ type: 'draw', startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
  };

  const handleMouseMove = (e) => {
    if (!drawMode) return;
    const pos = getPos(e);

    // --- HOVER & CURSOR LOGIC ---
    if (!interaction) {
      let cursor = 'crosshair';
      let newHoveredId = null;
      const natPos = { x: pos.x / scaleX, y: pos.y / scaleY };
      const hitRadius = 12 / scaleX;

      for (let i = rectangles.length - 1; i >= 0; i--) {
        const r = rectangles[i];
        const localPos = getLocalPos(natPos, r);
        
        // Check rotation handle
        const rotHandleLocalY = -r.h / 2 - ROTATE_HANDLE_DIST / scaleX;
        if (Math.abs(localPos.x) < hitRadius && Math.abs(localPos.y - rotHandleLocalY) < hitRadius) {
          cursor = 'grab'; 
          newHoveredId = r.id;
          break;
        }

        // Check resize handles
        const handles = getHandlesLocal(r);
        for (const h of handles) {
          if (Math.abs(localPos.x - h.x) < hitRadius && Math.abs(localPos.y - h.y) < hitRadius) {
            if (h.id === 'tl' || h.id === 'br') cursor = 'nwse-resize';
            else if (h.id === 'tr' || h.id === 'bl') cursor = 'nesw-resize';
            else if (h.id === 't' || h.id === 'b') cursor = 'ns-resize';
            else cursor = 'ew-resize';
            newHoveredId = r.id;
            break;
          }
        }
        if (newHoveredId) break;

        // Check body
        if (Math.abs(localPos.x) <= r.w / 2 && Math.abs(localPos.y) <= r.h / 2) {
          cursor = 'move';
          newHoveredId = r.id;
          break;
        }
      }
      
      setHoveredId(newHoveredId);
      canvasRef.current.style.cursor = cursor;
      return;
    }

    // --- INTERACTION LOGIC ---
    const natPos = { x: pos.x / scaleX, y: pos.y / scaleY };

    if (interaction.type === 'draw') {
      setInteraction((d) => ({ ...d, curX: pos.x, curY: pos.y }));
      return;
    }

    if (interaction.type === 'move') {
      const dx = natPos.x - interaction.startNat.x;
      const dy = natPos.y - interaction.startNat.y;
      setRectangles((prev) =>
        prev.map((r) => {
          if (r.id !== interaction.id) return r;
          return {
            ...r,
            x: Math.max(0, interaction.origRect.x + dx),
            y: Math.max(0, interaction.origRect.y + dy),
          };
        })
      );
      return;
    }

    if (interaction.type === 'rotate') {
      const dx = natPos.x - interaction.cx;
      const dy = natPos.y - interaction.cy;
      // Calculate angle, assuming 0 degrees is straight up (-Y axis)
      const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      setRectangles((prev) =>
        prev.map((r) => (r.id === interaction.id ? { ...r, angle } : r))
      );
      return;
    }

    if (interaction.type === 'resize') {
      const r = rectangles.find((rec) => rec.id === interaction.id);
      const angle = r ? r.angle : 0;

      // If rotated, anchor the OPPOSITE edge (in local space) and only move
      // the dragged edge — mirroring the non-rotated logic below, but done
      // in the rectangle's local (unrotated) coordinate frame since x/y/w/h
      // are stored unrotated.
      if (Math.abs(angle) > 0.5) {
        const { w: w0, h: h0 } = interaction.origRect;
        const { cx, cy } = getCenter(interaction.origRect);
        const localPos = getLocalPos(natPos, interaction.origRect);
        const MIN_SIZE = 20;

        const hasLeft = interaction.handle.includes('l');
        const hasRight = interaction.handle.includes('r');
        const hasTop = interaction.handle.includes('t');
        const hasBottom = interaction.handle.includes('b');

        let newW = w0;
        let newH = h0;
        let offX = 0; // center shift in local space
        let offY = 0;

        if (hasLeft || hasRight) {
          // Opposite edge (in local space) stays fixed.
          const anchorX = hasLeft ? w0 / 2 : -w0 / 2;
          newW = Math.max(MIN_SIZE, Math.abs(anchorX - localPos.x));
          const newEdgeX = hasLeft ? anchorX - newW : anchorX + newW;
          offX = (anchorX + newEdgeX) / 2;
        }

        if (hasTop || hasBottom) {
          const anchorY = hasTop ? h0 / 2 : -h0 / 2;
          newH = Math.max(MIN_SIZE, Math.abs(anchorY - localPos.y));
          const newEdgeY = hasTop ? anchorY - newH : anchorY + newH;
          offY = (anchorY + newEdgeY) / 2;
        }

        // Rotate the local-space center offset back into world space.
        const worldOff = localVecToWorld(offX, offY, angle);
        const newCx = cx + worldOff.x;
        const newCy = cy + worldOff.y;

        setRectangles((prev) =>
          prev.map((rec) => {
            if (rec.id !== interaction.id) return rec;
            return { ...rec, w: newW, h: newH, x: newCx - newW / 2, y: newCy - newH / 2 };
          })
        );
      } else {
        // Original corner-anchored logic for non-rotated rectangles
        const dx = natPos.x - interaction.startNat.x;
        const dy = natPos.y - interaction.startNat.y;
        let { x, y, w, h } = interaction.origRect;
        const MIN_SIZE = 10;

        if (interaction.handle.includes('l')) { x += dx; w -= dx; }
        if (interaction.handle.includes('r')) { w += dx; }
        if (interaction.handle.includes('t')) { y += dy; h -= dy; }
        if (interaction.handle.includes('b')) { h += dy; }

        if (w < MIN_SIZE) {
          if (interaction.handle.includes('l')) x = interaction.origRect.x + interaction.origRect.w - MIN_SIZE;
          w = MIN_SIZE;
        }
        if (h < MIN_SIZE) {
          if (interaction.handle.includes('t')) y = interaction.origRect.y + interaction.origRect.h - MIN_SIZE;
          h = MIN_SIZE;
        }

        x = Math.max(0, x);
        y = Math.max(0, y);

        setRectangles((prev) =>
          prev.map((rec) => (rec.id === interaction.id ? { ...rec, x, y, w, h } : rec))
        );
      }
    }
  };

  const handleMouseUp = () => {
    if (!interaction) return;

    if (interaction.type === 'draw') {
      const x1 = Math.min(interaction.startX, interaction.curX);
      const y1 = Math.min(interaction.startY, interaction.curY);
      const w = Math.abs(interaction.curX - interaction.startX);
      const h = Math.abs(interaction.curY - interaction.startY);
      
      if (w < 5 || h < 5) {
        setInteraction(null);
        return;
      }

      const natRect = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        x: x1 / scaleX,
        y: y1 / scaleY,
        w: w / scaleX,
        h: h / scaleY,
        angle: 0, // Initialize angle to 0
        start: 0,
        end: duration || 0,
      };
      setRectangles((prev) => [...prev, natRect]);
    }

    setInteraction(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '12px sans-serif';

    rectangles.forEach((r, i) => {
      const color = COLORS[i % COLORS.length];
      const { cx, cy } = getCenter(r);
      const dCx = cx * scaleX;
      const dCy = cy * scaleY;
      const dW = r.w * scaleX;
      const dH = r.h * scaleY;
      const rad = r.angle * (Math.PI / 180);

      ctx.save();
      ctx.translate(dCx, dCy);
      ctx.rotate(rad);

      // Draw rectangle fill and border (centered at 0,0)
      ctx.fillStyle = `${color}26`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(-dW / 2, -dH / 2, dW, dH);
      ctx.strokeRect(-dW / 2, -dH / 2, dW, dH);

      // Draw 8 Resize Handles (centered logic)
      const handles = [
        [-dW/2, -dH/2], [dW/2, -dH/2], [-dW/2, dH/2], [dW/2, dH/2],
        [0, -dH/2], [0, dH/2], [-dW/2, 0], [dW/2, 0]
      ];
      handles.forEach(([hx, hy]) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - HANDLE_SIZE/2, hy - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx - HANDLE_SIZE/2, hy - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
      });

      // Draw ID Badge
      ctx.fillStyle = color;
      ctx.fillRect(-dW / 2, -dH / 2 - 16, 20, 16);
      ctx.fillStyle = '#0b0e14';
      ctx.fillText(String(i + 1), -dW / 2 + 6, -dH / 2 - 4);

      // --- ONLY DRAW ROTATE HANDLE IF HOVERED ---
      if (r.id === hoveredId) {
        ctx.beginPath();
        ctx.moveTo(0, -dH / 2);
        ctx.lineTo(0, -dH / 2 - ROTATE_HANDLE_DIST);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, -dH / 2 - ROTATE_HANDLE_DIST, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
      }

      ctx.restore();
    });

    // Draw the dashed preview box while drawing a NEW rectangle
    if (interaction?.type === 'draw') {
      const x = Math.min(interaction.startX, interaction.curX);
      const y = Math.min(interaction.startY, interaction.curY);
      const w = Math.abs(interaction.curX - interaction.startX);
      const h = Math.abs(interaction.curY - interaction.startY);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [rectangles, interaction, hoveredId, scaleX, scaleY, displaySize]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <p className="text-sm text-base-content/60">
          {drawMode
            ? 'Click and drag to draw. Pull white squares to resize. Hover a box to reveal the rotate handle.'
            : 'Play mode: use the video controls to scrub/play. Switch to Draw to edit regions.'}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <div className="join">
            <button
              type="button"
              className={`btn btn-xs join-item ${drawMode ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDrawMode(true)}
            >
              ✏️ Draw
            </button>
            <button
              type="button"
              className={`btn btn-xs join-item ${!drawMode ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDrawMode(false)}
            >
              ▶️ Play
            </button>
          </div>
          {rectangles.length > 0 && (
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={() => setRectangles([])}
            >
              Clear all
            </button>
          )}
        </div>
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
          className={`absolute top-0 left-0 ${drawMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (interaction?.type === 'draw') setInteraction(null);
            setHoveredId(null); // Hide rotate handle when mouse leaves canvas
            if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
          }}
        />
      </div>
    </div>
  );
}