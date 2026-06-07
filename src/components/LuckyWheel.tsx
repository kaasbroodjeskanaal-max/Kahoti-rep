import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Star, Sparkles, AlertCircle } from "lucide-react";

interface LuckyWheelProps {
  options: string[];
  onSpinComplete: (selectedIndex: number, optionText: string) => void;
  disabled?: boolean;
}

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  options,
  onSpinComplete,
  disabled = false,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [bulbToggle, setBulbToggle] = useState(false);
  const isSpunRef = useRef(false);

  // Constants for drawing the wheel
  const numSectors = options.length;
  const sectorAngle = 360 / numSectors;
  const colors = [
    "#EF4444", // Red
    "#3B82F6", // Blue
    "#F59E0B", // Amber
    "#10B981", // Green
    "#8B5CF6", // Purple
    "#EC4899", // Pink
  ];

  // Blink bulbs when spinning
  useEffect(() => {
    let intervalId: any;
    if (spinning) {
      intervalId = setInterval(() => {
        setBulbToggle((prev) => !prev);
      }, 150);
    } else {
      setBulbToggle(false);
    }
    return () => clearInterval(intervalId);
  }, [spinning]);

  // Polar to Cartesian conversion helper to draw SVG arcs
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const getSegmentPath = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z",
    ].join(" ");
  };

  const handleSpin = () => {
    if (spinning || disabled || isSpunRef.current) return;

    isSpunRef.current = true;
    setSpinning(true);
    setResult(null);

    // Pick a random winning index
    const winIndex = Math.floor(Math.random() * numSectors);

    // 5 full rotations (1800 degrees) + align arrow to land inside winIndex sector
    // 0 degrees is top, we want to align the top edge with the winning sector.
    // SVG sectors are rendered sequentially clockwise.
    const extraSpins = 6 * 360; 
    const randomShiftInSector = 5 + Math.random() * (sectorAngle - 10); // stay away from segment dividing lines
    const targetAngle = extraSpins + (360 - (winIndex * sectorAngle) - randomShiftInSector);

    setRotation(targetAngle);

    // Finish spinning after animation duration
    setTimeout(() => {
      setSpinning(false);
      setResult(options[winIndex]);
      onSpinComplete(winIndex, options[winIndex]);
    }, 4500);
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-sm mx-auto">
      {/* Outer Wheel Container */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 select-none">
        {/* Needle pointing from top */}
        <div className="absolute top-0 left-1/2 -ml-4 z-40 transform -translate-y-4 filter drop-shadow-md">
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-rose-500" />
          <div className="w-2.5 h-2.5 bg-white rounded-full mx-auto -mt-6 border border-slate-300" />
        </div>

        {/* Dynamic Rotatable Svg Wheel */}
        <div 
          className="w-full h-full rounded-full border-[10px] border-slate-900 dark:border-slate-800 shadow-2xl relative overflow-hidden bg-slate-900"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.5s cubic-bezier(0.15, 0.85, 0.35, 1)" : "none"
          }}
        >
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full"
          >
            {options.map((opt, i) => {
              const startAngle = i * sectorAngle;
              const endAngle = startAngle + sectorAngle;
              const sectorColor = colors[i % colors.length];

              // Mid sector calculation for text positioning
              const textAngle = startAngle + sectorAngle / 2;
              const textPos = polarToCartesian(150, 150, 85, textAngle);

              return (
                <g key={i}>
                  {/* Segment path */}
                  <path
                    d={getSegmentPath(150, 150, 140, startAngle, endAngle)}
                    fill={sectorColor}
                    stroke="#1e293b"
                    strokeWidth="2"
                  />
                  {/* Sector labels */}
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fill="#ffffff"
                    fontSize={numSectors > 5 ? "11" : "13"}
                    fontWeight="900"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(${textAngle < 185 ? textAngle - 0 : textAngle - 180}, ${textPos.x}, ${textPos.y})`}
                    className="select-none font-mono tracking-tight filter drop-shadow-md"
                  >
                    {opt.length > 12 ? opt.substring(0, 10) + ".." : opt}
                  </text>
                </g>
              );
            })}

            {/* Glowing neon rim bulbs */}
            {Array.from({ length: 18 }).map((_, idx) => {
              const angle = (idx * 360) / 18;
              const pos = polarToCartesian(150, 150, 134, angle);
              const isLit = spinning ? (idx % 2 === (bulbToggle ? 1 : 0)) : true;
              return (
                <circle
                  key={`bulb-${idx}`}
                  cx={pos.x}
                  cy={pos.y}
                  r="3.5"
                  fill={isLit ? "#fffb00" : "#555200"}
                  stroke="#1e293b"
                  strokeWidth="0.5"
                  className="transition-all duration-100 filter drop-shadow-[0_0_2px_rgba(253,224,71,0.8)]"
                />
              );
            })}

            {/* Inner pin rivet */}
            <circle cx="150" cy="150" r="18" fill="#1e293b" stroke="#ffffff" strokeWidth="4" />
            <circle cx="150" cy="150" r="6" fill="#f59e0b" />
          </svg>
        </div>
      </div>

      {/* Control button */}
      <div className="text-center w-full min-h-[4.5rem]">
        {!isSpunRef.current ? (
          <button
            onClick={handleSpin}
            disabled={disabled}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-extrabold text-lg uppercase tracking-wider rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border-b-[6px] border-amber-700 font-display flex items-center justify-center gap-2 mx-auto"
          >
            <Sparkles className="w-5 h-5 animate-pulse" /> Spin het Rad! 🎰
          </button>
        ) : spinning ? (
          <div className="inline-flex flex-col items-center">
            <span className="text-sm text-slate-400 dark:text-slate-300 font-bold animate-pulse flex items-center gap-1">
              ✨ Het rad draait... Waag je gokje! ✨
            </span>
            <div className="w-48 bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-400 h-full animate-marquee duration-1000 origin-left w-1/2 rounded-full" style={{ animation: "shimmer 1.5s infinite" }} />
            </div>
          </div>
        ) : result ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex flex-col items-center p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/20 text-amber-600 dark:text-amber-400"
          >
            <span className="text-xs uppercase font-black tracking-widest text-amber-500 dark:text-amber-500">
              Jouw gokuitkomst:
            </span>
            <span className="text-xl font-black font-display mt-0.5 animate-bounce">
              🎉 {result} 🎉
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
