/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { SOLAR_TERMS, MANSIONS } from '../data';
import { SolarTerm } from '../types';

interface CelestialMapProps {
  activeTerm: SolarTerm;
  onSelectTerm: (term: SolarTerm) => void;
  lastTriggeredTermId?: number | null;
  triggerPulse?: number;
}

// Simple Web Audio Synthesizer to play classical pentatonic scale
class PentatonicSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playNote(noteName: string) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Map note to frequencies (Pentatonic Scale)
      const noteFreqs: { [key: string]: number } = {
        'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'G3': 196.00, 'A3': 220.00,
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00,
      };

      const freq = noteFreqs[noteName] || 440;

      // Create primary oscillator (soft sine chime)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Create a secondary harmonic (overtone) for a zither/gong-like bloom
      const overtone = this.ctx.createOscillator();
      const overtoneGain = this.ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 1.5, now); // Perfect fifth overtone

      // Create simple reverb delay node
      const delay = this.ctx.createDelay();
      const delayFeedback = this.ctx.createGain();
      delay.delayTime.setValueAtTime(0.3, now);
      delayFeedback.gain.setValueAtTime(0.25, now);

      // Setup envelopes
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05); // quick attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); // long decay

      overtoneGain.gain.setValueAtTime(0, now);
      overtoneGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // decay faster

      // Connections
      osc.connect(gain);
      overtone.connect(overtoneGain);
      
      gain.connect(this.ctx.destination);
      overtoneGain.connect(this.ctx.destination);

      // Connect to delay line
      gain.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delayFeedback.connect(this.ctx.destination);

      // Start & Stop
      osc.start(now);
      overtone.start(now);
      
      osc.stop(now + 2.1);
      overtone.stop(now + 2.1);
    } catch (e) {
      console.error('Failed to play synth note:', e);
    }
  }
}

