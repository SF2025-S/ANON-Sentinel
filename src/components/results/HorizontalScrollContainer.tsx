"use client"

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScrollContainer({ children, className = '' }: HorizontalScrollContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && !isScrolling) {
      setIsScrolling(true);
      const scrollAmount = 336; // 320px (largura do card) + 16px (gap)
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });

      // Reset isScrolling após a animação
      setTimeout(() => {
        setIsScrolling(false);
        checkScrollability();
      }, 350);
    }
  };

  const handleScroll = () => {
    if (!isScrolling) {
      checkScrollability();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Container de scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {children}
      </div>

      {/* Gradiente de fade esquerdo */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
      )}

      {/* Gradiente de fade direito */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
      )}

      {/* Botão de scroll esquerdo */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          disabled={isScrolling}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-white shadow-lg rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Rolar para a esquerda"
          type="button"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
      )}

      {/* Botão de scroll direito */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          disabled={isScrolling}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-white shadow-lg rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Rolar para a direita"
          type="button"
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
        </button>
      )}
    </div>
  );
} 