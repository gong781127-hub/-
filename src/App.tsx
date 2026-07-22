/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Compass, Sparkles, Star, ArrowLeft, Sliders, Music, Volume2, BookOpen } from 'lucide-react';
import { SOLAR_TERMS } from './data';
import { SolarTerm } from './types';
import CelestialMap from './components/CelestialMap';
import AlmanacDetails from './components/AlmanacDetails';
import MusicPresets from './components/MusicPresets';
import SoundBoxSequencer from './components/SoundBoxSequencer';

// Import our beautifully generated Chinese ink wash paintings
// @ts-ignore
import homeBg from './assets/images/shixu_home_bg_1784630390661.jpg';
// @ts-ignore
import contentBg from './assets/images/shixu_content_bg_1784630407482.jpg';

export default function App() {
  const [activeView, setActiveView] = useState<'home' | 'astrolabe' | 'sequencer' | 'presets'>('home');
  const [activeTerm, setActiveTerm] = useState<SolarTerm>(SOLAR_TERMS[0]);
  const [lastTriggeredTermId, setLastTriggeredTermId] = useState<number | null>(null);
  const [triggerPulse, setTriggerPulse] = useState<number>(0);

  const handleStepTrigger = useCallback((termId: number) => {
    setLastTriggeredTermId(termId);
    setTriggerPulse(prev => prev + 1);
  }, []);

  // Back to top helper when switching pages
  const navigateToView = (view: 'home' | 'astrolabe' | 'sequencer' | 'presets') => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (activeView === 'home') {
    return (
      <div 
        className="min-h-screen bg-cover bg-center flex flex-col justify-between relative overflow-x-hidden transition-all duration-700"
        style={{ backgroundImage: `url(${homeBg})` }}
      >
        {/* Removed the black overlay entirely to let the water-ink painting be completely revealed! */}

        {/* Poetic constellation dots (made soft sepia for parchment vibe) */}
        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#8c1c1c_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

        {/* Home Header */}
        <header className="relative z-10 py-6 px-4 md:px-8 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8c1c1c]/10 border border-[#8c1c1c]/25 rounded-full">
              <Compass className="w-5 h-5 text-[#8c1c1c] animate-spin-slow" />
            </div>
            <span className="text-xs font-serif tracking-[0.2em] text-stone-900 font-bold">
              时序回响 · 岁时音律
            </span>
          </div>
          <div className="text-[10px] md:text-xs text-[#8c1c1c] font-serif tracking-widest border border-[#8c1c1c]/30 px-3 py-1 bg-[#faf6eb]/90 rounded-full font-bold shadow-sm">
            观天地之行，听四时之声
          </div>
        </header>

        {/* Center Poetry Scroll and Titles */}
        <main className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-16 w-full flex flex-col items-center gap-10 md:gap-14 flex-grow justify-center">
          
          {/* Main Title Banner in Ink Scroll Aesthetic */}
          <div className="text-center space-y-4 max-w-3xl">
            {/* Elegant vermilion stamp design */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#8c1c1c]/10 border border-[#8c1c1c]/30 rounded-full text-xs font-serif text-[#8c1c1c] font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#8c1c1c]" />
              <span>格物致知 · 天人合一</span>
            </div>

            <h1 className="text-4xl md:text-6xl flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-2 select-none">
              <span className="font-brush-title tracking-[0.15em] py-1">
                时序回响
              </span>
              <span className="hidden sm:inline text-[#8c1c1c]/40 font-light text-3xl font-serif">|</span>
              <span className="font-brush-subtitle text-2xl md:text-4xl font-normal tracking-[0.1em] mt-1 sm:mt-0 py-1">
                二十四节气数字声音盲盒
              </span>
            </h1>

            <div className="w-32 h-[1.5px] bg-gradient-to-r from-transparent via-[#8c1c1c]/30 to-transparent mx-auto mt-4" />
          </div>

          {/* Poetic Scroll Box - parchment color with elegant borders */}
          <div className="bg-[#faf6eb]/90 border border-[#d6cebf] rounded-2xl p-6 md:p-8 max-w-2xl text-center shadow-xl relative backdrop-blur-sm">
            {/* Traditional ink corners */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-[#8c1c1c]/60" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-[#8c1c1c]/60" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-[#8c1c1c]/60" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-[#8c1c1c]/60" />

            <h2 className="text-xl md:text-2xl font-bold font-serif text-stone-900 tracking-[0.3em] mb-4">
              时序回响·浑天而行
            </h2>
            <p className="text-sm md:text-base text-stone-800 font-serif leading-loose tracking-wider">
              我国古人仰观苍龙、玄武、白虎、朱雀廿八星宿，俯察草木萌生、候雁来去，总结出了二十四节气。本画卷将这套古典星历地图，与现代
              <span className="text-[#8c1c1c] mx-1.5 font-mono bg-[#8c1c1c]/5 px-2 py-0.5 rounded border border-[#8c1c1c]/20 text-xs md:text-sm font-bold">Strudel Live Coding</span>
              音乐框架相融合。请静神聆听四时更替、斗转星移之律动。
            </p>
          </div>

          {/* Elegant 3-Column Entrance Buttons / Cards (Parchment Paper Scroll aesthetics) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full relative z-20">
            
            {/* Entrance 1 */}
            <button
              onClick={() => navigateToView('astrolabe')}
              className="group text-left bg-[#fcfaf2]/90 hover:bg-[#f5f1df]/95 border border-[#d6ccb6] hover:border-[#8c1c1c]/40 rounded-2xl p-6 transition-all duration-500 shadow-lg hover:shadow-xl relative overflow-hidden cursor-pointer flex flex-col justify-between h-full min-h-[220px]"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#8c1c1c]/2 rounded-full blur-xl group-hover:bg-[#8c1c1c]/5 transition-all duration-500" />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-[#8c1c1c]/10 border border-[#8c1c1c]/20 rounded-xl text-[#8c1c1c] group-hover:scale-105 transition-transform duration-300">
                    <Compass className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-stone-900 group-hover:text-[#8c1c1c] transition-colors duration-300">
                    浑天星历 · 岁时星盘
                  </h3>
                </div>
                <p className="text-xs text-stone-700 font-serif leading-relaxed line-clamp-3">
                  点击星历刻度进行节气切换。观苍星分野，探寻历代农桑风物与四时气候变幻。
                </p>
              </div>
              <div className="mt-5 flex flex-col gap-1 border-t border-stone-300/40 pt-3">
                <span className="text-[10px] font-serif text-stone-500 italic">点击星盘上的节气进行切换</span>
                <div className="flex items-center justify-between text-[11px] font-serif text-[#8c1c1c] font-bold">
                  <span>进入岁时星盘</span>
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300">进入 ➔</span>
                </div>
              </div>
            </button>

            {/* Entrance 2 */}
            <button
              onClick={() => navigateToView('sequencer')}
              className="group text-left bg-[#fcfaf2]/90 hover:bg-[#f5f1df]/95 border border-[#d6ccb6] hover:border-[#2d4a22]/40 rounded-2xl p-6 transition-all duration-500 shadow-lg hover:shadow-xl relative overflow-hidden cursor-pointer flex flex-col justify-between h-full min-h-[220px]"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#2d4a22]/2 rounded-full blur-xl group-hover:bg-[#2d4a22]/5 transition-all duration-500" />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-[#2d4a22]/10 border border-[#2d4a22]/20 rounded-xl text-[#2d4a22] group-hover:scale-105 transition-transform duration-300">
                    <Sliders className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-stone-900 group-hover:text-[#2d4a22] transition-colors duration-300">
                    时序回响 · 自定义演奏台
                  </h3>
                </div>
                <p className="text-xs text-stone-700 font-serif leading-relaxed line-clamp-3">
                  每个节气即是一个独立音色库。您可以点击格子随时试听，上传并分析您的专属声音（如琵琶弦乐），生成无限时序乐章。
                </p>
              </div>
              <div className="mt-5 flex flex-col gap-1 border-t border-stone-300/40 pt-3">
                <span className="text-[10px] font-serif text-stone-500 italic">每个节气即是一个独立音色库。您可以点击格子随时试听，上传并分析您的专属声音（如琵琶弦乐），生成无限时序乐章</span>
                <div className="flex items-center justify-between text-[11px] font-serif text-[#2d4a22] font-bold">
                  <span>进入自定义演奏台</span>
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300">进入 ➔</span>
                </div>
              </div>
            </button>

            {/* Entrance 3 */}
            <button
              onClick={() => navigateToView('presets')}
              className="group text-left bg-[#fcfaf2]/90 hover:bg-[#f5f1df]/95 border border-[#d6ccb6] hover:border-[#1d3557]/40 rounded-2xl p-6 transition-all duration-500 shadow-lg hover:shadow-xl relative overflow-hidden cursor-pointer flex flex-col justify-between h-full min-h-[220px]"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#1d3557]/2 rounded-full blur-xl group-hover:bg-[#1d3557]/5 transition-all duration-500" />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-[#1d3557]/10 border border-[#1d3557]/20 rounded-xl text-[#1d3557] group-hover:scale-105 transition-transform duration-300">
                    <Music className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-stone-900 group-hover:text-[#1d3557] transition-colors duration-300">
                    古风律动 · 算法音乐预设
                  </h3>
                </div>
                <p className="text-xs text-stone-700 font-serif leading-relaxed line-clamp-3">
                  基于 Strudel Live Coding Engine。探索算法与古典旋律的编织，实时渲染极具意境的国风电子乐段。
                </p>
              </div>
              <div className="mt-5 flex flex-col gap-1 border-t border-stone-300/40 pt-3">
                <span className="text-[10px] font-serif text-stone-500 italic">基于 Strudel Live Coding Engine</span>
                <div className="flex items-center justify-between text-[11px] font-serif text-[#1d3557] font-bold">
                  <span>进入算法音乐预设</span>
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300">进入 ➔</span>
                </div>
              </div>
            </button>

          </div>

        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-[#d6cebf]/50 bg-[#faf6eb]/80 py-6 text-center text-[11px] text-stone-600 font-serif tracking-widest">
          <p>© 2026 时序回响 · 二十四节气数字声音盲盒. 保留所有权利。</p>
        </footer>
      </div>
    );
  }

  // Under other states: Renders content sub-pages with second image background
  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col justify-between relative overflow-x-hidden transition-all duration-700"
      style={{ backgroundImage: `url(${contentBg})` }}
    >
      {/* Soft elegant sepia/parchment watercolor wash overlay on second background image */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#faf6eb]/94 via-[#faf6eb]/80 to-[#faf6eb]/94 pointer-events-none" />

      {/* Poetic constellation background dots (soft cinnabar red) */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#8c1c1c_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* Sticky Flowing Navigation Bar (Parchment Paper Scroll styled) */}
      <header className="sticky top-0 z-50 border-b border-[#d6cebf] bg-[#faf6eb]/90 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Current View Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => navigateToView('home')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8c1c1c]/10 hover:bg-[#8c1c1c]/20 border border-[#8c1c1c]/30 hover:border-[#8c1c1c]/50 rounded-xl text-xs font-serif text-[#8c1c1c] font-bold transition-all duration-300 cursor-pointer"
              title="返回主页"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回首页</span>
            </button>
            <div className="h-4 w-[1px] bg-stone-300" />
            <h1 className="text-base font-bold font-serif text-stone-900 tracking-wider flex items-center gap-1.5">
              <span>时序回响</span>
              <span className="text-xs text-[#8c1c1c] font-bold">
                {activeView === 'astrolabe' && '· 浑天星历'}
                {activeView === 'sequencer' && '· 自定义演奏台'}
                {activeView === 'presets' && '· 算法音乐预设'}
              </span>
            </h1>
          </div>

          {/* Fast Navigation Buttons (Ink Scroll Buttons) */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              onClick={() => navigateToView('astrolabe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif tracking-wider font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeView === 'astrolabe'
                  ? 'bg-[#8c1c1c]/10 text-[#8c1c1c] border border-[#8c1c1c]/40 shadow-inner'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>浑天星历·岁时星盘</span>
            </button>

            <button
              onClick={() => navigateToView('sequencer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif tracking-wider font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeView === 'sequencer'
                  ? 'bg-[#2d4a22]/10 text-[#2d4a22] border border-[#2d4a22]/40 shadow-inner'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60 border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>时序回响·自定义演奏台</span>
            </button>

            <button
              onClick={() => navigateToView('presets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif tracking-wider font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeView === 'presets'
                  ? 'bg-[#1d3557]/10 text-[#1d3557] border border-[#1d3557]/40 shadow-inner'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60 border border-transparent'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>古风律动·算法音乐</span>
            </button>
          </div>

          {/* Quick Active Term Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#faf6eb] border border-[#d6cebf] rounded-full text-[11px] font-serif text-stone-800 font-medium">
            <Star className="w-3.5 h-3.5 text-[#8c1c1c] animate-pulse" />
            <span>当前节气：{activeTerm.name}</span>
          </div>

        </div>
      </header>

      {/* Main Content Sections with Water-ink Aesthetics */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 w-full">
        {activeView === 'astrolabe' && (
          <div className="space-y-6 animate-fade-in">
            {/* Section description header */}
            <div className="bg-[#faf6eb]/90 backdrop-blur-sm border border-[#d6cebf] p-4 rounded-xl flex items-center justify-between mb-2 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#8c1c1c]" />
                <span className="text-xs font-serif text-stone-800 font-medium">
                  浑天星历·岁时星盘：点击星历刻度进行节气切换，阅览风土物候习俗
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">ASTROLABE MAP</span>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 flex flex-col h-full justify-center">
                <CelestialMap 
                  activeTerm={activeTerm} 
                  onSelectTerm={setActiveTerm} 
                  lastTriggeredTermId={lastTriggeredTermId}
                  triggerPulse={triggerPulse}
                />
              </div>
              <div className="lg:col-span-5 flex flex-col">
                <AlmanacDetails activeTerm={activeTerm} />
              </div>
            </section>
          </div>
        )}

        {activeView === 'sequencer' && (
          <div className="space-y-6 animate-fade-in">
            {/* Section description header */}
            <div className="bg-[#faf6eb]/90 backdrop-blur-sm border border-[#d6cebf] p-4 rounded-xl flex items-center justify-between mb-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#2d4a22]" />
                <span className="text-xs font-serif text-stone-800 font-medium">
                  时序回响·自定义演奏台：每个节气是独立音色。点击网格触发，或上传声音生成岁时乐章
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">SEQUENCER WORKSTATION</span>
            </div>

            <section id="sound-blindbox-sequencer">
              <SoundBoxSequencer 
                onStepTrigger={handleStepTrigger} 
                activeTermId={activeTerm.id} 
              />
            </section>
          </div>
        )}

        {activeView === 'presets' && (
          <div className="space-y-6 animate-fade-in">
            {/* Section description header */}
            <div className="bg-[#faf6eb]/90 backdrop-blur-sm border border-[#d6cebf] p-4 rounded-xl flex items-center justify-between mb-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#1d3557]" />
                <span className="text-xs font-serif text-stone-800 font-medium">
                  古风律动·算法音乐：基于 Strudel Live Coding Engine 驱动，实现古今韵律无缝交响
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">LIVE CODING PRESETS</span>
            </div>

            <section id="strudel-workspace">
              <MusicPresets />
            </section>
          </div>
        )}
      </main>

      {/* Traditional Footer */}
      <footer className="border-t border-[#d6cebf]/50 bg-[#faf6eb]/80 py-6 text-center text-xs text-stone-600 font-serif tracking-widest mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 时序回响 · 二十四节气数字声音盲盒. 保留所有权利。</p>
          <div className="flex gap-4 text-[11px] text-stone-500">
            <span>观天地之行，听四时之声</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
