import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `btn btn-ghost btn-xs sm:btn-sm ${
      isActive ? 'text-primary' : 'text-base-content/60'
    }`;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-primary/5 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm sm:text-base font-bold text-base-300 shadow-lg">
              V
            </div>

            <span className="font-display text-base sm:text-xl font-bold tracking-tight">
              Vanish<span className="text-primary">.</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>

            <NavLink to="/studio" className={linkClass}>
              Studio
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Prevent fixed navbar from covering page content */}
      <div className="h-16 sm:h-20" />
    </>
  );
}
