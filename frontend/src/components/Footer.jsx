import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-base-300">
              V
            </div>
            <span className="font-display text-sm font-semibold">
              Vanish<span className="text-primary">.</span>
            </span>
          </div>
          <p className="text-xs text-base-content/40 max-w-xs">
            Frame-accurate text & logo removal for video. Only the regions you mark are touched.
          </p>
        </div>

        <div className="text-xs space-y-2">
          <div className="text-base-content/70 font-medium mb-1">Product</div>
          <NavLink to="/" end className="block text-base-content/40 hover:text-base-content/70 transition-colors">
            Home
          </NavLink>
          <NavLink to="/studio" className="block text-base-content/40 hover:text-base-content/70 transition-colors">
            Studio
          </NavLink>
        </div>

        <div className="text-xs space-y-2">
          <div className="text-base-content/70 font-medium mb-1">Session</div>
          <p className="text-base-content/40">Videos auto-expire when your session ends.</p>
          <p className="text-base-content/40">Output: H.264, capped at 1080p.</p>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-[11px] text-base-content/30 text-center">
          © {new Date().getFullYear()} Vanish. All processing happens on your session only.
        </div>
      </div>
    </footer>
  );
}