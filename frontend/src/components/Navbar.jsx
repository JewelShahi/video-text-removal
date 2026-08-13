import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const onStudio = location.pathname === '/studio';

  const linkClass = ({ isActive }) =>
    `btn btn-ghost btn-xs sm:btn-sm ${isActive ? 'text-primary' : 'text-base-content/60'}`;

  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl bg-base-300/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs sm:text-sm font-bold text-base-300">
            V
          </div>
          <span className="font-display text-sm sm:text-lg font-semibold tracking-tight">
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
  );
}