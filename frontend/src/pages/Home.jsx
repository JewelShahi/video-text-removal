import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const mockRef = useRef(null);
  const stepsRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    document.title = 'Vanish — Erase text & logos from video';
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current.children,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.09, ease: 'power3.out', delay: 0.1 }
      );
      gsap.fromTo(
        mockRef.current,
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.35 }
      );

      gsap.to('.mock-box-1', { y: -6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to('.mock-box-2', { y: 6, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.3 });

      gsap.fromTo(
        stepsRef.current.children,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 85%' },
        }
      );
      gsap.fromTo(
        ctaRef.current,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 90%' },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  const steps = [
    {
      n: '01',
      title: 'Drop your video',
      body: 'MP4, MOV, or WebM — dragged in or picked from disk. Nothing is stored longer than your session.',
    },
    {
      n: '02',
      title: 'Draw over what to remove',
      body: 'Box any text, watermark, or logo. Resize, rotate, and set exactly when each region appears and disappears.',
    },
    {
      n: '03',
      title: 'Export, untouched elsewhere',
      body: 'Blur, cover, or delogo — only the marked pixels change. Download H.264, capped at 1080p.',
    },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div ref={heroRef} className="space-y-5 sm:space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/35 text-[11px] text-white/70 sm:text-xs"> Frame-accurate removal
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Erase text & logos.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Keep everything else.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto lg:mx-0">
            Draw a box, pick a time range, and only that region gets reconstructed — no re-encoding
            artifacts on the rest of the frame. Free, no watermark, runs in your browser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
            <button
              onClick={() => navigate('/studio')}
              className="btn border-none bg-gradient-to-r from-primary to-accent font-extrabold text-black/70 hover:brightness-110"
            >
              Start removing — it's free
            </button>
            <a href="#how" className="btn btn-ghost border font-extrabold border-white/10">
              See how it works
            </a>
          </div>
        </div>

        <div ref={mockRef} className="relative">
          <div className="rounded-2xl border border-white/10 bg-base-100/60 backdrop-blur-sm shadow-2xl shadow-black/30 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <span className="w-2.5 h-2.5 rounded-full bg-error/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
            </div>
            <div className="relative aspect-video rounded-xl bg-gradient-to-br from-neutral to-black overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(45deg,transparent_49%,rgba(255,255,255,0.06)_50%,transparent_51%)] bg-[length:16px_16px]" />
              <div
                className="mock-box-1 absolute top-[18%] left-[12%] w-[28%] h-[16%] rounded-md border-2"
                style={{ borderColor: '#7c5cff', background: '#7c5cff26' }}
              >
                <span
                  className="absolute -top-4 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded text-base-300"
                  style={{ background: '#7c5cff' }}
                >
                  1
                </span>
              </div>
              <div
                className="mock-box-2 absolute bottom-[16%] right-[15%] w-[22%] h-[12%] rounded-md border-2"
                style={{ borderColor: '#22d3ee', background: '#22d3ee26' }}
              >
                <span
                  className="absolute -top-4 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded text-base-300"
                  style={{ background: '#22d3ee' }}
                >
                  2
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-10 bg-black/50 backdrop-blur-sm flex items-center px-3 gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                  <Play className="text-primary" fill="currentColor" />
                </div>
                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/5 bg-gradient-to-r from-primary to-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-10 sm:mb-14 space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Three steps, no re-render of the whole frame
          </h2>
          <p className="text-sm sm:text-base text-base-content/50 max-w-lg mx-auto">
            Because only the boxed pixels are touched, the rest of your footage stays exactly as it was shot.
          </p>
        </div>
        <div ref={stepsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/5 bg-base-100/50 backdrop-blur-sm p-5 sm:p-6 space-y-3"
            >
              <span className="font-display text-xs text-primary/70 tracking-widest">{s.n}</span>
              <h3 className="font-display font-semibold text-base sm:text-lg">{s.title}</h3>
              <p className="text-xs sm:text-sm text-base-content/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────── */}
      <section ref={ctaRef} className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/15 via-base-100/60 to-accent/15 backdrop-blur-sm p-8 sm:p-12 text-center space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Ready to clean up a clip?</h2>
          <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto">
            No account, no upload limits you'll hit today. Drop a video and start drawing.
          </p>
          <button
            onClick={() => navigate('/studio')}
            className="btn border-none bg-gradient-to-r from-primary to-accent font-extrabold text-black/70 hover:brightness-110"
          >
            Open the editor
          </button>
        </div>
      </section>
    </>
  );
}