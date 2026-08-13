import React, { useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import gsap from 'gsap';

export default function ScrollToTop() {
  const buttonRef = useRef(null);
  const isVisible = useRef(false);
  const isScrollingToTop = useRef(false);

  useEffect(() => {
    const button = buttonRef.current;

    gsap.set(button, {
      opacity: 0,
      scale: 0.5,
      y: 30,
      pointerEvents: 'none',
    });

    const showButton = () => {
      if (isVisible.current) return;

      isVisible.current = true;
      gsap.killTweensOf(button);

      gsap.to(button, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.45,
        ease: 'back.out(1.7)',
        pointerEvents: 'auto',
      });
    };

    const hideButton = () => {
      if (!isVisible.current) return;

      isVisible.current = false;
      gsap.killTweensOf(button);

      gsap.to(button, {
        opacity: 0,
        scale: 0.5,
        y: 30,
        duration: 0.3,
        ease: 'power2.in',
        pointerEvents: 'none',
      });
    };

    const handleScroll = () => {
      if (isScrollingToTop.current) return;

      if (window.scrollY >= 500) {
        showButton();
      } else {
        hideButton();
      }
    };

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      gsap.killTweensOf(button);
    };
  }, []);

  const scrollToTop = () => {
    const button = buttonRef.current;

    if (!button || isScrollingToTop.current) return;

    isScrollingToTop.current = true;

    gsap.killTweensOf(button);

    // Fast click animation
    const timeline = gsap.timeline();

    timeline
      .to(button, {
        scale: 1.12,
        duration: 0.07,
        ease: 'power2.out',
      })
      .to(button, {
        scale: 0.92,
        duration: 0.07,
        ease: 'power2.in',
      })
      .to(button, {
        scale: 1,
        duration: 0.12,
        ease: 'back.out(2)',
      });

    // Start scrolling after just 140ms
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      const unlock = () => {
        if (window.scrollY <= 5) {
          isScrollingToTop.current = false;
          isVisible.current = false;

          gsap.set(button, {
            opacity: 0,
            scale: 0.5,
            y: 30,
            pointerEvents: 'none',
          });

          window.removeEventListener('scroll', unlock);
        }
      };

      window.addEventListener('scroll', unlock, {
        passive: true,
      });

      // Fallback
      setTimeout(() => {
        isScrollingToTop.current = false;
        isVisible.current = false;
        window.removeEventListener('scroll', unlock);
      }, 1200);
    }, 140);
  };

  const handleMouseEnter = () => {
    if (isScrollingToTop.current) return;

    gsap.to(buttonRef.current, {
      y: -4,
      scale: 1.08,
      duration: 0.25,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    if (isScrollingToTop.current) return;

    gsap.to(buttonRef.current, {
      y: 0,
      scale: 1,
      duration: 0.25,
      ease: 'power2.out',
    });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={scrollToTop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Back to top"
      className="
        fixed
        bottom-6 right-6
        sm:bottom-8 sm:right-8
        z-50

        btn btn-circle
        w-12 h-12
        sm:w-14 sm:h-14
        min-h-0

        bg-secondary/20
        hover:bg-secondary/30

        border-2
        border-secondary/70
        hover:border-secondary

        backdrop-blur-xl

        text-white

        shadow-[0_0_20px_rgba(0,0,0,0.35),0_0_25px_rgba(255,255,255,0.08)]
        hover:shadow-[0_0_25px_rgba(0,0,0,0.4),0_0_35px_rgba(255,255,255,0.15)]

        transition-colors
      "
    >
      <ArrowUp
        className="w-5 h-5 sm:w-6 sm:h-6"
        strokeWidth={3}
      />
    </button>
  );
}
