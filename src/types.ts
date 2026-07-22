/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SolarTerm {
  id: number;
  name: string;
  pinyin: string;
  english: string;
  season: Season;
  longitude: number; // Solar longitude in degrees
  dateRange: string; // Typical Gregorian calendar dates
  meaning: string;
  threePhenologies: string[]; // 三候
  poetry: string;
  poetryAuthor: string;
  customs: string[]; // 岁时习俗
  musicNote: string; // Reference pentatonic note for Web Audio feedback
  colorClass: string; // Tailwind color class for borders/glowing effects
  textColor: string; // Tailwind text color class
}

export interface MusicPreset {
  id: string;
  name: string;
  description: string;
  scale: string;
  code: string;
}
