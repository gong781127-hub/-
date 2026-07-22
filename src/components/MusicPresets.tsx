/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, memo } from 'react';
import { Copy, Check, Music, RefreshCw, Volume2, HelpCircle, ArrowRight, Download, ExternalLink } from 'lucide-react';
import { MUSIC_PRESETS } from '../data';
import { MusicPreset } from '../types';

const MusicPresets = memo(function MusicPresets() {
  const [activePreset, setActivePreset] = useState<MusicPreset>(MUSIC_PRESETS[0]);
  const [copied, setCopied] = useState(false);
  const [syncNotice, setSyncNotice] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);
  const [exportHtmlNotice, setExportHtmlNotice] = useState(false);
  
  // Create state for the iframe URL, defaulting to the first preset preloaded
  const [iframeUrl, setIframeUrl] = useState(
    `https://strudel.cc/?embed=1&code=${encodeURIComponent(MUSIC_PRESETS[0].code)}`
  );

  const handleSelectPreset = (preset: MusicPreset) => {
    setActivePreset(preset);
    setCopied(false);
    setSyncNotice(false);
    setExportNotice(false);
    setExportHtmlNotice(false);
  };

  const handleCopyCode = async () => {
    try {
      // CRITICAL: We only copy the pure raw code string from the preset.
      // This contains NO markdown delimiters like ```javascript which would break the Strudel parser.
      await navigator.clipboard.writeText(activePreset.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleSyncToIframe = () => {
    // Dynamically update the iframe source URL with the encoded code
    // This allows the user to immediately run the preset without copy-paste!
    const encoded = encodeURIComponent(activePreset.code);
    setIframeUrl(`https://strudel.cc/?embed=1&code=${encoded}`);
    setSyncNotice(true);
    setTimeout(() => setSyncNotice(false), 3000);
  };

  const handleExportCodeFile = () => {
    try {
      const blob = new Blob([activePreset.code], { type: 'application/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activePreset.id}_strudel_preset.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportNotice(true);
      setTimeout(() => setExportNotice(false), 2500);
    } catch (err) {
      console.error('Failed to export code file:', err);
    }
  };

  const handleExportHtmlCard = () => {
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【时序雅乐】${activePreset.name} - 数字化水墨音乐画卷</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #faf6eb;
      color: #1a1b1d;
      font-family: "Noto Serif SC", "Georgia", serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background-image: radial-gradient(circle at top, rgba(140,28,28,0.03) 0%, transparent 80%);
    }
    .container {
      max-width: 800px;
      width: 100%;
      background: #fcfaf2;
      border: 1px solid #d6cebf;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      padding: 30px;
      box-sizing: border-box;
      text-align: center;
    }
    h1 {
      color: #8c1c1c;
      font-size: 28px;
      margin-bottom: 5px;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 14px;
      color: #2d4a22;
      font-weight: bold;
      margin-bottom: 20px;
      letter-spacing: 1px;
    }
    .description {
      font-size: 14px;
      line-height: 1.8;
      color: #4a4a4a;
      margin: 20px 0 30px 0;
      text-align: center;
      padding: 0 10px;
    }
    .player-container {
      border: 1px solid #d6cebf;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
      background: #fff;
    }
    iframe {
      width: 100%;
      height: 420px;
      border: none;
      display: block;
    }
    .code-box {
      background: #1a1b1d;
      color: #81c784;
      padding: 15px;
      border-radius: 8px;
      text-align: left;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-bottom: 20px;
      border: 1px solid #d6cebf;
    }
    .footer {
      font-size: 11px;
      color: #888;
      margin-top: 30px;
      border-top: 1px solid #e8e3d5;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${activePreset.name}</h1>
    <div class="subtitle">【${activePreset.scale}】· 数字水墨交互音乐画卷</div>
    <div class="description">${activePreset.description}</div>
    <div class="player-container">
      <iframe src="https://strudel.cc/?embed=1&code=${encodeURIComponent(activePreset.code)}" allow="autoplay; midi"></iframe>
    </div>
    <div class="code-box">
      <pre style="margin:0; white-space: pre-wrap;">${activePreset.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
    <div class="footer">
      本画卷由《时序雅乐 · 节气星历国风音乐平台》导出生成。基于 Strudel Live Coding 算法引擎。
    </div>
  </div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activePreset.id}_strudel_music_card.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportHtmlNotice(true);
      setTimeout(() => setExportHtmlNotice(false), 2500);
    } catch (err) {
      console.error('Failed to export music card:', err);
    }
  };

  return (
    <div className="bg-[#faf6eb]/90 border border-[#d6cebf] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold font-serif text-[#8c1c1c] tracking-wider flex items-center gap-2">
          <Music className="w-5 h-5 text-[#8c1c1c] animate-pulse" />
          <span>古风律动 · 算法音乐预设</span>
        </h3>
        <span className="text-[10px] text-[#8c1c1c] font-serif px-2 py-0.5 bg-[#8c1c1c]/5 border border-[#8c1c1c]/25 rounded-md font-bold">
          基于 Strudel Live Coding Engine
        </span>
      </div>

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {MUSIC_PRESETS.map((preset) => {
          const isActive = preset.id === activePreset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              id={`preset-btn-${preset.id}`}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-300 relative group overflow-hidden ${
                isActive
                  ? 'bg-[#8c1c1c]/10 border-[#8c1c1c]/40 shadow-inner'
                  : 'bg-[#fcfaf2]/80 border-[#d6cebf]/60 hover:bg-[#fcfaf2] hover:border-[#8c1c1c]/30'
              }`}
            >
              <span className={`text-xs font-bold font-serif tracking-wider ${isActive ? 'text-[#8c1c1c]' : 'text-stone-800'}`}>
                {preset.name}
              </span>
              <span className="text-[9px] font-mono text-stone-500 mt-1 uppercase">
                {preset.scale.split(' ')[0]}
              </span>
              {isActive && (
                <div className="absolute right-1.5 bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#8c1c1c] animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Code Display and Operation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#fcfaf2] border border-[#d6cebf] rounded-xl p-5 shadow-sm">
        {/* Preset Description & Control panel (left) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8c1c1c]" />
              <span className="text-xs font-serif text-[#8c1c1c] font-bold">{activePreset.scale}</span>
            </div>
            <h4 className="text-base font-serif font-bold text-stone-900">{activePreset.name}</h4>
            <p className="text-xs text-stone-700 font-serif leading-relaxed mt-2">
              {activePreset.description}
            </p>
          </div>

          <div className="space-y-2 mt-2">
            {/* Action 1: Copy Pure Code */}
            <button
              onClick={handleCopyCode}
              id="copy-preset-code-btn"
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-serif text-xs font-bold transition-all duration-300 cursor-pointer ${
                copied
                  ? 'bg-emerald-600/10 border border-emerald-500/50 text-emerald-700'
                  : 'bg-[#8c1c1c]/10 hover:bg-[#8c1c1c]/20 border border-[#8c1c1c]/30 text-[#8c1c1c]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>已复制纯净代码！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8c1c1c]" />
                  <span>复制纯净代码 (直接粘贴可用)</span>
                </>
              )}
            </button>

            {/* Action 2: One-click sync load */}
            <button
              onClick={handleSyncToIframe}
              id="sync-preset-code-btn"
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-serif text-xs font-bold transition-all duration-300 cursor-pointer ${
                syncNotice
                  ? 'bg-[#8c1c1c] text-white shadow-md'
                  : 'bg-[#faf6eb] hover:bg-stone-100 border border-[#d6cebf] text-stone-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncNotice ? 'animate-spin' : ''}`} />
              <span>{syncNotice ? '同步载入成功！' : '一键同步载入 (免复制粘贴)'}</span>
            </button>

            {/* Action 3: Export Strudel Code File */}
            <button
              onClick={handleExportCodeFile}
              id="export-preset-code-btn"
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-serif text-xs font-bold transition-all duration-300 cursor-pointer ${
                exportNotice
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#faf6eb] hover:bg-stone-100 border border-[#d6cebf] text-stone-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>{exportNotice ? '已导出JS代码文件！' : '导出音乐代码文件 (.js)'}</span>
            </button>

            {/* Action 3b: Export Interactive HTML Music Card */}
            <button
              onClick={handleExportHtmlCard}
              id="export-preset-html-btn"
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-serif text-xs font-bold transition-all duration-300 cursor-pointer ${
                exportHtmlNotice
                  ? 'bg-[#8c1c1c] text-white shadow-md'
                  : 'bg-[#faf6eb] hover:bg-stone-100 border border-[#d6cebf] text-stone-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-[#8c1c1c]" />
              <span>{exportHtmlNotice ? '已下载数字化音乐画卷！' : '导出交互式网页音乐卡 (.html)'}</span>
            </button>

            {/* Action 4: Open in Strudel Web for Recording/Audio Export */}
            <a
              href={`https://strudel.cc/#code=${encodeURIComponent(activePreset.code)}`}
              target="_blank"
              rel="noopener noreferrer"
              id="open-strudel-web-btn"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-serif text-xs font-bold transition-all duration-300 bg-[#faf6eb] hover:bg-stone-100 border border-[#d6cebf] text-stone-700 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#8c1c1c]" />
              <span>录制并导出高品质音频 (前往官网)</span>
            </a>
          </div>
        </div>

        {/* Live Code Box (right) */}
        <div className="lg:col-span-7 flex flex-col bg-[#1a1b1d] border border-[#d6cebf]/60 rounded-lg p-3 relative group">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
            <span className="text-[10px] font-mono text-stone-400 uppercase">Live Code Preview (Pure JS)</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500/40" />
              <span className="text-[10px] font-serif text-amber-200">已过滤代码块标记</span>
            </div>
          </div>
          <pre className="text-[11px] font-mono text-[#81c784] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[160px] scrollbar-thin select-all">
            {activePreset.code}
          </pre>
          <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">点击代码区可快速全选</span>
          </div>
        </div>
      </div>

      {/* Help Guide Box */}
      <div className="bg-[#fcfaf2] border border-[#d6cebf] rounded-xl p-4 flex gap-3 shadow-sm">
        <HelpCircle className="w-5 h-5 text-[#8c1c1c] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-stone-800 leading-relaxed font-serif">
          <p className="font-bold text-[#8c1c1c] flex items-center gap-1.5">
            <span>使用方法说明（解决代码无法运行问题）：</span>
          </p>
          <ul className="list-decimal list-inside space-y-1 mt-1.5 text-stone-700">
            <li>
              点击上方 <span className="text-[#8c1c1c] font-bold">【复制纯净代码】</span> 按钮（已自动剔除任何 <code>```javascript</code> 格式包裹，保证代码纯洁性）。
            </li>
            <li>
              在下方 <span className="text-[#8c1c1c] font-bold">Strudel 实时画幅</span> 编辑区中，点击激活光标。
            </li>
            <li>
              按键盘 <span className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px] text-stone-800">Ctrl + A</span> (或 Command + A) 全选原代码，再按 <span className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px] text-stone-800">Ctrl + V</span> 覆盖粘贴。
            </li>
            <li>
              按键盘 <span className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px] text-stone-800">Shift + Enter</span> 键（或点击右上角 <span className="text-emerald-700">▶ 播放</span> 按钮）即可开始运行播放！
            </li>
            <li>
              您也可以直接在下方的strudel实时画幅当中撰写代码，生成独一无二的数字音乐。
            </li>
            <li className="text-[#8c1c1c] font-bold flex items-center gap-1 mt-1.5">
              <span>★ 温馨提示：您也可以直接点击【一键同步载入】按钮，页面将为您免除复制步骤，直接在画幅中展示该乐章，点开即弹！</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Embedded Strudel Live IFrame */}
      <div className="border border-[#d6cebf] rounded-2xl overflow-hidden shadow-xl relative bg-[#faf6eb]">
        <div className="bg-[#fcfaf2] px-4 py-3 border-b border-[#d6cebf] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#8c1c1c] animate-pulse" />
            <span className="text-xs font-serif text-stone-800 font-bold">内嵌 Strudel 实时画幅</span>
          </div>
          <span className="text-[10px] font-mono text-stone-500">Live Audio Playground</span>
        </div>
        
        {/* Iframe element */}
        <iframe
          id="strudel-live-iframe"
          key={iframeUrl} // key forces reloading when synchronized url changes
          src={iframeUrl}
          className="w-full h-[380px] bg-transparent"
          title="Strudel live coding player"
          allow="autoplay; midi"
        ></iframe>
      </div>
    </div>
  );
});

export default MusicPresets;
