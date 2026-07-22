/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Trash2, Sparkles, Upload, Download, Volume2, 
  ChevronDown, ChevronUp, Music, Eye, Plus, Check, 
  Activity, Disc, Database, Award, Info, Smile,
  Heart, MessageCircle, Send, RotateCcw
} from 'lucide-react';
import { SOLAR_TERMS } from '../data';
import { SolarTerm } from '../types';
import { saveSoundToDB, getAllSoundsFromDB, deleteSoundFromDB } from '../lib/soundDb';

interface SoundBoxSequencerProps {
  onStepTrigger?: (termId: number) => void;
  activeTermId: number;
}

interface UploadedSound {
  fileName: string;
  buffer: AudioBuffer | null;
}

interface SoundLibraryItem {
  id: string;
  name: string;
  creator: string;
  fileName: string;
  buffer: AudioBuffer | null; // Null if purely procedural modeled
  type: 'upload' | 'modeled';
  modeledInst?: string; // e.g. 'pipa', 'guqin', 'chimes'
  preferModeling?: boolean; // Toggle to prefer modeling synthesizer over raw audio buffer
  timestamp: string;
  // Modeling parameters
  pluckRate?: number;
  harmonicFullness?: number;
  decayRate?: number;
}

// Map each of the 24 terms to a default note name, frequency, and traditional instrument
const TERM_AUDIO_MAP: { [key: number]: { note: string; freq: number; inst: string; instLabel: string } } = {
  1: { note: '宫', freq: 130.81, inst: 'guqin', instLabel: '古琴 (guqin)' },
  2: { note: '商', freq: 146.83, inst: 'guzheng', instLabel: '古筝 (guzheng)' },
  3: { note: '角', freq: 164.81, inst: 'pipa', instLabel: '琵琶 (pipa)' },
  4: { note: '徵', freq: 196.00, inst: 'dizi', instLabel: '笛子 (dizi)' },
  5: { note: '羽', freq: 220.00, inst: 'konghou', instLabel: '箜篌 (konghou)' },
  6: { note: '少宫', freq: 261.63, inst: 'yangqin', instLabel: '扬琴 (yangqin)' },
  7: { note: '商', freq: 146.83, inst: 'chimes', instLabel: '编钟 (chimes)' },
  8: { note: '角', freq: 164.81, inst: 'xiao', instLabel: '箫 (xiao)' },
  9: { note: '徵', freq: 196.00, inst: 'duxianqin', instLabel: '独弦琴 (duxianqin)' },
  10: { note: '羽', freq: 220.00, inst: 'suona', instLabel: '箫笛 (flute)' },
  11: { note: '少宫', freq: 261.63, inst: 'bells', instLabel: '铜铃 (bells)' },
  12: { note: '少商', freq: 293.66, inst: 'bells', instLabel: '古筑 (zhu)' },
  13: { note: '宫', freq: 130.81, inst: 'xun', instLabel: '埙 (xun)' },
  14: { note: '商', freq: 146.83, inst: 'ruan', instLabel: '中阮 (ruan)' },
  15: { note: '角', freq: 164.81, inst: 'lusheng', instLabel: '芦笙 (lusheng)' },
  16: { note: '徵', freq: 196.00, inst: 'ruan', instLabel: '瑟 (se)' },
  17: { note: '羽', freq: 220.00, inst: 'chimes', instLabel: '编磬 (stone)' },
  18: { note: '少宫', freq: 261.63, inst: 'xun', instLabel: '陶笛 (ocarina)' },
  19: { note: '宫', freq: 130.81, inst: 'chimes', instLabel: '磬 (stone bell)' },
  20: { note: '商', freq: 146.83, inst: 'xiao', instLabel: '排箫 (pan flute)' },
  21: { note: '角', freq: 164.81, inst: 'bells', instLabel: '铃鼓 (suzu)' },
  22: { note: '徵', freq: 196.00, inst: 'drums', instLabel: '雷鼓 (drum)' },
  23: { note: '羽', freq: 220.00, inst: 'dizi', instLabel: '骨笛 (bone flute)' },
  24: { note: '少宫', freq: 261.63, inst: 'chimes', instLabel: '钟磬 (chimes)' },
};

// Helper to encode an AudioBuffer to WAV format ArrayBuffer
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const bufferToWavArrayBuffer = (buffer: AudioBuffer): ArrayBuffer => {
  const numOfChan = 1; // force mono for simple and highly compact storage
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const result = buffer.getChannelData(0);
  const length = result.length * 2;
  const bufferWav = new ArrayBuffer(44 + length);
  const view = new DataView(bufferWav);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);
  
  // Write PCM data
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return bufferWav;
};

// Generate highly authentic synthetic plucked Pipa sound buffer
const generateDemoPipaBuffer = (ctx: BaseAudioContext) => {
  const sampleRate = ctx.sampleRate;
  const duration = 2.0; // 2 seconds
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  const freq = 440.0; // A4 reference tone
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    // Envelope: sharp pluck attack, rapid decay
    const envelope = Math.exp(-4.5 * t); 
    
    // Sum of harmonics: fundamental + bright high overtones (pipa character)
    const wave = Math.sin(2 * Math.PI * freq * t) +
                 0.6 * Math.sin(2 * Math.PI * freq * 2 * t) +
                 0.45 * Math.sin(2 * Math.PI * freq * 3.1 * t) + // metallic overtone
                 0.3 * Math.sin(2 * Math.PI * freq * 4 * t) +
                 0.25 * Math.sin(2 * Math.PI * freq * 5.25 * t); // high shimmer
                 
    // Add minor string friction noise at the pluck moment
    const noise = (Math.random() - 0.5) * Math.exp(-100 * t) * 0.15;
    
    data[i] = (wave / 2.6) * envelope + noise;
  }
  return buffer;
};

// Seasonal Group Configurations
const SEASONAL_GROUPS = [
  { id: 'spring', label: '春 · 萌芽生机', color: 'text-emerald-400', activeBg: 'bg-emerald-500', termIds: [1, 2, 3, 4, 5, 6] },
  { id: 'summer', label: '夏 · 繁茂炽热', color: 'text-rose-400', activeBg: 'bg-rose-500', termIds: [7, 8, 9, 10, 11, 12] },
  { id: 'autumn', label: '秋 · 丰收沉静', color: 'text-amber-400', activeBg: 'bg-amber-500', termIds: [13, 14, 15, 16, 17, 18] },
  { id: 'winter', label: '冬 · 万物收藏', color: 'text-sky-400', activeBg: 'bg-sky-500', termIds: [19, 20, 21, 22, 23, 24] },
];

const ANCIENT_PITCHES = [
  { value: 0, label: '宫 (Gong / Do)' },
  { value: 1, label: '清宫 (C#)' },
  { value: 2, label: '商 (Shang / Re)' },
  { value: 3, label: '清商 (D#)' },
  { value: 4, label: '角 (Jue / Mi)' },
  { value: 5, label: '清角 (Qing Jue / Fa)' },
  { value: 6, label: '变徵 (Bian Zhi / F#)' },
  { value: 7, label: '徵 (Zhi / Sol)' },
  { value: 8, label: '清徵 (G#)' },
  { value: 9, label: '羽 (Yu / La)' },
  { value: 10, label: '清羽 (A#)' },
  { value: 11, label: '变宫 (Bian Gong / Ti)' },
];

