import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/5 bg-base-300/30 backdrop-blur-xl">
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main footer */}
        <div className="py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <NavLink to="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-base-300 shadow-lg shadow-primary/10">
                V
              </div>

              <span className="font-display text-lg font-bold tracking-tight">
                Vanish<span className="text-primary">.</span>
              </span>
            </NavLink>

            <p className="mt-4 text-sm leading-6 text-base-content/45 max-w-sm">
              Remove unwanted text, logos, and objects from your videos.
              Frame-accurate editing without complicated software.
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs text-base-content/35">
              <ShieldCheck className="w-4 h-4 text-primary/70" />
              <span>Your videos stay within your session.</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
              Product
            </h3>

            <div className="mt-4 flex flex-col gap-3">
              <NavLink
                to="/"
                end
                className="text-sm text-base-content/45 hover:text-primary transition-colors"
              >
                Home
              </NavLink>

              <NavLink
                to="/studio"
                className="text-sm text-base-content/45 hover:text-primary transition-colors"
              >
                Studio
              </NavLink>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
              Privacy
            </h3>

            <div className="mt-4 space-y-3 text-sm text-base-content/45 leading-5">
              <p>
                Videos automatically expire when your session ends.
              </p>

              <p>
                Processing is limited to the regions you select.
              </p>

              <p>
                Output is encoded as H.264 up to 1080p.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-base-content/30">
            © {new Date().getFullYear()} Vanish. All rights reserved.
          </p>

          <div className="flex items-center gap-5 text-[11px] text-base-content/30">
            <span>Private by design</span>

            <span className="w-1 h-1 rounded-full bg-base-content/20" />

            <span className="flex items-center gap-1.5">
              Built for precise editing
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