export default function CelestialMap({ 
  activeTerm, 
  onSelectTerm, 
  lastTriggeredTermId = null, 
  triggerPulse = 0 
}: CelestialMapProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(3000); // ms per term
  const synthRef = useRef<PentatonicSynth | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize synth
  useEffect(() => {
    synthRef.current = new PentatonicSynth();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sync sound setting
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.enabled = soundEnabled;
    }
  }, [soundEnabled]);

  // Handle active term changes (play sound)
  useEffect(() => {
    if (synthRef.current && soundEnabled) {
      synthRef.current.playNote(activeTerm.musicNote);
    }
  }, [activeTerm.id, soundEnabled]);

  // Handle auto-rotation cycle
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        const nextId = activeTerm.id === 24 ? 1 : activeTerm.id + 1;
        const nextTerm = SOLAR_TERMS.find(t => t.id === nextId);
        if (nextTerm) onSelectTerm(nextTerm);
      }, rotationSpeed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeTerm.id, rotationSpeed, onSelectTerm]);

  const handleTermClick = (term: SolarTerm) => {
    setIsPlaying(false); // Pause auto-play on manual interaction
    onSelectTerm(term);
  };

  const getSeasonColor = (season: string) => {
    switch (season) {
      case 'spring': return 'rgba(16, 185, 129, 0.8)'; // Emerald
      case 'summer': return 'rgba(244, 63, 94, 0.8)';  // Rose
      case 'autumn': return 'rgba(245, 158, 11, 0.8)'; // Amber
      case 'winter': return 'rgba(56, 189, 248, 0.8)'; // Sky
      default: return 'rgba(212, 163, 89, 0.8)';
    }
  };

  const staticAstroBg = useMemo(() => {
    return (
      <>
        {/* Outer Astrolabe Border & Fine Measurement Ticks */}
        <circle r="300" fill="none" stroke="rgba(146, 108, 48, 0.15)" strokeWidth="1" />
        <circle r="294" fill="none" stroke="rgba(146, 108, 48, 0.35)" strokeWidth="2" />
        <circle r="286" fill="none" stroke="rgba(146, 108, 48, 0.1)" strokeWidth="1" />

        {/* 360 Degree Ticks */}
        {Array.from({ length: 120 }).map((_, i) => {
          const angle = i * 3;
          const isMajor = i % 10 === 0;
          const length = isMajor ? 8 : 4;
          const opacity = isMajor ? 0.45 : 0.2;
          const r1 = 294;
          const r2 = 294 - length;
          const x1 = r1 * Math.cos((angle * Math.PI) / 180);
          const y1 = r1 * Math.sin((angle * Math.PI) / 180);
          const x2 = r2 * Math.cos((angle * Math.PI) / 180);
          const y2 = r2 * Math.sin((angle * Math.PI) / 180);
          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(217, 119, 6, 0.7)"
              strokeWidth={isMajor ? 1.5 : 1}
              strokeOpacity={opacity}
            />
          );
        })}

        {/* Seasonal Quad-Sectors Overlay */}
        <path d="M 0 0 L 205 205" stroke="rgba(146, 108, 48, 0.05)" strokeWidth="1" />
        <path d="M 0 0 L -205 205" stroke="rgba(146, 108, 48, 0.05)" strokeWidth="1" />
        <path d="M 0 0 L 205 -205" stroke="rgba(146, 108, 48, 0.05)" strokeWidth="1" />
        <path d="M 0 0 L -205 -205" stroke="rgba(146, 108, 48, 0.05)" strokeWidth="1" />

        {/* 28 Mansions Constellation Lines & Star Nodes */}
        {Object.entries(MANSIONS).map(([direction, data]) => {
          const points: string[] = [];
          return (
            <g key={`mansion-group-${direction}`} id={`mansion-group-${direction}`}>
              {data.stars.map((star, idx) => {
                const mAngle = data.angles[idx];
                const mRad = (mAngle * Math.PI) / 180;
                const mRadius = 165; // Mansion circle radius
                const mx = mRadius * Math.cos(mRad);
                const my = mRadius * Math.sin(mRad);
                points.push(`${mx},${my}`);

                return (
                  <g key={`mansion-star-${star}`}>
                    {/* Mansion Star Dot */}
                    <circle
                      cx={mx}
                      cy={my}
                      r="3.5"
                      fill={data.color}
                      className="animate-pulse"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    />
                    <circle
                      cx={mx}
                      cy={my}
                      r="8"
                      fill="none"
                      stroke={data.color}
                      strokeWidth="0.5"
                      strokeOpacity="0.3"
                    />
                    {/* Mansion Name Label - Placed slightly closer to center (r=148) to prevent any cutoff */}
                    {(() => {
                      const labelR = 148;
                      const lx = labelR * Math.cos(mRad);
                      const ly = labelR * Math.sin(mRad);
                      return (
                        <text
                          x={lx}
                          y={ly}
                          fill="rgba(44, 42, 41, 0.55)"
                          fontSize="9"
                          fontFamily="serif"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="hover:fill-[#8c1c1c] transition-colors"
                        >
                          {star}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}
              {/* Connect Mansion Nodes with subtle colored constellation path */}
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke={data.color}
                strokeWidth="0.8"
                strokeDasharray="2,3"
                strokeOpacity="0.25"
              />
            </g>
          );
        })}

        {/* The 24 Solar Terms Rings */}
        <circle r="236" fill="none" stroke="rgba(146, 108, 48, 0.1)" strokeWidth="1" />
        <circle r="215" fill="none" stroke="rgba(146, 108, 48, 0.2)" strokeWidth="1.5" />
        <circle r="195" fill="none" stroke="rgba(146, 108, 48, 0.1)" strokeWidth="1" />
      </>
    );
  }, []);

  return (
    <div className="flex flex-col items-center bg-[#faf6eb]/90 border border-[#d6cebf] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      {/* Background Starry Dust Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(140,28,28,0.02)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-[#8c1c1c]/5 border border-[#8c1c1c]/25 rounded-full">
        <Sparkles className="w-3.5 h-3.5 text-[#8c1c1c] animate-pulse" />
        <span className="text-[11px] font-bold tracking-widest text-[#8c1c1c] font-serif">浑天星历·岁时星盘</span>
      </div>

      {/* Astro Wheel SVG Canvas */}
      <div className="w-full max-w-[620px] aspect-square relative select-none mt-6 overflow-visible">
        <svg
          id="celestial-astrolabe-svg"
          viewBox="-345 -345 690 690"
          className="w-full h-full overflow-visible"
        >
          {/* Static Astrolabe Background elements */}
          {staticAstroBg}

          {/* 24 Solar Terms Radial Labels */}
          {SOLAR_TERMS.map((term, i) => {
            // angle calculations: 立春 starts at 315° (top-left sector), we can map longitude directly as angle
            // Solar Longitude goes 0 (春分 - Right), 90 (夏至 - Bottom), 180 (秋分 - Left), 270 (冬至 - Top)
            const angle = term.longitude;
            const rad = (angle * Math.PI) / 180;
            const textR = 216; // Perfectly positioned inside safety boundaries
            const tx = textR * Math.cos(rad);
            const ty = textR * Math.sin(rad);

            const isActive = activeTerm.id === term.id;
            const termColor = getSeasonColor(term.season);

            // Calculate elegant radial rotation for text so they radiate outward,
            // but rotate an extra 180 if they are in the left half of the circle (between 90 and 270) to prevent upside-down letters!
            let textRot = angle;
            if (angle > 90 && angle < 270) {
              textRot += 180;
            }

            return (
              <g
                key={`term-label-${term.id}`}
                id={`term-label-${term.id}`}
                className="cursor-pointer group/label"
                onClick={() => handleTermClick(term)}
              >
                {/* Interactive Click Target Area */}
                <circle
                  cx={tx}
                  cy={ty}
                  r="18"
                  fill="transparent"
                  className="hover:fill-amber-500/10 transition-colors"
                />

                {/* Glowing ring around active term */}
                {isActive && (
                  <>
                    <circle
                      cx={tx}
                      cy={ty}
                      r="16"
                      fill="none"
                      stroke={termColor}
                      strokeWidth="1.5"
                      strokeOpacity="0.8"
                    />
                    <circle
                      cx={tx}
                      cy={ty}
                      r="22"
                      fill="none"
                      stroke={termColor}
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      className="animate-ping"
                      style={{ animationDuration: '3s' }}
                    />
                  </>
                )}

                {/* Sequencer audio pulse light glow effect */}
                {lastTriggeredTermId === term.id && (
                  <circle
                    cx={tx}
                    cy={ty}
                    r="35"
                    fill="none"
                    stroke={termColor}
                    strokeWidth="3"
                    strokeOpacity="0.9"
                    className="animate-ping"
                    style={{ animationDuration: '0.7s' }}
                  />
                )}

                {/* The Solar Term Chinese Text (Fully visible, padded, zero cutoff!) */}
                <g transform={`translate(${tx}, ${ty}) rotate(${textRot})`}>
                  <text
                    x="0"
                    y="0"
                    fontFamily="serif"
                    fontSize={isActive ? "13" : "11"}
                    fontWeight={isActive ? "bold" : "normal"}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isActive ? termColor : "rgba(44, 42, 41, 0.75)"}
                    className="transition-all duration-300 group-hover/label:fill-[#8c1c1c]"
                  >
                    {term.name}
                  </text>
                </g>

                {/* Connect outer circle node to the 24 term nodes */}
                <circle
                  cx={tx}
                  cy={ty}
                  r="2"
                  fill={isActive ? termColor : "rgba(146, 108, 48, 0.4)"}
                />
              </g>
            );
          })}

          {/* Central Core & The Big Dipper (北斗七星) */}
          <g>
            <circle r="60" fill="none" stroke="rgba(146, 108, 48, 0.12)" strokeWidth="1" />
            <circle r="4" fill="none" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="1" />
            <circle r="1" fill="#f59e0b" /> {/* Polaris at center */}

            {/* Rotatable Big Dipper Group */}
            {/* The handle of the Big Dipper (Yaoguang) points to the current active Solar Term (longitude angle) */}
            <motion.g
              animate={{ rotate: activeTerm.longitude }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              id="big-dipper-group"
            >
              {/* Star Coords (Scale adjusted for inner r=70 space) */}
              {/* Tianshu (Dubhe), Tianxuan (Merak), Tianji (Phecda), Tianquan (Megrez), Yuheng (Alioth), Kaiyang (Mizar), Yaoguang (Alkaid) */}
              {(() => {
                const dipperStars = [
                  { name: '天枢', x: -16, y: -38, r: 2.5 },
                  { name: '天璇', x: -32, y: -30, r: 2.5 },
                  { name: '天玑', x: -26, y: -10, r: 2 },
                  { name: '天权', x: -10, y: -10, r: 1.5 },
                  { name: '玉衡', x: 14, y: -2, r: 2 },
                  { name: '开阳', x: 38, y: 10, r: 2.5 },
                  { name: '摇光', x: 68, y: 14, r: 3 }, // YAOGUANG points to term!
                ];

                // Lines connecting the dipper
                const pathD = "M -16 -38 L -32 -30 L -26 -10 L -10 -10 L 14 -2 L 38 10 L 68 14 M -26 -10 L -16 -38";

                return (
                  <>
                    {/* Connecting Constellation Lines */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(251, 191, 36, 0.55)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shadow-md"
                    />

                    {/* Glowing Stars */}
                    {dipperStars.map((star) => (
                      <g key={`dipper-star-${star.name}`}>
                        <circle
                          cx={star.x}
                          cy={star.y}
                          r={star.r + 3}
                          fill="rgba(251, 191, 36, 0.25)"
                          className="animate-pulse"
                        />
                        <circle
                          cx={star.x}
                          cy={star.y}
                          r={star.r}
                          fill="#fbbf24"
                        />
                        {/* Star Labels */}
                        <text
                          x={star.x}
                          y={star.y - star.r - 5}
                          fill="rgba(140, 28, 28, 0.75)"
                          fontSize="8"
                          fontFamily="serif"
                          textAnchor="middle"
                        >
                          {star.name}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </motion.g>
          </g>
        </svg>
      </div>

      {/* Play / Pause / Sound Control Bar */}
      <div className="w-full mt-6 flex flex-wrap items-center justify-between gap-4 bg-[#fcfaf2] border border-[#d6cebf] rounded-xl p-4 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Play Cycle Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            id="play-cycle-btn"
            className={`p-2.5 rounded-full transition-all duration-300 ${
              isPlaying
                ? 'bg-[#2d4a22] text-white hover:bg-[#1e3f10] shadow-md'
                : 'bg-[#8c1c1c]/10 border border-[#8c1c1c]/30 text-[#8c1c1c] hover:bg-[#8c1c1c]/20'
            }`}
            title={isPlaying ? "暂停岁时轮转" : "开启岁时轮转"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            id="toggle-sound-btn"
            className={`p-2.5 rounded-full border transition-all duration-300 ${
              soundEnabled
                ? 'border-[#8c1c1c]/30 bg-[#8c1c1c]/5 text-[#8c1c1c] hover:bg-[#8c1c1c]/15'
                : 'border-stone-300 bg-stone-100 text-stone-400 hover:text-stone-500'
            }`}
            title={soundEnabled ? "静音" : "开启声音"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-stone-800 tracking-wider">岁时天体大回环</span>
            <span className="text-[9px] text-stone-500 font-serif font-medium">
              {isPlaying ? '星宿运行中... (自转)' : '静观斗转星移'}
            </span>
          </div>
        </div>

        {/* Speed Selector */}
        {isPlaying && (
          <div className="flex items-center gap-2 bg-[#faf6eb] px-3 py-1.5 border border-[#d6cebf] rounded-lg">
            <RotateCw className="w-3 h-3 text-[#8c1c1c] animate-spin" />
            <span className="text-[10px] text-stone-600 font-serif font-medium">轮转步频:</span>
            <select
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
              className="bg-transparent border-none text-[10px] text-[#8c1c1c] font-serif font-bold outline-none cursor-pointer"
              id="speed-select"
            >
              <option value="4000" className="bg-[#faf6eb] text-stone-800">缓慢 (4s)</option>
              <option value="2500" className="bg-[#faf6eb] text-stone-800">中速 (2.5s)</option>
              <option value="1500" className="bg-[#faf6eb] text-stone-800">快速 (1.5s)</option>
            </select>
          </div>
        )}
      </div>

      {/* Bottom instructions */}
      <div className="text-[11px] text-stone-600 font-serif mt-4 text-center leading-relaxed font-medium">
        点击星盘边缘的 <span className="text-[#8c1c1c] font-bold">二十四节气</span>，斗柄会自动偏转指引，并发出古朴空灵的编钟宫商角徵羽音律。
      </div>
    </div>
  );
}
