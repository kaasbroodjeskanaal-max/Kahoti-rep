import React, { useMemo } from "react";

interface Snowflake {
  id: number;
  left: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  opacity: number;
  char: string;
  swayDuration: number;
}

const SNOW_CHARS = ["❄", "❅", "❆", "•", "✦"];

export default function SnowEffect({ count = 30 }: { count?: number }) {
  const flakes: Snowflake[] = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.floor(Math.random() * 14) + 10,
      duration: Math.random() * 7 + 6, // 6 to 13s
      delay: -(Math.random() * 10), // start at random progress
      opacity: Math.random() * 0.6 + 0.25,
      char: SNOW_CHARS[Math.floor(Math.random() * SNOW_CHARS.length)],
      swayDuration: Math.random() * 3 + 2,
    }));
  }, [count]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-20px) rotate(0deg);
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
          }
        }
        @keyframes snowSway {
          0%, 100% {
            margin-left: 0px;
          }
          50% {
            margin-left: 18px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .snowflake-particle {
            animation: none !important;
            opacity: 0.15 !important;
          }
        }
      `}</style>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="snowflake-particle absolute text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          style={{
            left: `${f.left}%`,
            top: "-25px",
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            animation: `snowfall ${f.duration}s linear infinite, snowSway ${f.swayDuration}s ease-in-out infinite`,
            animationDelay: `${f.delay}s, ${f.delay * 0.5}s`,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}
