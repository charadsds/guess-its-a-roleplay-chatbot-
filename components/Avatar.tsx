
import React, { useState, useEffect, useMemo } from 'react';
import { Emotion } from '../types';

interface AvatarProps {
  emotion: Emotion;
  isSpeaking: boolean;
  mouthOpenness: number; // 0 to 1
}

const Avatar: React.FC<AvatarProps> = ({ emotion, isSpeaking, mouthOpenness }) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Random Blinking Logic
  useEffect(() => {
    let timeout: number;
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 120);
      timeout = window.setTimeout(blink, 2500 + Math.random() * 5000);
    };
    timeout = window.setTimeout(blink, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Determine eye and brow transforms based on emotion
  const expressions = useMemo(() => {
    switch (emotion) {
      case Emotion.Happy:
        return { browY: -3, browRotate: -8, eyeScaleY: 0.85, mouthPath: "M 44 76 Q 50 82 56 76" };
      case Emotion.Angry:
        return { browY: 3, browRotate: 20, eyeScaleY: 0.8, mouthPath: "M 44 78 Q 50 74 56 78" };
      case Emotion.Surprised:
        return { browY: -5, browRotate: 0, eyeScaleY: 1.2, mouthPath: "M 46 78 Q 50 86 54 78" };
      case Emotion.Thinking:
        return { browY: -1, browRotate: -15, eyeScaleY: 1, mouthPath: "M 45 77 L 55 77" };
      default:
        return { browY: 0, browRotate: 0, eyeScaleY: 1, mouthPath: "M 45 77 Q 50 78 55 77" };
    }
  }, [emotion]);

  const currentMouthPath = useMemo(() => {
    if (!isSpeaking) return expressions.mouthPath;
    const depth = 2 + (mouthOpenness * 18);
    const width = 6 + (mouthOpenness * 4);
    return `M ${50 - width/2} 77 Q 50 ${77 + depth} ${50 + width/2} 77`;
  }, [isSpeaking, mouthOpenness, expressions.mouthPath]);

  // Reactive styles for the visualizer
  const visualizerScale = 1 + (mouthOpenness * 0.15);
  const glowOpacity = isSpeaking ? 0.3 + (mouthOpenness * 0.4) : 0.2;

  return (
    <div className="relative w-96 h-96 mx-auto flex items-center justify-center select-none">
      {/* Dynamic Reactive Glow Aura */}
      <div 
        className="absolute inset-0 rounded-full blur-[100px] transition-all duration-75"
        style={{
          backgroundColor: isSpeaking ? '#ff99cc' : '#7a2fcc',
          opacity: glowOpacity,
          transform: `scale(${visualizerScale * 1.1})`
        }}
      ></div>

      {/* Reactive Visualizer Ring */}
      <div 
        className={`absolute inset-0 border-2 rounded-full transition-all duration-75 pointer-events-none ${
          isSpeaking ? 'border-pink-400/40' : 'border-purple-500/10'
        }`}
        style={{
          transform: `scale(${1 + (mouthOpenness * 0.3)})`,
          opacity: isSpeaking ? 0.8 : 0,
          boxShadow: isSpeaking ? `0 0 ${20 + mouthOpenness * 40}px rgba(255, 153, 204, 0.4)` : 'none'
        }}
      ></div>

      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(255,100,200,0.3)] overflow-visible">
        <defs>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#ff99cc', stopOpacity: 1 }} />
            <stop offset="60%" style={{ stopColor: '#cc66ff', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#7a2fcc', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#330033', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#ff00ff', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* 1. Back Pigtails Layer - Physics Based Sway */}
        <g className="animate-[float_5s_ease-in-out_infinite]">
          <g className="animate-[pigtail-l_3.5s_ease-in-out_infinite] origin-[30px_40px]">
            <path d="M 30 40 Q 5 45 10 90 Q 15 110 30 100 Q 25 70 35 45" fill="url(#hairGrad)" opacity="0.9" />
          </g>
          <g className="animate-[pigtail-r_3.8s_ease-in-out_infinite] origin-[70px_40px]">
            <path d="M 70 40 Q 95 45 90 90 Q 85 110 70 100 Q 75 70 65 45" fill="url(#hairGrad)" opacity="0.9" />
          </g>
        </g>

        {/* 2. Body / Outfit Layer (Cyber Seifuku) */}
        <g className="animate-[pulse_4s_ease-in-out_infinite] origin-bottom">
          <path d="M 30 105 L 70 105 L 88 140 L 12 140 Z" fill="#ffffff" stroke="#ddd" strokeWidth="0.5" />
          <path d="M 35 105 L 50 115 L 65 105 L 75 118 L 25 118 Z" fill="#2a2a40" />
          <path d="M 45 115 L 55 115 L 58 125 L 50 120 L 42 125 Z" fill="#ff44aa" className={isSpeaking ? 'animate-pulse' : ''} />
          <circle cx="20" cy="125" r="2" fill="#00ffff" opacity="0.6" />
          <circle cx="80" cy="125" r="2" fill="#00ffff" opacity="0.6" />
        </g>

        {/* 3. Head Assembly */}
        <g className="animate-[float_4s_ease-in-out_infinite] origin-[50px_100px]">
          
          {/* Cat Ear Headphones (Back) */}
          <path d="M 28 25 L 15 5 L 40 20 Z" fill="#1a1a2e" />
          <path d="M 72 25 L 85 5 L 60 20 Z" fill="#1a1a2e" />
          <path d="M 32 23 Q 50 15 68 23" fill="none" stroke="#1a1a2e" strokeWidth="4" />

          {/* Face Base */}
          <path d="M 28 55 Q 28 25 50 25 Q 72 25 72 55 Q 72 92 50 98 Q 28 92 28 55" fill="#fff5f0" />
          
          {/* Inner Cat Ear Glow */}
          <path d="M 30 23 L 22 10 L 38 20 Z" fill="#ff44aa" opacity={isSpeaking ? 0.4 + (mouthOpenness * 0.6) : 0.3} className="transition-opacity duration-75" />
          <path d="M 70 23 L 78 10 L 62 20 Z" fill="#ff44aa" opacity={isSpeaking ? 0.4 + (mouthOpenness * 0.6) : 0.3} className="transition-opacity duration-75" />

          {/* Blushes */}
          {emotion === Emotion.Happy && (
            <g opacity="0.4">
              <ellipse cx="38" cy="72" rx="6" ry="2.5" fill="#ff99aa" />
              <ellipse cx="62" cy="72" rx="6" ry="2.5" fill="#ff99aa" />
              <line x1="35" y1="70" x2="38" y2="74" stroke="#ff4488" strokeWidth="0.5" />
              <line x1="39" y1="70" x2="42" y2="74" stroke="#ff4488" strokeWidth="0.5" />
            </g>
          )}

          {/* Eyes Group */}
          <g transform={`translate(0, ${isBlinking ? 2 : 0})`}>
            <g transform="translate(42, 58)">
               <ellipse rx="7" ry={isBlinking ? 0.5 : 10 * expressions.eyeScaleY} fill="url(#eyeGrad)" />
               {!isBlinking && (
                 <>
                   <circle cx="2" cy="-4" r="2.5" fill="white" opacity="0.9" />
                   <circle cx="-2" cy="3" r="1.2" fill="white" opacity="0.6" />
                 </>
               )}
            </g>
            <g transform="translate(58, 58)">
               <ellipse rx="7" ry={isBlinking ? 0.5 : 10 * expressions.eyeScaleY} fill="url(#eyeGrad)" />
               {!isBlinking && (
                 <>
                   <circle cx="2" cy="-4" r="2.5" fill="white" opacity="0.9" />
                   <circle cx="-2" cy="3" r="1.2" fill="white" opacity="0.6" />
                 </>
               )}
            </g>
          </g>

          {/* Brows */}
          <g stroke="#5c3c3c" strokeWidth="2" strokeLinecap="round" fill="none">
            <path 
              d="M 35 48 Q 42 44 48 48" 
              transform={`translate(0, ${expressions.browY}) rotate(${expressions.browRotate}, 42, 48)`} 
            />
            <path 
              d="M 52 48 Q 58 44 65 48" 
              transform={`translate(0, ${expressions.browY}) rotate(${-expressions.browRotate}, 58, 48)`} 
            />
          </g>

          {/* Mouth */}
          <path 
            d={currentMouthPath} 
            stroke="#5c3c3c" 
            strokeWidth="2.5" 
            fill={isSpeaking ? "#ff99aa" : "none"} 
            strokeLinecap="round" 
            className="transition-all duration-[50ms]"
          />

          {/* Hair - Bangs & Side Locks with Secondary Motion */}
          <g className="animate-[float_6s_ease-in-out_infinite]">
            <g className="animate-[lock-sway_4.2s_ease-in-out_infinite] origin-[28px_40px]">
              <path d="M 28 40 L 22 85 Q 20 95 28 80 Z" fill="url(#hairGrad)" />
            </g>
            <g className="animate-[lock-sway_4.5s_ease-in-out_infinite] origin-[72px_40px]">
              <path d="M 72 40 L 78 85 Q 80 95 72 80 Z" fill="url(#hairGrad)" />
            </g>
            <path d="M 25 45 Q 25 15 50 15 Q 75 15 75 45 L 78 55 Q 65 30 55 45 Q 45 30 22 55 Z" fill="url(#hairGrad)" />
            <path d="M 35 25 Q 50 20 65 25" fill="none" stroke="white" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
      
      {/* HUD Accents - Pulse with audio */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-cyan-500/10 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none transition-all duration-75"
        style={{
          transform: `translate(-50%, -50%) scale(${1 + mouthOpenness * 0.05})`,
          borderColor: isSpeaking ? `rgba(34, 211, 238, ${0.1 + mouthOpenness * 0.4})` : 'rgba(34, 211, 238, 0.1)'
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_#22d3ee]"></div>
      </div>
    </div>
  );
};

export default Avatar;
