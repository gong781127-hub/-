/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Compass, Feather, Flame, Info, Leaf, Snowflake, Sun } from 'lucide-react';
import { SolarTerm } from '../types';

interface AlmanacDetailsProps {
  activeTerm: SolarTerm;
}

const AlmanacDetails = memo(function AlmanacDetails({ activeTerm }: AlmanacDetailsProps) {
  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring': return <Leaf className="w-5 h-5 text-emerald-400" />;
      case 'summer': return <Sun className="w-5 h-5 text-rose-400" />;
      case 'autumn': return <Feather className="w-5 h-5 text-amber-400" />;
      case 'winter': return <Snowflake className="w-5 h-5 text-sky-400" />;
      default: return <Compass className="w-5 h-5 text-amber-500" />;
    }
  };

  const getSeasonLabel = (season: string) => {
    switch (season) {
      case 'spring': return '孟春 / 仲春 / 季春';
      case 'summer': return '孟夏 / 仲夏 / 季夏';
      case 'autumn': return '孟秋 / 仲秋 / 季秋';
      case 'winter': return '孟冬 / 仲冬 / 季冬';
      default: return '';
    }
  };

  return (
    <div className="bg-[#faf6eb]/95 border border-[#d6cebf] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col h-full min-h-[500px]">
      {/* Decorative Traditional Border Corner Elements */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#8c1c1c]/30" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#8c1c1c]/30" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#8c1c1c]/30" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#8c1c1c]/30" />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTerm.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col h-full justify-between gap-6"
        >
          {/* Main Header / Title Block */}
          <div>
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getSeasonIcon(activeTerm.season)}
                  <span className="text-xs font-bold uppercase tracking-widest font-mono text-stone-700">
                    {activeTerm.season.toUpperCase()} · {getSeasonLabel(activeTerm.season)}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold font-serif text-stone-900 tracking-wider flex items-baseline gap-3">
                  {activeTerm.name}
                  <span className="text-xs font-mono font-normal tracking-wide text-stone-500 uppercase">
                    {activeTerm.pinyin}
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-1 font-serif tracking-wide">{activeTerm.english}</p>
              </div>

              {/* Solar Degree Badge */}
              <div className="flex flex-col items-end bg-[#8c1c1c]/5 border border-[#8c1c1c]/20 rounded-xl p-2.5 text-right">
                <span className="text-[10px] text-[#8c1c1c] font-serif font-bold tracking-widest">太阳黄经</span>
                <span className="text-lg font-mono font-bold text-stone-800">{activeTerm.longitude}°</span>
              </div>
            </div>

            {/* Quick Metrics (Date & Season Position) */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="flex items-center gap-2.5 bg-[#fcfaf2]/80 border border-[#d6cebf]/50 rounded-xl p-3">
                <Calendar className="w-4 h-4 text-[#8c1c1c]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-stone-500 font-serif">岁时节候</span>
                  <span className="text-xs font-mono font-bold text-stone-800">{activeTerm.dateRange}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-[#fcfaf2]/80 border border-[#d6cebf]/50 rounded-xl p-3">
                <Compass className="w-4 h-4 text-[#8c1c1c]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-stone-500 font-serif">斗柄指向</span>
                  <span className="text-xs font-serif font-bold text-stone-800">
                    {activeTerm.season === 'spring' && '东方 寓春木'}
                    {activeTerm.season === 'summer' && '南方 寓夏火'}
                    {activeTerm.season === 'autumn' && '西方 寓秋金'}
                    {activeTerm.season === 'winter' && '北方 寓冬水'}
                  </span>
                </div>
              </div>
            </div>

            {/* Meaning Description */}
            <div className="mt-5 bg-[#fcfaf2]/90 border border-[#d6cebf]/60 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#8c1c1c]/80 mt-0.5 flex-shrink-0" />
                <p className="text-xs md:text-[13px] text-stone-800 leading-relaxed font-serif">
                  {activeTerm.meaning}
                </p>
              </div>
            </div>

            {/* Three Phenologies (节气三候) */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-[#8c1c1c] font-serif tracking-widest mb-3 flex items-center gap-1.5">
                <span>✦</span> 节气三候 · 岁时天应
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {activeTerm.threePhenologies.map((phen, idx) => (
                  <div
                    key={`phen-${idx}`}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#fcfaf2] border border-[#d6cebf] text-center hover:border-[#8c1c1c]/40 transition-all duration-300 shadow-sm"
                  >
                    <span className="text-[10px] text-stone-500 font-mono mb-1">{idx + 1}候</span>
                    <span className="text-xs font-bold font-serif text-stone-800 tracking-wide">{phen}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Traditional Customs (岁时习俗) */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-[#8c1c1c] font-serif tracking-widest mb-3 flex items-center gap-1.5">
                <span>✦</span> 岁时民俗 · 传统记趣
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeTerm.customs.map((custom, idx) => (
                  <div
                    key={`custom-${idx}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8c1c1c]/5 border border-[#8c1c1c]/20 text-xs font-serif font-bold text-[#8c1c1c] shadow-sm"
                  >
                    <Flame className="w-3 h-3 text-[#8c1c1c]" />
                    <span>{custom}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Poetry / Verse Block (Always aligned nicely at the bottom) */}
          <div className="mt-6 pt-5 border-t border-[#d6cebf]/50 relative">
            {/* Ink blot ornament watermark */}
            <div className="absolute right-4 bottom-4 text-8xl font-serif text-[#8c1c1c]/5 select-none pointer-events-none">
              {activeTerm.name[0]}
            </div>

            <div className="flex flex-col items-center justify-center bg-[#fcfaf2] border border-[#d6cebf]/60 rounded-xl p-4 text-center shadow-sm">
              <p className="text-sm md:text-base font-bold font-serif text-[#8c1c1c] tracking-widest mb-1 italic">
                “ {activeTerm.poetry} ”
              </p>
              <p className="text-[10px] text-stone-500 font-serif font-medium">
                {activeTerm.poetryAuthor}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default AlmanacDetails;
