import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export const scrollParentVertically = (element: HTMLElement | null, amount: number) => {
  if (!element) return;
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY || style.overflow;
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
      parent.scrollBy({ top: amount, behavior: 'smooth' });
      return;
    }
    parent = parent.parentElement;
  }
  window.scrollBy({ top: amount, behavior: 'smooth' });
};

export const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
  const container = e.currentTarget;
  const tagName = (e.target as HTMLElement).tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') {
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    container.scrollBy({ left: -300, behavior: 'smooth' });
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    container.scrollBy({ left: 300, behavior: 'smooth' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    scrollParentVertically(container, -250);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    scrollParentVertically(container, 250);
  }
};

// CardPop Component: Provides the premium micro-pop animation
interface CardPopProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  ariaLabel?: string;
}

export const CardPop: React.FC<CardPopProps> = ({ 
  children, 
  onClick, 
  className = '',
  ariaLabel
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      onClick={onClick}
      className={`relative cursor-pointer select-none shrink-0 rounded-2xl ${className}`}
      whileHover={shouldReduceMotion ? { opacity: 0.95 } : {
        scale: 1.03,
        y: -2,
        zIndex: 50,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      }}
      whileTap={{
        scale: 1,
        y: 0,
      }}
      transition={{
        type: 'tween',
        duration: 0.15,
        ease: [0.22, 1, 0.36, 1]
      }}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e as any);
        }
      }}
    >
      {children}
    </motion.div>
  );
};

interface HorizontalRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  seeAllHref?: string;
  onSeeAllClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const HorizontalRow: React.FC<HorizontalRowProps> = ({
  title,
  subtitle,
  icon,
  seeAllHref,
  onSeeAllClick,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Drag-to-scroll state
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const checkScrollLimits = () => {
    const el = containerRef.current;
    if (!el) return;
    
    // Left limit
    setShowLeftArrow(el.scrollLeft > 5);
    
    // Right limit
    const maxScroll = el.scrollWidth - el.clientWidth;
    setShowRightArrow(el.scrollLeft < maxScroll - 5);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScrollLimits();
    el.addEventListener('scroll', checkScrollLimits);
    window.addEventListener('resize', checkScrollLimits);

    return () => {
      el.removeEventListener('scroll', checkScrollLimits);
      window.removeEventListener('resize', checkScrollLimits);
    };
  }, [children]);

  const scrollByAmount = (amount: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Keyboard navigation when mouse hovers over the row (Requirement: PC Version Horizontal Scroll support)
  useEffect(() => {
    if (!isHovered) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement).tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByAmount(-400);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByAmount(400);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollParentVertically(containerRef.current, -250);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollParentVertically(containerRef.current, 250);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isHovered]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    setIsDown(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!isDown || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5; // walk multiplier
    el.scrollLeft = scrollLeftState - walk;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tagName = (e.target as HTMLElement).tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByAmount(-400);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByAmount(400);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollParentVertically(containerRef.current, -250);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollParentVertically(containerRef.current, 250);
    }
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full relative pt-4 pb-2 select-none border-t border-zinc-900/40 max-w-7xl mx-auto ${className}`}
    >
      {/* Row Header */}
      <div className="flex justify-between items-end mb-3.5 px-4 sm:px-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {icon && <div className="shrink-0 opacity-80">{icon}</div>}
            <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-white uppercase font-sans">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-zinc-500 font-medium font-sans">
              {subtitle}
            </p>
          )}
        </div>
        {(seeAllHref || onSeeAllClick) && (
          <button
            onClick={() => onSeeAllClick?.()}
            className="text-[10px] sm:text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 uppercase tracking-widest cursor-pointer transition-colors"
          >
            <span>VIEW ALL</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Row Body / Scroller Wrapper */}
      <div className="group/row relative w-full overflow-visible">
        {/* Left Scroll Button (Requirement: z-index increased to z-[60] to prevent disappearing on card hover) */}
        {showLeftArrow && (
          <button
            onClick={() => scrollByAmount(-400)}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[60] hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-black/80 hover:bg-black border border-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Scroll Button (Requirement: z-index increased to z-[60] to prevent disappearing on card hover) */}
        {showRightArrow && (
          <button
            onClick={() => scrollByAmount(400)}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[60] hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-black/80 hover:bg-black border border-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scroll Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="w-full flex gap-4 sm:gap-6 overflow-x-auto overflow-y-visible px-4 sm:px-8 py-4 scrollbar-none no-scrollbar snap-x scroll-smooth outline-none cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {React.Children.map(children, (child) => {
            if (!child) return null;
            return (
              <div 
                className="shrink-0 snap-start select-none relative overflow-visible"
                style={{ scrollSnapAlign: 'start' }}
              >
                {child}
              </div>
            );
          })}
          {/* Peek spacer at the right edge to support peeking of the next card */}
          <div className="w-12 sm:w-20 shrink-0 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default HorizontalRow;
