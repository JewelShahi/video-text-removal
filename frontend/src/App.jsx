import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Editor from './pages/Editor.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div data-theme="cinema" className="min-h-screen bg-base-300 relative overflow-x-hidden flex flex-col">
        {/* ambient glow — shared across every page */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-40 -left-40 w-[26rem] h-[26rem] sm:w-[32rem] sm:h-[32rem] rounded-full bg-primary/20 blur-[100px] sm:blur-[120px]" />
          <div className="absolute top-1/3 -right-40 w-[22rem] h-[22rem] sm:w-[28rem] sm:h-[28rem] rounded-full bg-accent/20 blur-[100px] sm:blur-[120px]" />
        </div>

        <Navbar />

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Editor />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}