const SoundBoxSequencer = React.memo(function SoundBoxSequencer({ onStepTrigger, activeTermId }: SoundBoxSequencerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(115);
  const [currentStep, setCurrentStep] = useState(0);
  const [lightEffectsEnabled, setLightEffectsEnabled] = useState(true);

  // Loop Control State
  const [maxLoops, setMaxLoops] = useState<number>(0); // 0 means Infinite, >0 limits the loops
  const [currentLoop, setCurrentLoop] = useState<number>(1);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderDestRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const centralGainRef = useRef<GainNode | null>(null);

  const getCentralGain = (ctx: AudioContext) => {
    if (!centralGainRef.current) {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      centralGainRef.current = gain;
    }
    return centralGainRef.current;
  };

  // Collapse state for each season group
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({
    spring: false,
    summer: true,
    autumn: true,
    winter: true,
  });

  // Ancient Chinese twelve lulus pitch shifting offsets for each row (1-24)
  const [rowPitches, setRowPitches] = useState<{ [key: number]: number }>(() => {
    const saved = localStorage.getItem('sound_box_row_pitches');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const initial: { [key: number]: number } = {};
    for (let i = 1; i <= 24; i++) {
      initial[i] = 0; // Default: 0 (黄钟, baseline/unshifted)
    }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('sound_box_row_pitches', JSON.stringify(rowPitches));
  }, [rowPitches]);

  const rowPitchesRef = useRef(rowPitches);
  useEffect(() => {
    rowPitchesRef.current = rowPitches;
  }, [rowPitches]);

  const getRowFrequency = (termId: number, baseFreq: number, useReactState = false) => {
    const pitches = useReactState ? rowPitches : rowPitchesRef.current;
    const shift = pitches[termId] || 0;
    return baseFreq * Math.pow(2, shift / 12);
  };

  const handleRowPitchChange = (termId: number, semitones: number) => {
    setRowPitches(prev => ({
      ...prev,
      [termId]: semitones
    }));
  };

  // Sound Library state with default classical modeling presets
  const [soundLibrary, setSoundLibrary] = useState<SoundLibraryItem[]>(() => [
    {
      id: 'lib-pre-guqin',
      name: '太古遗响 · 清微淡远',
      creator: '伯牙',
      fileName: 'guqin_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'guqin',
      timestamp: '经典预设',
      pluckRate: 0.95,
      harmonicFullness: 0.4,
      decayRate: 1.8
    },
    {
      id: 'lib-pre-pipa',
      name: '春江潮水 · 金石琵琶',
      creator: '刘德海',
      fileName: 'pipa_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'pipa',
      timestamp: '经典预设',
      pluckRate: 0.99,
      harmonicFullness: 0.85,
      decayRate: 0.6
    },
    {
      id: 'lib-pre-chimes',
      name: '曾侯乙 · 编钟宏响',
      creator: '荆楚乐官',
      fileName: 'chimes_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'chimes',
      timestamp: '经典预设',
      pluckRate: 0.9,
      harmonicFullness: 0.75,
      decayRate: 2.5
    },
    {
      id: 'lib-pre-xun',
      name: '深谷幽泉 · 泥埙悲歌',
      creator: '许由',
      fileName: 'xun_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'xun',
      timestamp: '经典预设',
      pluckRate: 0.3,
      harmonicFullness: 0.1,
      decayRate: 1.6
    },
    {
      id: 'lib-pre-piano',
      name: '春风细雨 · 钢琴',
      creator: '巴赫',
      fileName: 'piano_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'piano',
      timestamp: '经典预设',
      pluckRate: 0.9,
      harmonicFullness: 0.7,
      decayRate: 2.0
    },
    {
      id: 'lib-pre-sine',
      name: '万籁归一 · 正弦波',
      creator: '傅里叶',
      fileName: 'sine_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'sine',
      timestamp: '经典预设',
      pluckRate: 0.5,
      harmonicFullness: 0.1,
      decayRate: 1.2
    },
    {
      id: 'lib-pre-triangle',
      name: '晨曦微光 · 三角波',
      creator: '特斯拉',
      fileName: 'triangle_procedural_timbre',
      buffer: null,
      type: 'modeled',
      modeledInst: 'triangle',
      timestamp: '经典预设',
      pluckRate: 0.8,
      harmonicFullness: 0.4,
      decayRate: 1.2
    }
  ]);

  // Audio Upload & Naming Analyzer Form state
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [tempBuffer, setTempBuffer] = useState<AudioBuffer | null>(null);
  const [tempFileName, setTempFileName] = useState('');
  const [soundName, setSoundName] = useState('');
  const [creatorName, setCreatorName] = useState('Gong');
  const [isModelingPipa, setIsModelingPipa] = useState(false); // DEFAULT TO FALSE! Direct sample playback ensures 100% original fidelity!
  const [analyzingStatus, setAnalyzingStatus] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Shortcut loaders
  const [targetLoadTermId, setTargetLoadTermId] = useState<number>(1);

  // Likes and comments state
  interface CommentItem {
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }

  const [soundLikes, setSoundLikes] = useState<{ [key: string]: { count: number, liked: boolean } }>(() => {
    const saved = localStorage.getItem('sound_box_likes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    // Pre-populate realistic like counts for the classical presets
    return {
      'lib-pre-guqin': { count: 188, liked: false },
      'lib-pre-pipa': { count: 256, liked: false },
      'lib-pre-chimes': { count: 120, liked: false },
      'lib-pre-xun': { count: 95, liked: false },
      'lib-pre-piano': { count: 212, liked: false },
      'lib-pre-sine': { count: 76, liked: false },
      'lib-pre-triangle': { count: 83, liked: false }
    };
  });

  const [soundComments, setSoundComments] = useState<{ [key: string]: CommentItem[] }>(() => {
    const saved = localStorage.getItem('sound_box_comments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    // Pre-populate elegant historical comments for traditional presets
    return {
      'lib-pre-guqin': [
        { id: 'c1', author: '潇湘子', text: '此曲只应天上有，人间能得几回闻。古琴声幽远深邃！', timestamp: '07-18 10:24' },
        { id: 'c2', author: '禅意旅人', text: '闭眼聆听，仿佛置身大宋深山古寺，心瞬间安顿。', timestamp: '07-19 15:45' }
      ],
      'lib-pre-pipa': [
        { id: 'c3', author: '浔阳客', text: '大弦嘈嘈如急雨，小弦切切如私语。弹拨瞬态细节太绝了！', timestamp: '07-16 08:12' },
        { id: 'c4', author: '妙音', text: '力量感与穿透力兼备，金石琵琶果真名不虚传！', timestamp: '07-19 21:05' }
      ],
      'lib-pre-chimes': [
        { id: 'c5', author: '楚国后人', text: '编钟重器，宏大庄严。穿越千年的历史厚重感铺面而来！', timestamp: '07-15 14:30' },
        { id: 'c6', author: '钟磬音律', text: '低频泛音极富颗粒感，富有古代宫廷神韵。', timestamp: '07-20 01:15' }
      ],
      'lib-pre-xun': [
        { id: 'c7', author: '隐逸之士', text: '埙声呜呜然如怨如慕，古老泥土的声音，有种骨子里的沧凉之美。', timestamp: '07-17 11:40' },
        { id: 'c8', author: '秋分客', text: '极为写意深沉，适合深夜独自阅读时无限循环。', timestamp: '07-18 19:50' }
      ],
      'lib-pre-piano': [
        { id: 'c-p1', author: '键盘行者', text: '钢琴音色非常温润优雅，像雨水落在黑白键上，赞！', timestamp: '07-19 12:30' },
        { id: 'c-p2', author: '时空作曲家', text: '古典乐器中穿写着钢琴的声音，真的太有新意和高级感了。', timestamp: '07-20 02:40' }
      ],
      'lib-pre-sine': [
        { id: 'c-s1', author: '极简电声', text: '极其纯净的正弦波音色，非常适合做冥想和氛围背景铺底！', timestamp: '07-18 16:55' }
      ],
      'lib-pre-triangle': [
        { id: 'c-t1', author: '低保真浪潮', text: '略带复古8-bit游戏质感的三角波，用来编排动感的节奏真的很有趣！', timestamp: '07-19 18:22' }
      ]
    };
  });

  // Keep track of which sound is expanding its comments tray
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null);

  // Quick inputs for comments
  const [newCommentText, setNewCommentText] = useState('');
  const [userNickname, setUserNickname] = useState('匿名旅人');

  // Deletion persistence for presets so they don't reappear on page reload
  const [deletedPresets, setDeletedPresets] = useState<string[]>(() => {
    const saved = localStorage.getItem('sound_box_deleted_presets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Track user-deleted standard built-in instruments (e.g. guqin, guzheng)
  const [deletedInstruments, setDeletedInstruments] = useState<string[]>(() => {
    const saved = localStorage.getItem('sound_box_deleted_instruments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Core 10 built-in traditional instruments
  const ALL_BUILTIN_INSTRUMENTS = [
    { value: 'guqin', label: '古琴 (guqin)' },
    { value: 'guzheng', label: '古筝 (guzheng)' },
    { value: 'pipa', label: '琵琶 (pipa)' },
    { value: 'dizi', label: '笛子 (dizi)' },
    { value: 'konghou', label: '箜篌 (konghou)' },
    { value: 'yangqin', label: '扬琴 (yangqin)' },
    { value: 'chimes', label: '编钟 (chimes)' },
    { value: 'xiao', label: '洞箫 (xiao)' },
    { value: 'xun', label: '埙 (xun)' },
    { value: 'drums', label: '雷鼓 (drum)' },
    { value: 'piano', label: '钢琴 (piano)' },
    { value: 'sine', label: '正弦波 (sine)' },
    { value: 'triangle', label: '三角波 (triangle)' },
  ];

  // Sync interactions to LocalStorage
  useEffect(() => {
    localStorage.setItem('sound_box_likes', JSON.stringify(soundLikes));
  }, [soundLikes]);

  useEffect(() => {
    localStorage.setItem('sound_box_comments', JSON.stringify(soundComments));
  }, [soundComments]);

  useEffect(() => {
    localStorage.setItem('sound_box_deleted_presets', JSON.stringify(deletedPresets));
  }, [deletedPresets]);

  useEffect(() => {
    localStorage.setItem('sound_box_deleted_instruments', JSON.stringify(deletedInstruments));
  }, [deletedInstruments]);

  // Compute actual visible sound library items
  const visibleSoundLibrary = soundLibrary.filter(item => !deletedPresets.includes(item.id));

  // Refs to avoid stale closures in setTimeout callbacks
  const soundNameRef = useRef(soundName);
  const creatorNameRef = useRef(creatorName);
  const targetLoadTermIdRef = useRef(targetLoadTermId);

  useEffect(() => {
    soundNameRef.current = soundName;
  }, [soundName]);

  useEffect(() => {
    creatorNameRef.current = creatorName;
  }, [creatorName]);

  useEffect(() => {
    targetLoadTermIdRef.current = targetLoadTermId;
  }, [targetLoadTermId]);

  // Keep the original ArrayBuffer of the uploaded file for persistence
  const tempArrayBufferRef = useRef<ArrayBuffer | null>(null);

  // Load custom sounds from IndexedDB on mount
  useEffect(() => {
    const loadCustomSounds = async () => {
      try {
        const savedSounds = await getAllSoundsFromDB();
        if (savedSounds.length > 0) {
          // Initialize AudioContext if not already done
          const tempCtx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
          if (!audioCtxRef.current) {
            audioCtxRef.current = tempCtx;
          }

          const loadedItems: SoundLibraryItem[] = [];
          
          for (const item of savedSounds) {
            try {
              // Decode a copy of the ArrayBuffer
              const bufferCopy = item.arrayBuffer.slice(0);
              const decodedBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
                tempCtx.decodeAudioData(bufferCopy, resolve, reject);
              });

              loadedItems.push({
                id: item.id,
                name: item.name,
                creator: item.creator,
                fileName: item.fileName,
                buffer: decodedBuffer,
                type: 'upload',
                timestamp: item.timestamp,
                pluckRate: item.pluckRate,
                harmonicFullness: item.harmonicFullness,
                decayRate: item.decayRate,
                preferModeling: item.preferModeling !== false,
                modeledInst: item.modeledInst
              });
            } catch (decodeErr) {
              console.error(`Error decoding saved sound ${item.name}:`, decodeErr);
            }
          }

          if (loadedItems.length > 0) {
            setSoundLibrary(prev => {
              const presetIds = ['lib-pre-guqin', 'lib-pre-pipa', 'lib-pre-chimes', 'lib-pre-xun', 'lib-pre-piano', 'lib-pre-sine', 'lib-pre-triangle'];
              const presets = prev.filter(p => presetIds.includes(p.id));
              // Prepend loaded custom items before presets
              return [...loadedItems, ...presets];
            });
          }
        }
      } catch (err) {
        console.error("Failed to load custom sounds from IndexedDB:", err);
      }
    };

    loadCustomSounds();
  }, []);

  // Main 16-step grid state for all 24 solar terms: [termId][step_index (0-15)]
  const [grid, setGrid] = useState<{ [key: number]: boolean[] }>(() => {
    const initialGrid: { [key: number]: boolean[] } = {};
    for (let i = 1; i <= 24; i++) {
      initialGrid[i] = Array(16).fill(false);
    }
    // Pre-populate a simple elegant pattern for Spring (to get started)
    initialGrid[1][0] = true;  // 立春
    initialGrid[1][8] = true;
    initialGrid[2][4] = true;  // 雨水
    initialGrid[2][12] = true;
    initialGrid[3][2] = true;  // 惊蛰
    initialGrid[3][10] = true;
    initialGrid[4][6] = true;  // 春分
    initialGrid[4][14] = true;
    return initialGrid;
  });

  // Dropdown instrument/sound source overrides
  const [instruments, setInstruments] = useState<{ [key: number]: string }>(() => {
    const initial: { [key: number]: string } = {};
    for (let i = 1; i <= 24; i++) {
      initial[i] = TERM_AUDIO_MAP[i].inst;
    }
    return initial;
  });

  // User uploaded audio buffers: [termId] -> UploadedSound
  const [uploadedSounds, setUploadedSounds] = useState<{ [key: number]: UploadedSound }>({});

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playStateRef = useRef<boolean>(false);
  const stepIntervalRef = useRef<any>(null);
  const currentStepRef = useRef<number>(0);
  const currentLoopCountRef = useRef<number>(1);

  // Sync state refs to avoid stale closures in audio loop
  const gridRef = useRef(grid);
  const instrumentsRef = useRef(instruments);
  const uploadedSoundsRef = useRef(uploadedSounds);
  const soundLibraryRef = useRef(soundLibrary);
  const bpmRef = useRef(bpm);
  const maxLoopsRef = useRef(maxLoops);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    instrumentsRef.current = instruments;
  }, [instruments]);

  useEffect(() => {
    uploadedSoundsRef.current = uploadedSounds;
  }, [uploadedSounds]);

  useEffect(() => {
    soundLibraryRef.current = soundLibrary;
  }, [soundLibrary]);

  useEffect(() => {
    maxLoopsRef.current = maxLoops;
  }, [maxLoops]);

  useEffect(() => {
    bpmRef.current = bpm;
    // If running, restart timer to apply new BPM instantly
    if (isPlaying) {
      startStepTimer();
    }
  }, [bpm, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStepTimer();
    };
  }, []);

  // Web Audio initialization
  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    initAudioCtx();
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    playStateRef.current = nextState;

    if (nextState) {
      currentStepRef.current = 0;
      setCurrentStep(0);
      currentLoopCountRef.current = 1;
      setCurrentLoop(1);
      startStepTimer();
    } else {
      stopStepTimer();
    }
  };

  // Step sequencer clock scheduler
  const startStepTimer = () => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
    }

    const intervalMs = (60 / bpmRef.current) * 1000 / 4; // 16th notes (4 steps per beat)
    
    stepIntervalRef.current = setInterval(() => {
      const stepToPlay = currentStepRef.current;
      setCurrentStep(stepToPlay);
      
      // Execute play triggering for active steps
      triggerSeqStep(stepToPlay);

      // Check for loop completions at step 15
      if (stepToPlay === 15) {
        const nextLoopCount = currentLoopCountRef.current + 1;
        
        if (maxLoopsRef.current > 0 && currentLoopCountRef.current >= maxLoopsRef.current) {
          // Loop limit reached! Stop playback.
          setIsPlaying(false);
          playStateRef.current = false;
          stopStepTimer();
          // Reset play indicator to step 0
          currentStepRef.current = 0;
          setCurrentStep(0);
          return;
        } else {
          currentLoopCountRef.current = nextLoopCount;
          setCurrentLoop(nextLoopCount);
        }
      }

      // Advance step
      currentStepRef.current = (stepToPlay + 1) % 16;
    }, intervalMs);
  };

  const stopStepTimer = () => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  };

  // Play custom buffer with a safety limit on length (e.g., 1.5 seconds) and a smooth fade-out to prevent popping
  const playLimitedBuffer = (
    ctx: AudioContext,
    buffer: AudioBuffer,
    playbackRate = 1.0,
    gainValue = 0.7,
    duration = 1.5
  ) => {
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);

      const gainNode = ctx.createGain();
      const now = ctx.currentTime;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.01);
      gainNode.gain.setValueAtTime(gainValue, now + Math.max(0.1, duration - 0.3));
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      source.connect(gainNode);
      gainNode.connect(getCentralGain(ctx));

      source.start(now);
      source.stop(now + duration + 0.1);
    } catch (e) {
      console.error("playLimitedBuffer error:", e);
    }
  };

  // Trigger sound synthesis or buffer play for a step
  const triggerSeqStep = (step: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    // Check all 24 solar terms rows
    for (let termId = 1; termId <= 24; termId++) {
      const isCellActive = gridRef.current[termId][step];
      if (isCellActive) {
        const details = TERM_AUDIO_MAP[termId];
        const selectedSource = instrumentsRef.current[termId] || details.inst;
        const targetFreq = getRowFrequency(termId, details.freq);

        // 1. Play from Sound Library if it starts with 'lib-'
        if (selectedSource.startsWith('lib-')) {
          const libId = selectedSource;
          const libItem = soundLibraryRef.current.find(item => item.id === libId);

          if (libItem) {
            if (libItem.preferModeling) {
              if (libItem.buffer) {
                // High-fidelity Hybrid modeling (guaranteed playback & maximum authentic timbre matching!)
                playHybridModelingSynth(ctx, targetFreq, libItem.buffer, libItem.pluckRate, libItem.harmonicFullness, libItem.decayRate);
              } else {
                playProceduralSynth(ctx, targetFreq, libItem.modeledInst || 'pipa', libItem.pluckRate, libItem.harmonicFullness, libItem.decayRate);
              }
            } else if (libItem.buffer) {
              // Custom uploaded pitched audio buffer playback with strict safety duration limit!
              const relativePitchRate = targetFreq / 261.63;
              playLimitedBuffer(ctx, libItem.buffer, relativePitchRate, 0.7, 1.5);
            } else if (libItem.type === 'modeled' || libItem.modeledInst) {
              // Fallback custom modeled synthesizer playback
              playProceduralSynth(ctx, targetFreq, libItem.modeledInst || 'pipa', libItem.pluckRate, libItem.harmonicFullness, libItem.decayRate);
            }
          }
        } 
        // 2. Play from uploaded local row overrides (Legacy fallback)
        else if (selectedSource === 'uploaded') {
          const customSound = uploadedSoundsRef.current[termId];
          if (customSound && customSound.buffer) {
            const relativePitchRate = targetFreq / 261.63;
            playLimitedBuffer(ctx, customSound.buffer, relativePitchRate, 0.7, 1.5);
          }
        } 
        // 3. Play procedurally synthesised traditional instrument
        else {
          playProceduralSynth(ctx, targetFreq, selectedSource);
        }

        // Send visual pulse back to Astrolabe/Map
        if (onStepTrigger) {
          onStepTrigger(termId);
        }
      }
    }
  };

  const systemPipaBufferRef = useRef<AudioBuffer | null>(null);

  const getSystemPipaBuffer = (ctx: BaseAudioContext) => {
    if (!systemPipaBufferRef.current) {
      systemPipaBufferRef.current = generateDemoPipaBuffer(ctx);
    }
    return systemPipaBufferRef.current;
  };

  // High-fidelity Hybrid physical modeling & spectral resynthesis engine
  const playHybridModelingSynth = (
    ctx: AudioContext,
    freq: number,
    buffer: AudioBuffer | null,
    pluckRate = 0.9,
    harmonicFullness = 0.6,
    decayRate = 1.0
  ) => {
    if (!buffer) return;
    try {
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Pitched rate based on C4 reference (261.63Hz)
      const relativePitchRate = freq / 261.63;
      source.playbackRate.setValueAtTime(relativePitchRate, now);

      // Acoustic resonant peaking/bandpass filters tuned precisely to the target freq
      const filter = ctx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(freq, now);
      filter.Q.setValueAtTime(3.0 + (harmonicFullness * 15.0), now); 
      filter.gain.setValueAtTime(15.0 * harmonicFullness, now);

      // Amplitude attack/decay envelope matching modeling dials
      const gainNode = ctx.createGain();
      const attack = 0.001 + (0.05 * (1.0 - pluckRate));
      const decay = 0.3 + (2.5 * decayRate);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.85, now + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + decay);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(getCentralGain(ctx));

      source.start(now);
      source.stop(now + decay + 0.1);
    } catch (e) {
      console.error("playHybridModelingSynth error:", e);
    }
  };

  // High-fidelity physical modeling synthesizer with support for custom timbre factors
  const playProceduralSynth = (
    ctx: AudioContext, 
    freq: number, 
    inst: string, 
    customPluck = 0.9, 
    customHarmonics = 0.6, 
    customDecay = 1.0
  ) => {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(getCentralGain(ctx));

    // Create reverb/delay for airiness/zen atmosphere
    const delayNode = ctx.createDelay();
    const delayFeedback = ctx.createGain();
    delayNode.delayTime.setValueAtTime(0.24, now);
    delayFeedback.gain.setValueAtTime(0.25, now);
    
    masterGain.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFeedback.connect(getCentralGain(ctx));

    if (inst === 'guqin' || inst === 'guzheng') {
      // Plucked string (Karplus-Strong approximation + resonant body)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now); // First overtone (octave)
      
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, now); // Low resonant body hum

      // Apply physical modeling factors
      const attack = 0.008 * (2.0 - customPluck);
      const decay = 1.8 * customDecay;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.55, now + attack); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay); 

      osc1.connect(gain);
      osc2.connect(gain);
      sub.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      sub.start(now);
      
      osc1.stop(now + decay + 0.2);
      osc2.stop(now + decay + 0.2);
      sub.stop(now + decay + 0.2);

    } else if (inst === 'pipa') {
      // Direct high-fidelity modeling and physical resonance of classical Pipa
      const pipaBuf = getSystemPipaBuffer(ctx);
      playHybridModelingSynth(ctx, freq, pipaBuf, customPluck, customHarmonics, customDecay);

    } else if (inst === 'yangqin') {
      // Classical bright pluck (extremely rapid transient spike + high tension strings resonance)
      const osc = ctx.createOscillator();
      const overtone1 = ctx.createOscillator();
      const overtone2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Distinct yangqin overtones mapping
      overtone1.type = 'sine';
      overtone1.frequency.setValueAtTime(freq * 3.1, now);

      overtone2.type = 'sine';
      overtone2.frequency.setValueAtTime(freq * 5.25, now);

      const attack = 0.003 * (2.0 - customPluck);
      const decay = 0.6 * customDecay;
      const harmonicMix = customHarmonics;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.65, now + attack); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay); 

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(harmonicMix * 0.45, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + (decay * 0.4));

      overtone1.connect(overtoneGain);
      overtone2.connect(overtoneGain);
      overtoneGain.connect(gain);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      overtone1.start(now);
      overtone2.start(now);
      
      osc.stop(now + decay + 0.1);
      overtone1.stop(now + decay + 0.1);
      overtone2.stop(now + decay + 0.1);

    } else if (inst === 'dizi' || inst === 'xiao' || inst === 'suona') {
      // Woodwind flutes: Slow swell attack with air breath vibrato
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Simple breath noise simulator
      const noise = ctx.createOscillator();
      noise.type = 'triangle';
      noise.frequency.setValueAtTime(1200, now);

      osc.type = inst === 'suona' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Pitch LFO for authentic Chinese flute vibrato (5.8Hz classical wave)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.8, now); 
      lfoGain.gain.setValueAtTime(freq * 0.012, now); 
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const attack = 0.09 * (2.0 - customPluck);
      const decay = 1.4 * customDecay;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + attack); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay); 

      osc.connect(gain);
      noise.connect(gain);
      gain.connect(masterGain);

      lfo.start(now);
      osc.start(now);
      noise.start(now);
      
      lfo.stop(now + decay + 0.2);
      osc.stop(now + decay + 0.2);
      noise.stop(now + decay + 0.2);

    } else if (inst === 'bells' || inst === 'chimes') {
      // Bronze bell resonance (Deep sub resonance + complex inharmonic spectral peaks)
      const f1 = ctx.createOscillator();
      const f2 = ctx.createOscillator();
      const f3 = ctx.createOscillator();
      const gain = ctx.createGain();

      f1.type = 'sine';
      f1.frequency.setValueAtTime(freq, now);

      f2.type = 'sine';
      f2.frequency.setValueAtTime(freq * 1.5, now); // Fifth chord harmony

      f3.type = 'sine';
      f3.frequency.setValueAtTime(freq * 2.76, now); // Metallic ring overtone

      const attack = 0.015 * (2.0 - customPluck);
      const decay = 2.4 * customDecay;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.45, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay); 

      f1.connect(gain);
      f2.connect(gain);
      f3.connect(gain);
      gain.connect(masterGain);

      f1.start(now);
      f2.start(now);
      f3.start(now);
      
      f1.stop(now + decay + 0.2);
      f2.stop(now + decay + 0.2);
      f3.stop(now + decay + 0.2);

    } else if (inst === 'drums') {
      // Earth-thunder drum (Pitch sweep drop for dynamic drumskin simulation)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.6, now); 
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.15); // dramatic pitch drop for bass drum impact

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.85, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.5);

    } else if (inst === 'xun') {
      // Ancient hollow clay vessel flute (low, mystical, earthy)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.8, now); 

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 1.8);
    } else if (inst === 'piano') {
      // High-quality warm physical modeling classical piano synthesizer
      const fundamental = ctx.createOscillator();
      const overtone1 = ctx.createOscillator(); // octave
      const overtone2 = ctx.createOscillator(); // fifth
      const overtone3 = ctx.createOscillator(); // double octave
      const overtone4 = ctx.createOscillator(); // double octave + third
      
      const filter = ctx.createBiquadFilter();

      fundamental.type = 'sine';
      fundamental.frequency.setValueAtTime(freq, now);

      overtone1.type = 'sine';
      overtone1.frequency.setValueAtTime(freq * 2, now);

      overtone2.type = 'triangle'; // triangle wave adds warm odd-harmonics
      overtone2.frequency.setValueAtTime(freq * 3, now);

      overtone3.type = 'sine';
      overtone3.frequency.setValueAtTime(freq * 4, now);

      overtone4.type = 'sine';
      overtone4.frequency.setValueAtTime(freq * 5, now);

      // Separate decay gains to simulate authentic string decays (higher harmonics decay faster)
      const gFund = ctx.createGain();
      const gOver1 = ctx.createGain();
      const gOver2 = ctx.createGain();
      const gOver3 = ctx.createGain();
      const gOver4 = ctx.createGain();

      const attack = 0.003 * (2.0 - customPluck);
      const decay = 2.4 * customDecay;

      fundamental.connect(gFund);
      overtone1.connect(gOver1);
      overtone2.connect(gOver2);
      overtone3.connect(gOver3);
      overtone4.connect(gOver4);

      gFund.connect(filter);
      gOver1.connect(filter);
      gOver2.connect(filter);
      gOver3.connect(filter);
      gOver4.connect(filter);

      gFund.gain.setValueAtTime(0, now);
      gFund.gain.linearRampToValueAtTime(0.55, now + attack);
      gFund.gain.exponentialRampToValueAtTime(0.001, now + decay);

      gOver1.gain.setValueAtTime(0, now);
      gOver1.gain.linearRampToValueAtTime(0.28, now + attack);
      gOver1.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.7);

      gOver2.gain.setValueAtTime(0, now);
      gOver2.gain.linearRampToValueAtTime(0.12, now + attack);
      gOver2.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.45);

      gOver3.gain.setValueAtTime(0, now);
      gOver3.gain.linearRampToValueAtTime(0.06, now + attack);
      gOver3.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.3);

      gOver4.gain.setValueAtTime(0, now);
      gOver4.gain.linearRampToValueAtTime(0.03, now + attack);
      gOver4.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.18);

      // Short hammer strike physical impact sound (pitched noise thump)
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = 'triangle';
      noise.frequency.setValueAtTime(140, now);
      noise.frequency.exponentialRampToValueAtTime(30, now + 0.025);

      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      
      noise.connect(noiseGain);
      noiseGain.connect(filter);

      // Lowpass wooden soundboard resonance filter sweep (shaves off cold synthetic high-end)
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.35);

      filter.connect(masterGain);

      fundamental.start(now);
      overtone1.start(now);
      overtone2.start(now);
      overtone3.start(now);
      overtone4.start(now);
      noise.start(now);

      fundamental.stop(now + decay + 0.2);
      overtone1.stop(now + decay + 0.2);
      overtone2.stop(now + decay + 0.2);
      overtone3.stop(now + decay + 0.2);
      overtone4.stop(now + decay + 0.2);
      noise.stop(now + decay + 0.2);

    } else if (inst === 'sine') {
      // Pure mathematical sine wave with a clean decay envelope
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const attack = 0.01 * (2.0 - customPluck);
      const decay = 1.2 * customDecay;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.6, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + decay + 0.2);

    } else if (inst === 'triangle') {
      // Bright geometric triangle wave with smooth attack/decay
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const attack = 0.01 * (2.0 - customPluck);
      const decay = 1.2 * customDecay;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + decay + 0.2);
    }
  };

  // Preview / pre-listening to row's audio source
  const playRowPreview = (termId: number) => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const details = TERM_AUDIO_MAP[termId];
    const selectedSource = instruments[termId] || details.inst;
    const targetFreq = getRowFrequency(termId, details.freq, true);

    if (selectedSource.startsWith('lib-')) {
      const libItem = soundLibrary.find(item => item.id === selectedSource);
      if (libItem) {
        if (libItem.preferModeling) {
          if (libItem.buffer) {
            playHybridModelingSynth(ctx, targetFreq, libItem.buffer, libItem.pluckRate, libItem.harmonicFullness, libItem.decayRate);
          } else {
            playProceduralSynth(ctx, targetFreq, libItem.modeledInst || 'pipa', libItem.pluckRate, libItem.harmonicFullness, libItem.decayRate);
          }
        } else if (libItem.buffer) {
          playLimitedBuffer(ctx, libItem.buffer, targetFreq / 261.63, 0.7, 1.5);
        } else if (libItem.type === 'modeled' || libItem.modeledInst) {
          playProceduralSynth(ctx, targetFreq, libItem.modeledInst || 'pipa', libItem.pluckRate, libItem.harmonicFullness, libItem.decayRate);
        }
      }
    } else if (selectedSource === 'uploaded') {
      const customSound = uploadedSounds[termId];
      if (customSound && customSound.buffer) {
        playLimitedBuffer(ctx, customSound.buffer, targetFreq / 261.63, 0.7, 1.5);
      }
    } else {
      playProceduralSynth(ctx, targetFreq, selectedSource);
    }
  };

  // Handle sequencer grid cell click
  const handleCellClick = (termId: number, stepIndex: number) => {
    initAudioCtx();
    const newGrid = { ...grid };
    newGrid[termId] = [...newGrid[termId]];
    newGrid[termId][stepIndex] = !newGrid[termId][stepIndex];
    setGrid(newGrid);

    // CRITICAL REQ: 点击方框时，无论开启还是关闭，都自动触发该行音色的“即时试听/预听音频声音”
    playRowPreview(termId);
  };

  // Upload sound triggers the beautiful "Sound Blindbox Sharing & Publishing" popup modal
  const handleSoundUpload = async (termId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    initAudioCtx();
    const file = e.target.files?.[0];
    if (!file || !audioCtxRef.current) return;

    // Load file and store locally
    try {
      const arrayBuffer = await file.arrayBuffer();
      tempArrayBufferRef.current = arrayBuffer;
      audioCtxRef.current.decodeAudioData(arrayBuffer.slice(0), (decodedBuffer) => {
        setTempBuffer(decodedBuffer);
        setTempFileName(file.name);
        // Auto default the sound name
        const cleanName = file.name.replace(/\.[^/.]+$/, "").substring(0, 20);
        setSoundName(cleanName || '自制声音盲盒');
        setTargetLoadTermId(termId);
        
        // Open the beautiful simple upload/sharing modal!
        setShowAnalyzer(true);
      }, (err) => {
        console.error("Audio decode error:", err);
        alert("音频解码失败。请上传标准的 .wav, .mp3 或 .ogg 录音文件！");
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Instantly publish the original custom uploaded audio buffer to the interactive platform
  const handlePublishSound = () => {
    if (!tempBuffer) return;

    // Play confirmation chime of the raw uploaded audio at original pitch
    if (audioCtxRef.current) {
      playLimitedBuffer(audioCtxRef.current, tempBuffer, 1.0, 0.7, 1.5);
    }

    // Generate unique ID for this shared item
    const uniqueId = `lib-custom-${Date.now()}`;
    const newLibraryItem: SoundLibraryItem = {
      id: uniqueId,
      name: soundName.trim() || tempFileName || '我的盲盒声音',
      creator: creatorName.trim() || '匿名旅人',
      fileName: tempFileName,
      buffer: tempBuffer,
      type: 'upload',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      pluckRate: 0.7,
      harmonicFullness: 0.5,
      decayRate: 1.2,
      preferModeling: false, // 100% original raw audio play-back
    };

    setSoundLibrary(prev => [newLibraryItem, ...prev]);

    // Save to IndexedDB!
    if (tempArrayBufferRef.current) {
      saveSoundToDB({
        id: uniqueId,
        name: newLibraryItem.name,
        creator: newLibraryItem.creator,
        fileName: newLibraryItem.fileName,
        arrayBuffer: tempArrayBufferRef.current.slice(0),
        timestamp: newLibraryItem.timestamp || '',
        pluckRate: 0.7,
        harmonicFullness: 0.5,
        decayRate: 1.2,
        type: 'upload',
        preferModeling: false,
      }).catch(err => console.error("Failed to save custom sound to DB:", err));
    }

    // Auto-assign this sound to the targeted solar term row!
    setInstruments(prev => ({
      ...prev,
      [targetLoadTermId]: uniqueId
    }));

    // Also save in row-specific backup (for legacy support)
    setUploadedSounds(prev => ({
      ...prev,
      [targetLoadTermId]: {
        fileName: tempFileName,
        buffer: tempBuffer
      }
    }));

    setShowAnalyzer(false);
  };

  // Load a sound from the Audio Library onto a target Solar Term
  const loadSoundToTerm = (libId: string, termId: number) => {
    setInstruments(prev => ({
      ...prev,
      [termId]: libId
    }));
    // Play sound preview so the user knows it loaded correctly
    playRowPreview(termId);
  };

  // Delete a sound from the Audio Library permanently
  const deleteLibrarySound = async (libId: string) => {
    // 1. Remove from state list
    if (libId.startsWith('lib-pre-')) {
      // Append to persistent deleted preset list
      setDeletedPresets(prev => [...prev, libId]);
      
      // Play a quick paper-crumpling style sound
      if (audioCtxRef.current) {
        initAudioCtx();
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;
        const noise = ctx.createOscillator();
        const gainNode = ctx.createGain();
        noise.type = 'triangle';
        noise.frequency.setValueAtTime(150, now);
        noise.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noise.connect(gainNode);
        gainNode.connect(getCentralGain(ctx));
        noise.start(now);
        noise.stop(now + 0.2);
      }
    } else {
      setSoundLibrary(prev => prev.filter(item => item.id !== libId));
      
      // 2. Remove from IndexedDB if it's custom
      if (libId.startsWith('lib-custom-')) {
        try {
          await deleteSoundFromDB(libId);
        } catch (err) {
          console.error("Failed to delete custom sound from DB:", err);
        }
      }
    }

    // 3. Reset any row instruments that were using this deleted sound to their default preset
    setInstruments(prev => {
      const updated = { ...prev };
      let changed = false;
      for (const tId in updated) {
        const rowTermId = Number(tId);
        if (updated[rowTermId] === libId) {
          updated[rowTermId] = TERM_AUDIO_MAP[rowTermId].inst;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  };

  // Start recording the mix performance in real-time
  const startAudioRecording = () => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const centralGain = getCentralGain(ctx);

    // Create recording destination if not present
    if (!recorderDestRef.current) {
      recorderDestRef.current = ctx.createMediaStreamDestination();
      centralGain.connect(recorderDestRef.current);
    }

    recordedChunksRef.current = [];
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(recorderDestRef.current.stream);
    } catch (e) {
      console.error("MediaRecorder creation failed:", e);
      alert("您的浏览器暂不支持录音功能。");
      return;
    }
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `时序雅乐_创作录音_${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingSeconds(0);

    // Restart sequence playback from step 0 for clean recording
    setIsPlaying(true);
    playStateRef.current = true;
    currentStepRef.current = 0;
    setCurrentStep(0);
    currentLoopCountRef.current = 1;
    setCurrentLoop(1);
    startStepTimer();

    recordTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  // Stop recording and trigger download
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    // Also disconnect recorder Dest to release resources
    if (recorderDestRef.current && centralGainRef.current) {
      try {
        centralGainRef.current.disconnect(recorderDestRef.current);
      } catch (e) {
        console.error(e);
      }
      recorderDestRef.current = null;
    }
    setIsPlaying(false);
    playStateRef.current = false;
    stopStepTimer();
  };

  // Export current sequence project to JSON
  const handleExportProject = () => {
    const projectData = {
      version: '1.0',
      grid,
      instruments,
      bpm,
      maxLoops,
      timestamp: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `时序雅乐_工程_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON project
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed) {
          if (parsed.grid) {
            setGrid(parsed.grid);
          }
          if (parsed.instruments) {
            setInstruments(parsed.instruments);
          }
          if (parsed.bpm) {
            setBpm(parsed.bpm);
          }
          if (parsed.maxLoops !== undefined) {
            setMaxLoops(parsed.maxLoops);
          }
          // Play a happy success chime!
          if (audioCtxRef.current) {
            initAudioCtx();
            const ctx = audioCtxRef.current;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, now + idx * 0.08);
              gain.gain.setValueAtTime(0, now + idx * 0.08);
              gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
              osc.connect(gain);
              gain.connect(getCentralGain(ctx));
              osc.start(now + idx * 0.08);
              osc.stop(now + idx * 0.08 + 0.3);
            });
          }
        }
      } catch (err) {
        alert("工程文件格式有误，导入失败。");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear value
  };

  // Synthetically load a high-fidelity pipa test recording and analyze it
  const handleLoadDemoPipa = () => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Generate beautiful synthetically modeled Pipa raw buffer
    const buffer = generateDemoPipaBuffer(ctx);
    
    // Convert buffer back to a synthetic arrayBuffer for IndexedDB persistence
    const wavArrayBuffer = bufferToWavArrayBuffer(buffer);
    tempArrayBufferRef.current = wavArrayBuffer;
    
    setTempBuffer(buffer);
    setTempFileName('琵琶雅音_金石流沙.wav');
    setSoundName('金石古朴琵琶');
    setCreatorName('Gong');
    setIsModelingPipa(true); // default to physical modeling!
    setTargetLoadTermId(1); // load to 立春 (or current selection target)
    
    setShowAnalyzer(true);
    setAnalysisProgress(0);
    setAnalyzingStatus([]);
  };

  // Toggle Like on a Sound
  const handleToggleLike = (itemId: string) => {
    setSoundLikes(prev => {
      const current = prev[itemId] || { count: 0, liked: false };
      const nextLiked = !current.liked;
      const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);
      
      // Play a lovely high pitched, cheerful chime feedback sound
      if (nextLiked && audioCtxRef.current) {
        initAudioCtx();
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5 chime
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1); // sliding up
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gainNode);
        gainNode.connect(getCentralGain(ctx));
        osc.start(now);
        osc.stop(now + 0.3);
      }

      return {
        ...prev,
        [itemId]: { count: nextCount, liked: nextLiked }
      };
    });
  };

  // Add Comment to a Sound
  const handleAddComment = (itemId: string) => {
    if (!newCommentText.trim()) return;
    
    const newComment: CommentItem = {
      id: `comment-${Date.now()}`,
      author: userNickname.trim() || '匿名旅人',
      text: newCommentText.trim(),
      timestamp: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setSoundComments(prev => {
      const currentList = prev[itemId] || [];
      return {
        ...prev,
        [itemId]: [...currentList, newComment]
      };
    });

    setNewCommentText('');
    
    // Play a gentle subtle water-droplet-like UI sound as feedback
    if (audioCtxRef.current) {
      initAudioCtx();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gainNode);
      gainNode.connect(getCentralGain(ctx));
      osc.start(now);
      osc.stop(now + 0.2);
    }
  };

  // Restore deleted presets and built-in instruments
  const handleRestoreDefaultPresets = () => {
    setDeletedPresets([]);
    setDeletedInstruments([]);
    // Play a lovely sweeping chime sound!
    if (audioCtxRef.current) {
      initAudioCtx();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gainNode.gain.setValueAtTime(0, now + idx * 0.1);
        gainNode.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
        osc.connect(gainNode);
        gainNode.connect(getCentralGain(ctx));
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.35);
      });
    }
  };

  // Toggle playback mode between sample player and physical synthesis modeling
  const togglePlayMode = async (itemId: string, preferModeling: boolean) => {
    setSoundLibrary(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, preferModeling };
      }
      return item;
    }));

    // Persist this change to database as well
    try {
      const savedSounds = await getAllSoundsFromDB();
      const sound = savedSounds.find(s => s.id === itemId);
      if (sound) {
        sound.preferModeling = preferModeling;
        await saveSoundToDB(sound);
      }
    } catch (err) {
      console.error("Failed to update play mode in DB:", err);
    }
  };

  // Reset or delete a row-specific custom uploaded sound, returning to default traditional instrument
  const handleResetRowSound = (termId: number) => {
    // Reset instrument selection back to default
    setInstruments(prev => {
      const copy = { ...prev };
      copy[termId] = TERM_AUDIO_MAP[termId].inst;
      return copy;
    });
    // Clear the uploaded custom sound buffer for this specific row
    setUploadedSounds(prev => {
      const copy = { ...prev };
      delete copy[termId];
      return copy;
    });
  };

  // Delete standard instruments or library sounds directly from the row dropdown!
  const handleDropdownDelete = (termId: number, instToDelete: string) => {
    if (instToDelete.startsWith('lib-')) {
      deleteLibrarySound(instToDelete);
    } else {
      // It's a built-in instrument
      setDeletedInstruments(prev => {
        if (!prev.includes(instToDelete)) {
          return [...prev, instToDelete];
        }
        return prev;
      });

      // Reset any row instruments using this deleted built-in instrument to a valid default
      setInstruments(prev => {
        const updated = { ...prev };
        const remaining = ALL_BUILTIN_INSTRUMENTS.filter(i => i.value !== instToDelete && !deletedInstruments.includes(i.value));
        const fallback = remaining[0]?.value || 'guqin';

        let changed = false;
        for (const tId in updated) {
          if (updated[tId] === instToDelete) {
            updated[tId] = fallback;
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }
  };

  // Change Instrument Select
  const handleInstrumentChange = (termId: number, val: string) => {
    setInstruments(prev => ({
      ...prev,
      [termId]: val
    }));
    // Instantly preview selected sound
    setTimeout(() => {
      playRowPreview(termId);
    }, 50);
  };

  // Clear entire sequencer grid
  const handleClearGrid = () => {
    const clearedGrid: { [key: number]: boolean[] } = {};
    for (let i = 1; i <= 24; i++) {
      clearedGrid[i] = Array(16).fill(false);
    }
    setGrid(clearedGrid);
  };

  // Randomize classical pentatonic pattern
  const handleRandomizePattern = () => {
    const randomized: { [key: number]: boolean[] } = {};
    for (let i = 1; i <= 24; i++) {
      randomized[i] = Array(16).fill(false);
    }

    const activeSeasons = Object.keys(collapsed).filter(k => !collapsed[k]);
    if (activeSeasons.length === 0) activeSeasons.push('spring'); 

    activeSeasons.forEach(seasonId => {
      const config = SEASONAL_GROUPS.find(g => g.id === seasonId);
      if (!config) return;

      config.termIds.forEach((termId, index) => {
        const probability = index === 0 || index === 3 ? 0.22 : 0.12;
        for (let step = 0; step < 16; step++) {
          const isCoreBeat = step % 4 === 0;
          const coinFlip = Math.random() < (isCoreBeat ? probability * 1.8 : probability);
          if (coinFlip) {
            randomized[termId][step] = true;
          }
        }
      });
    });

    setGrid(randomized);
  };

  // Load cohesive Classical Preset Patterns
  const handleLoadPresetPattern = (presetType: string) => {
    const newGrid: { [key: number]: boolean[] } = {};
    for (let i = 1; i <= 24; i++) {
      newGrid[i] = Array(16).fill(false);
    }

    if (presetType === 'spring') {
      newGrid[1][0] = true;  // 立春
      newGrid[1][8] = true;
      newGrid[2][4] = true;  // 雨水
      newGrid[2][12] = true;
      newGrid[3][2] = true;  // 惊蛰
      newGrid[3][10] = true;
      newGrid[4][6] = true;  // 春分
      newGrid[4][14] = true;
      newGrid[5][3] = true;  // 清明
      newGrid[6][11] = true; // 谷雨
      setCollapsed({ spring: false, summer: true, autumn: true, winter: true });
    } else if (presetType === 'summer') {
      newGrid[7][0] = true;  // 立夏
      newGrid[7][6] = true;
      newGrid[7][12] = true;
      newGrid[8][2] = true;  // 小满
      newGrid[8][10] = true;
      newGrid[10][4] = true; // 夏至
      newGrid[10][14] = true;
      newGrid[11][8] = true; // 小暑
      setCollapsed({ spring: true, summer: false, autumn: true, winter: true });
    } else if (presetType === 'autumn') {
      newGrid[13][0] = true;  // 立秋
      newGrid[13][8] = true;
      newGrid[14][4] = true;  // 处暑
      newGrid[14][12] = true;
      newGrid[16][2] = true;  // 秋分
      newGrid[16][10] = true;
      newGrid[17][6] = true;  // 寒露
      newGrid[18][14] = true; // 霜降
      setCollapsed({ spring: true, summer: true, autumn: false, winter: true });
    } else if (presetType === 'winter') {
      newGrid[19][0] = true;  // 立冬
      newGrid[22][4] = true;  // 冬至
      newGrid[22][12] = true;
      newGrid[21][2] = true;  // 大雪
      newGrid[21][10] = true;
      newGrid[24][8] = true;  // 大寒
      setCollapsed({ spring: true, summer: true, autumn: true, winter: false });
    }

    setGrid(newGrid);
  };

  const toggleCollapse = (seasonId: string) => {
    setCollapsed(prev => ({
      ...prev,
      [seasonId]: !prev[seasonId]
    }));
  };

  // Preview play a saved sound in the library
  const previewLibrarySound = (item: SoundLibraryItem) => {
    initAudioCtx();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    if (item.preferModeling) {
      if (item.buffer) {
        playHybridModelingSynth(ctx, 440, item.buffer, item.pluckRate, item.harmonicFullness, item.decayRate);
      } else {
        playProceduralSynth(ctx, 440, item.modeledInst || 'pipa', item.pluckRate, item.harmonicFullness, item.decayRate);
      }
    } else if (item.buffer) {
      playLimitedBuffer(ctx, item.buffer, 1.0, 0.7, 1.5);
    } else if (item.type === 'modeled' || item.modeledInst) {
      // preview modeled preset at frequency A4 (440Hz)
      playProceduralSynth(ctx, 440, item.modeledInst || 'guqin', item.pluckRate, item.harmonicFullness, item.decayRate);
    }
  };

  return (
    <div className="bg-[#faf6eb]/90 border border-[#d6cebf] rounded-2xl p-4 md:p-5 shadow-xl relative overflow-hidden flex flex-col gap-4" id="sequencer-main-panel">
      {/* Background starlight gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(140,28,28,0.02)_0%,transparent_60%)] pointer-events-none" />

      {/* Header and Brand */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#d6cebf] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#2d4a22]/10 border border-[#2d4a22]/30 rounded-xl animate-spin-slow">
            <Music className="w-4.5 h-4.5 text-[#2d4a22]" />
          </div>
          <div>
            <h3 className="text-base font-bold font-serif text-[#2d4a22] tracking-wider flex items-center gap-2">
              <span>时序回响·自定义演奏台</span>
            </h3>
            <p className="text-[10px] text-stone-700 font-serif leading-relaxed mt-0.5 font-medium">
              每个节气即是一个独立音色库。您可以点击格子随时试听，上传并分析您的专属声音（如琵琶弦乐），生成无限时序乐章。
            </p>
          </div>
        </div>

      </div>

      {/* Main interactive grid & sidebar container */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        
        {/* Left Side: Sequencer Matrix Layout (Col Span 9) */}
        <div className="xl:col-span-9 flex flex-col gap-4 w-full overflow-hidden">
          
          {/* Playback Settings Panel */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#fcfaf2] border border-[#d6cebf] rounded-xl p-4 shadow-sm">
            {/* Play & BPM Controls */}
            <div className="flex items-center flex-wrap gap-4">
              <button
                onClick={handleTogglePlay}
                id="play-sequence-trigger-btn"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-serif font-bold text-xs tracking-wider transition-all duration-300 ${
                  isPlaying
                    ? 'bg-[#8c1c1c] text-white hover:bg-red-800 shadow shadow-[#8c1c1c]/25'
                    : 'bg-[#2d4a22] text-white hover:bg-emerald-800 shadow shadow-[#2d4a22]/25'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>停止演奏</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    <span>开始演奏</span>
                  </>
                )}
              </button>

              {/* BPM Slider */}
              <div className="flex items-center gap-3 px-3.5 py-1 bg-[#faf6eb] border border-[#d6cebf] rounded-xl">
                <span className="text-[11px] text-stone-600 font-serif font-medium">演奏步频 (BPM)</span>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-20 accent-[#8c1c1c] cursor-pointer h-1"
                  id="bpm-range-slider"
                />
                <span className="text-xs font-mono font-bold text-stone-800 min-w-[28px] text-center">{bpm}</span>
              </div>

              {/* Customizable Loop Count Select */}
              <div className="flex items-center gap-2.5 px-3.5 py-1 bg-[#faf6eb] border border-[#d6cebf] rounded-xl">
                <span className="text-[11px] text-stone-600 font-serif font-medium" title="达到次数后自动停止">自定循环次数</span>
                <select
                  value={maxLoops}
                  onChange={(e) => setMaxLoops(Number(e.target.value))}
                  className="bg-[#faf6eb] border border-[#d6cebf]/80 text-[10px] font-serif text-stone-800 rounded px-1.5 py-0.5 outline-none font-bold"
                >
                  <option value="0">∞ 无限循环</option>
                  <option value="1">1 遍终止</option>
                  <option value="2">2 遍终止</option>
                  <option value="4">4 遍终止</option>
                  <option value="8">8 遍终止</option>
                  <option value="16">16 遍终止</option>
                </select>
              </div>
            </div>

            {/* Global Actions Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRandomizePattern}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#8c1c1c]/10 hover:bg-[#8c1c1c]/20 border border-[#8c1c1c]/30 rounded-lg text-[10px] font-serif text-[#8c1c1c] font-bold transition-colors cursor-pointer"
                title="生成随机古风雅乐"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8c1c1c]" />
                <span>随机生成</span>
              </button>
              <button
                onClick={handleClearGrid}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#faf6eb] hover:bg-stone-100 border border-[#d6cebf] rounded-lg text-[10px] font-serif text-stone-700 transition-colors cursor-pointer"
                title="清空全部网格音符"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空网格</span>
              </button>

              <div className="h-4 w-[1px] bg-[#d6cebf] mx-1 hidden sm:block" />

              {/* Record performance button */}
              {isRecording ? (
                <button
                  onClick={stopAudioRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 border border-rose-500 rounded-lg text-[10px] font-serif text-white hover:bg-rose-500 animate-pulse transition-colors font-bold shadow shadow-rose-600/30 cursor-pointer"
                  title="停止并立即保存录制的WebM音频"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>停止录音 ({recordingSeconds}s)</span>
                </button>
              ) : (
                <button
                  onClick={startAudioRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg text-[10px] font-serif text-[#8c1c1c] font-bold transition-colors cursor-pointer"
                  title="录制您的实时雅乐混合演奏输出，录制完成后自动下载"
                >
                  <span className="w-2 h-2 rounded-full bg-[#8c1c1c] animate-pulse" />
                  <span>录音(WebM)</span>
                </button>
              )}

              {/* Project export button */}
              <button
                onClick={handleExportProject}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg text-[10px] font-serif text-blue-800 font-bold transition-colors cursor-pointer"
                title="导出当前的宫商节气演奏乐章为本地工程文件"
              >
                <Download className="w-3.5 h-3.5 text-blue-800" />
                <span>导出工程</span>
              </button>

            </div>
          </div>

          {/* Recording instructions text - compact and clear */}
          <div className="bg-[#fcfaf2] border border-[#d6cebf] rounded-lg p-2 text-[9px] text-stone-600 font-serif leading-relaxed font-medium">
            💡 <b>录音使用方法：</b>点击“录音(WebM)”后，系统将自动从第一拍（Step 1）启动混合乐章演奏并录制。在您点击“停止录音”或“停止演奏”时，系统将自动结束录制并导出标准的古典雅乐 WebM 文件。
          </div>

          {/* 四时曲牌 (Seasonal presets quick loader) */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#fcfaf2] border border-[#d6cebf] rounded-xl">
            <span className="text-[10px] text-stone-700 font-serif font-bold">四时宫商曲牌：</span>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => handleLoadPresetPattern('spring')} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded text-[9px] font-serif text-emerald-700 font-bold transition-colors cursor-pointer">春·草木萌发</button>
              <button onClick={() => handleLoadPresetPattern('summer')} className="px-2.5 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-[9px] font-serif text-rose-700 font-bold transition-colors cursor-pointer">夏·大雨时行</button>
              <button onClick={() => handleLoadPresetPattern('autumn')} className="px-2.5 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded text-[9px] font-serif text-amber-700 font-bold transition-colors cursor-pointer">秋·雷始收声</button>
              <button onClick={() => handleLoadPresetPattern('winter')} className="px-2.5 py-1 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded text-[9px] font-serif text-sky-700 font-bold transition-colors cursor-pointer">冬·万物冬眠</button>
            </div>
          </div>

          {/* Matrix Steps Header */}
          <div className="grid grid-cols-12 gap-4 items-center pl-4 pr-1.5 text-center hidden md:grid select-none">
            <div className="col-span-4 text-left text-[10px] font-serif text-stone-500 font-bold tracking-widest pl-4">
              当前节气声音盲盒源
            </div>
            <div className="col-span-8 grid grid-cols-16 gap-1 text-center">
              {Array.from({ length: 16 }).map((_, stepIdx) => {
                const isCurrent = currentStep === stepIdx && isPlaying;
                return (
                  <div
                    key={`step-num-${stepIdx}`}
                    className={`text-[9px] font-mono font-bold py-1 rounded transition-colors ${
                      isCurrent
                        ? 'bg-[#8c1c1c]/10 text-[#8c1c1c] ring-1 ring-[#8c1c1c]/30 shadow-inner'
                        : 'text-stone-500 font-medium'
                    }`}
                  >
                    {stepIdx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seasonal Collapsible Row List */}
          <div className="flex flex-col gap-4">
            {SEASONAL_GROUPS.map((group) => {
              const isCollapsed = collapsed[group.id];
              return (
                <div key={group.id} className="border border-[#d6cebf] rounded-xl overflow-hidden bg-[#fcfaf2]">
                  {/* Seasonal Collapse Header Bar */}
                  <button
                    onClick={() => toggleCollapse(group.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#faf6eb]/80 border-b border-[#d6cebf] text-left select-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-serif tracking-wider ${group.color}`}>
                        ✦ {group.label}
                      </span>
                      <span className="text-[9px] text-stone-500 font-serif font-medium">
                        (包含 {group.termIds.length} 个音色库)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 font-serif">
                      <span className="text-[10px]">{isCollapsed ? '展开声音库' : '收起声音库'}</span>
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {/* Rows List */}
                  {!isCollapsed && (
                    <div className="p-3 space-y-3">
                      {group.termIds.map((termId) => {
                        const term = SOLAR_TERMS.find((t) => t.id === termId);
                        if (!term) return null;

                        const audioInfo = TERM_AUDIO_MAP[termId];
                        const activeInstrument = instruments[termId] || audioInfo.inst;
                        const hasCustomFile = !!uploadedSounds[termId];
                        const isActiveTermOnMap = activeTermId === termId;

                        return (
                          <div
                            key={termId}
                            id={`seq-row-${termId}`}
                            className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-2 rounded-xl transition-all duration-300 ${
                              isActiveTermOnMap
                                ? 'bg-[#8c1c1c]/5 border border-[#8c1c1c]/30 shadow-sm'
                                : 'bg-[#faf6eb]/40 border border-[#d6cebf]/40 hover:border-[#d6cebf]'
                            }`}
                          >
                            {/* Term Label info */}
                            <div className="lg:col-span-4 flex flex-col md:flex-row md:items-center justify-between gap-3 px-2">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    isActiveTermOnMap
                                      ? 'bg-[#8c1c1c] animate-ping'
                                      : 'bg-stone-400'
                                  }`}
                                />
                                <div>
                                  <span className="text-xs font-serif font-bold text-stone-800">
                                    {term.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#8c1c1c] font-bold ml-1.5">
                                    {audioInfo.note}
                                  </span>
                                  <p className="text-[9px] text-stone-500 font-serif">
                                    {term.dateRange.split(' ')[0]}
                                  </p>
                                </div>
                              </div>

                              {/* Sound source dropdown selector & Upload */}
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={activeInstrument}
                                  onChange={(e) => handleInstrumentChange(termId, e.target.value)}
                                  className="bg-[#faf6eb] border border-[#d6cebf] text-[10px] font-serif text-stone-800 rounded-md px-1 py-0.5 outline-none max-w-[130px] font-bold cursor-pointer"
                                >
                                  {ALL_BUILTIN_INSTRUMENTS.filter(inst => !deletedInstruments.includes(inst.value)).map(inst => (
                                    <option key={inst.value} value={inst.value}>
                                      {inst.label}
                                    </option>
                                  ))}
                                  
                                  {/* Dynamic User Custom sound library lists inside dropdown! */}
                                  {soundLibrary.map(item => (
                                    <option key={`opt-${item.id}`} value={item.id}>
                                      📦 {item.name.substring(0, 10)}... ({item.creator})
                                    </option>
                                  ))}

                                  {hasCustomFile && (
                                    <option value="uploaded">🔊 行自定义音频 (已载)</option>
                                  )}
                                </select>

                                {/* Chinese Ancient Twelve Lulus Tuning Offset Dropdown */}
                                <select
                                  value={rowPitches[termId] || 0}
                                  onChange={(e) => handleRowPitchChange(termId, Number(e.target.value))}
                                  className="bg-[#faf6eb] border border-[#d6cebf] text-[10px] font-serif text-stone-700 rounded-md px-1 py-0.5 outline-none max-w-[75px] font-medium cursor-pointer"
                                  title="选择古音律（十二律）进行音调微调"
                                >
                                  {ANCIENT_PITCHES.map(pitch => (
                                    <option key={pitch.value} value={pitch.value}>
                                      {pitch.label}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleDropdownDelete(termId, activeInstrument)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg transition-all duration-200 cursor-pointer"
                                  title="屏蔽或删除此音色（随时可在右侧点击恢复经典）"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* File Upload Icon */}
                                <label className="cursor-pointer p-1.5 bg-[#faf6eb] hover:bg-[#faf6eb]/80 border border-[#d6cebf] rounded-lg transition-colors flex items-center justify-center relative group">
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => handleSoundUpload(termId, e)}
                                    className="hidden"
                                  />
                                  <Upload
                                    className={`w-3.5 h-3.5 ${
                                      hasCustomFile ? 'text-emerald-700' : 'text-stone-500 hover:text-[#8c1c1c]'
                                    }`}
                                  />
                                  {/* Hover tooltip */}
                                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-stone-900 text-[9px] text-gray-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30">
                                    上传音频进入建模库
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* 16-step grid buttons */}
                            <div className="lg:col-span-8 grid grid-cols-16 gap-0.5 md:gap-1 pr-1">
                              {Array.from({ length: 16 }).map((_, stepIdx) => {
                                const isCellOn = grid[termId][stepIdx];
                                const isCursorHere = currentStep === stepIdx && isPlaying;
                                const triggerLightFlash = isCellOn && isCursorHere && lightEffectsEnabled;

                                return (
                                  <button
                                    key={`cell-${termId}-${stepIdx}`}
                                    onClick={() => handleCellClick(termId, stepIdx)}
                                    className={`aspect-square rounded-md border transition-all duration-100 cursor-pointer relative overflow-hidden ${
                                      isCellOn
                                        ? triggerLightFlash
                                          ? 'bg-[#8c1c1c] border-[#8c1c1c] scale-110 shadow z-10 animate-pulse text-white'
                                          : 'bg-[#8c1c1c] border-[#8c1c1c]/30 text-white shadow-sm'
                                        : isCursorHere
                                          ? 'bg-[#2d4a22]/15 border-[#2d4a22]/40'
                                          : 'bg-white border-[#d6cebf]/60 hover:bg-[#faf6eb] hover:border-[#d6cebf]'
                                    }`}
                                  >
                                    {isCursorHere && !isCellOn && (
                                      <span className="absolute inset-0 bg-[#2d4a22]/5 pointer-events-none" />
                                    )}
                                    {isCellOn && (
                                      <span className="absolute inset-0 bg-white/10 pointer-events-none" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Side: Naming & Custom Sound Library Panel (Col Span 3) */}
        <div className="xl:col-span-3 flex flex-col gap-4 w-full" id="sound-library-container-sidebar">
          
          {/* Audio Library Panel (声音盲盒共享互动平台) - Emerald/Spruce-teal theme */}
          <div className="bg-[#faf6eb] border border-[#d6cebf] rounded-xl p-3 shadow flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#d6cebf]/60 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#2d4a22]" />
                <h4 className="text-[11px] font-bold font-serif text-[#2d4a22] tracking-wider">声音盲盒共享互动平台</h4>
              </div>
              <div className="flex items-center gap-1.5">
                {deletedPresets.length > 0 && (
                  <button
                    onClick={handleRestoreDefaultPresets}
                    className="text-[8px] px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded transition-all flex items-center gap-0.5 cursor-pointer font-bold"
                    title="一键恢复所有被删除 of 系统默认经典音色"
                  >
                    <RotateCcw className="w-2 h-2" />
                    <span>恢复经典</span>
                  </button>
                )}
                <span className="text-[8px] px-1.5 py-0.5 bg-[#2d4a22]/10 text-[#2d4a22] border border-[#2d4a22]/25 rounded-full font-mono font-bold">
                  {visibleSoundLibrary.length} 款
                </span>
              </div>
            </div>

            <p className="text-[9px] text-stone-700 font-serif leading-snug">
              旅人上传的原声音频均在此展示，拥有独特头像及乐评体系。点击<b>试听</b>音频，或将其快捷<b>装配</b>到左侧特定节气！
            </p>

            {/* Target Select for Sidebar Fast Loader - Extremely Compact */}
            <div className="bg-[#fcfaf2] border border-[#d6cebf] p-1.5 rounded-lg flex items-center justify-between gap-1">
              <span className="text-[8px] text-stone-600 font-serif flex-shrink-0">装配目标行:</span>
              <select
                value={targetLoadTermId}
                onChange={(e) => setTargetLoadTermId(Number(e.target.value))}
                className="flex-1 bg-[#faf6eb] border border-[#d6cebf] text-[8px] font-serif text-stone-800 rounded px-1 py-0.5 outline-none cursor-pointer font-bold"
              >
                {SOLAR_TERMS.map(term => (
                  <option key={`load-opt-${term.id}`} value={term.id} className="bg-[#faf6eb] text-stone-800 text-[8px]">
                    {term.name} ({TERM_AUDIO_MAP[term.id].note})
                  </option>
                ))}
              </select>
            </div>

            {/* Sound lists in the library - Highly Compact */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5 scrollbar-thin">
              {visibleSoundLibrary.map((item) => {
                const isPreset = item.id.startsWith('lib-pre-');
                
                // Helper to render beautiful colored circular initials avatar based on character code
                const renderAvatar = (name: string) => {
                  const char = name.trim().charAt(0) || '旅';
                  let hash = 0;
                  for (let i = 0; i < name.length; i++) {
                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  const colors = [
                    'from-emerald-500/25 to-teal-500/35 border-emerald-500/30 text-emerald-700',
                    'from-amber-500/25 to-orange-500/35 border-amber-500/30 text-amber-700',
                    'from-rose-500/25 to-pink-500/35 border-rose-500/30 text-rose-700',
                    'from-indigo-500/25 to-purple-500/35 border-indigo-500/30 text-indigo-700',
                    'from-sky-500/25 to-cyan-500/35 border-sky-500/30 text-sky-700',
                    'from-violet-500/25 to-fuchsia-500/35 border-violet-500/30 text-violet-700',
                  ];
                  const colorClass = colors[Math.abs(hash) % colors.length];
                  return (
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colorClass} border flex items-center justify-center font-bold text-[10px] font-serif shadow-sm shrink-0`}>
                      {char}
                    </div>
                  );
                };

                return (
                  <div 
                    key={item.id} 
                    className="p-2 bg-[#fcfaf2] border border-[#d6cebf] rounded hover:border-[#8c1c1c]/40 hover:shadow-sm transition-all flex flex-col gap-1.5 group/item"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderAvatar(item.creator)}
                        <div className="truncate">
                          <span className="text-[10px] font-bold text-stone-800 block truncate leading-tight group-hover/item:text-[#8c1c1c] transition-colors">
                            {item.name}
                          </span>
                          <span className="text-[8px] text-stone-500 font-serif block mt-0.5">
                            分享者: <span className="text-[#2d4a22]/80 font-bold">{item.creator}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Badge & Delete Button Action on the right side */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`text-[7px] px-1 rounded font-serif font-bold ${
                          item.type === 'upload' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.type === 'upload' ? '自建' : '系统'}
                        </span>

                        <button
                          onClick={() => deleteLibrarySound(item.id)}
                          className="p-0.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-all duration-200 cursor-pointer"
                          title={isPreset ? "隐藏此系统音色" : "从本地平台永久删除此音色"}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata timestamp */}
                    <div className="flex items-center justify-between text-[7px] text-stone-500 font-mono border-t border-[#d6cebf]/50 pt-1">
                      <span>音频格式: Sampler</span>
                      <span className="text-[7px] text-stone-500 font-serif">{item.timestamp}</span>
                    </div>

                    {/* Action buttons (Clean 2-column layout) */}
                    <div className="grid grid-cols-2 gap-1 mt-0.5">
                      <button
                        onClick={() => previewLibrarySound(item)}
                        className="px-1 py-0.5 bg-[#faf6eb] hover:bg-[#faf6eb]/80 border border-[#d6cebf] rounded text-[8px] font-serif text-stone-700 font-bold transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                        title="点击试听此声音"
                      >
                        <Volume2 className="w-2.5 h-2.5 text-stone-700" />
                        <span>试听</span>
                      </button>
                      
                      <button
                        onClick={() => loadSoundToTerm(item.id, targetLoadTermId)}
                        className="px-1 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-[8px] font-serif text-emerald-800 transition-all flex items-center justify-center gap-0.5 font-bold cursor-pointer"
                        title={`快捷装配载入到指定节气行`}
                      >
                        <Plus className="w-2.5 h-2.5 text-emerald-800" />
                        <span>装配</span>
                      </button>
                    </div>

                    {/* Likes & Comments Interactive Bar */}
                    <div className="flex items-center justify-between border-t border-slate-900/40 pt-1 mt-0.5 px-0.5 text-[8px] font-serif select-none">
                      <button
                        onClick={() => handleToggleLike(item.id)}
                        className={`flex items-center gap-1 transition-all hover:scale-105 duration-200 ${
                          soundLikes[item.id]?.liked 
                            ? 'text-rose-500 font-bold' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                        title="点赞支持"
                      >
                        <Heart className={`w-2.5 h-2.5 ${soundLikes[item.id]?.liked ? 'fill-rose-500 text-rose-500 animate-pulse' : ''}`} />
                        <span>{soundLikes[item.id]?.count || 0}</span>
                      </button>

                      <button
                        onClick={() => setExpandedCommentsId(expandedCommentsId === item.id ? null : item.id)}
                        className={`flex items-center gap-1 transition-all duration-200 ${
                          expandedCommentsId === item.id 
                            ? 'text-emerald-400 font-bold' 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                        title="查看/发表评论"
                      >
                        <MessageCircle className="w-2.5 h-2.5 text-gray-500" />
                        <span>评论 ({soundComments[item.id]?.length || 0})</span>
                      </button>
                    </div>

                    {/* Expanded Comments Panel */}
                    {expandedCommentsId === item.id && (
                      <div className="bg-black/50 border border-emerald-950/20 rounded p-1.5 mt-1 flex flex-col gap-1.5 text-[8px] animate-fade-in max-h-[160px] overflow-hidden">
                        {/* Comments List */}
                        <div className="overflow-y-auto space-y-1.5 max-h-[80px] pr-0.5 scrollbar-thin">
                          {(soundComments[item.id] || []).length === 0 ? (
                            <p className="text-gray-600 italic text-center py-1 text-[7px]">暂无评论，写下您的第一条神评吧~</p>
                          ) : (
                            (soundComments[item.id] || []).map(comment => (
                              <div key={comment.id} className="bg-[#031518]/30 border-b border-slate-900/40 pb-1.5 last:border-b-0 flex gap-1 items-start">
                                {renderAvatar(comment.author)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between text-[7px] text-emerald-400/85">
                                    <span className="font-bold">{comment.author}</span>
                                    <span className="text-gray-600 scale-90 origin-right">{comment.timestamp}</span>
                                  </div>
                                  <p className="text-gray-300 font-serif mt-0.5 break-all leading-tight">{comment.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment Input */}
                        <div className="flex gap-1 border-t border-slate-900/60 pt-1.5">
                          <input
                            type="text"
                            value={userNickname}
                            onChange={(e) => setUserNickname(e.target.value.substring(0, 8))}
                            placeholder="昵称"
                            className="w-[45px] bg-slate-950 border border-slate-900 rounded px-1 py-0.5 text-gray-300 text-[7px] outline-none focus:border-emerald-500/40"
                            title="您的署名"
                          />
                          <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value.substring(0, 100))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(item.id);
                            }}
                            placeholder="留下优雅的评注..."
                            className="flex-1 bg-slate-950 border border-slate-900 rounded px-1.5 py-0.5 text-gray-200 text-[8px] outline-none placeholder:text-gray-600 focus:border-emerald-500/40"
                          />
                          <button
                            onClick={() => handleAddComment(item.id)}
                            className="p-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded transition-all flex items-center justify-center"
                          >
                            <Send className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar quick local upload file trigger */}
            <div className="border-t border-emerald-950/20 pt-2">
              <label className="w-full cursor-pointer flex flex-col items-center justify-center py-2 px-3 bg-slate-950/80 border border-dashed border-emerald-950/45 hover:border-emerald-500/50 hover:bg-slate-900 rounded-lg transition-all text-center">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleSoundUpload(targetLoadTermId, e)}
                  className="hidden"
                />
                <div className="flex items-center gap-1.5">
                  <Upload className="w-3 h-3 text-emerald-400 animate-bounce" />
                  <span className="text-[9px] text-gray-300 font-serif">上传音频共享至互动平台</span>
                </div>
              </label>
            </div>
          </div>

          {/* Tips card - Emerald Theme */}
          <div className="bg-emerald-950/10 border border-emerald-950/20 rounded-xl p-2.5 flex gap-2 text-[9px] text-gray-400 font-serif leading-relaxed">
            <Info className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p><b>✨ 提示：雅乐盲盒互动</b></p>
              <p className="mt-0.5 text-gray-500 leading-normal">
                这是一个声音共享工坊！每一位旅人上传的音频均不经过任何失真处理，完整保留原声音色。点击任意原声，可一键装配为任意行节气的发音器，谱写现代与古典碰撞的宫商乐章。
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Acoustic Timbre Modeling Workshop Popup Modal */}
      {showAnalyzer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="timbre-analyzer-studio-modal">
          <div className="bg-[#0b111e] border border-emerald-500/30 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4">
            
            {/* Ambient background glow inside popup */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Title */}
            <div className="flex items-center gap-2 border-b border-emerald-950/25 pb-3">
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-serif text-emerald-400 tracking-wider">
                  🌌 声音盲盒分享发布工坊
                </h4>
                <p className="text-[10px] text-gray-400 font-serif">
                  为您上传的原声音频命名，并署名发布到互动平台！
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-serif font-bold">1. 音色命名 (Sound Title)</label>
                <input
                  type="text"
                  value={soundName}
                  onChange={(e) => setSoundName(e.target.value.substring(0, 30))}
                  placeholder="如: 江南骤雨、自制乐器原声"
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-serif text-emerald-400 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-serif font-bold">2. 您的署名 (Your Nickname)</label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value.substring(0, 15))}
                  placeholder="如: Gong"
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-serif text-emerald-400 outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[9px] text-gray-300 font-serif font-bold flex items-center gap-1 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> 100% 高保真原音采样
                </span>
                <span className="text-[8px] text-gray-400 font-serif leading-relaxed">
                  系统会自动提取和载入您上传的原声文件，保留全部音色细节、频率与力度。
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-900">
              <button
                onClick={() => setShowAnalyzer(false)}
                className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 rounded-lg text-xs font-serif text-gray-400 hover:text-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublishSound}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs font-serif transition-colors flex items-center gap-1"
              >
                <span>🚀 确认发布并装配</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
});

export default SoundBoxSequencer;
