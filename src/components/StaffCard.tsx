import React, { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { Dices, Maximize2, Minimize2, RotateCcw, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import {
  BeatStepItem,
  CircleKeyInfo,
  resolveStepPitchForKey,
  RhythmPatternDef,
  RHYTHM_PATTERNS,
  TimeSignatureLesson,
} from '../data/rhythmData';

interface StaffCardProps {
  lesson: TimeSignatureLesson;
  activePattern: RhythmPatternDef;
  onSelectPattern: (pattern: RhythmPatternDef) => void;
  steps: BeatStepItem[];
  abcScore: string;
  activeStepIndex: number;
  activeSubNoteIndex: number;
  onSelectStep: (index: number, playAudio?: boolean) => void;
  activeKey: CircleKeyInfo;
  countInRemaining: number;
  onRefreshMixed: () => void;
  swingPercent: number;
}

export const StaffCard: React.FC<StaffCardProps> = ({
  lesson,
  activePattern,
  onSelectPattern,
  steps,
  abcScore,
  activeStepIndex,
  activeSubNoteIndex,
  onSelectStep,
  activeKey,
  countInRemaining,
  onRefreshMixed,
  swingPercent,
}) => {
  const staffContainerRef = useRef<HTMLDivElement>(null);
  const [showAccentHint, setShowAccentHint] = useState(true);
  const [showMnemonic, setShowMnemonic] = useState(true);
  const [compactTwoLine, setCompactTwoLine] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(125);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);

  const currentStep = steps[activeStepIndex] || steps[0];
  const resolvedCurrentPitch = resolveStepPitchForKey(currentStep, activeKey.id);

  // Trigger synchronized visual bloom when zooming or expanding (strictly visual, zero audio triggers)
  const triggerZoomBloom = (nextZoom: number) => {
    const clamped = Math.max(75, Math.min(200, nextZoom));
    setZoomPercent(clamped);
    setIsBlooming(false);
    window.requestAnimationFrame(() => {
      setIsBlooming(true);
    });
  };

  useEffect(() => {
    if (!isBlooming) return;
    const tid = window.setTimeout(() => setIsBlooming(false), 400);
    return () => window.clearTimeout(tid);
  }, [isBlooming]);

  // Render ABCJS score when pattern, meter, key, mixedSeed, or view/zoom options change
  useEffect(() => {
    const container = staffContainerRef.current;
    if (!container) return;

    let finalAbc = abcScore;
    if (!showAccentHint) {
      finalAbc = finalAbc.replace(/"[^"]*"/g, '');
    }

    const zoomFactor = zoomPercent / 125;
    const baseStaffWidth = compactTwoLine ? 680 : 1140;
    const effectiveStaffWidth = Math.round(baseStaffWidth / Math.pow(zoomFactor, 0.65));
    const measuresPerLine = compactTwoLine
      ? Math.max(1, Math.ceil(lesson.barCount / 2))
      : lesson.barCount;

    container.innerHTML = '';
    abcjs.renderAbc(container, finalAbc, {
      responsive: 'resize',
      staffwidth: effectiveStaffWidth,
      format: {
        stretchlast: 1,
      },
      wrap: {
        minSpacing: 1.85,
        maxSpacing: 3.1,
        preferredMeasuresPerLine: measuresPerLine,
      },
      paddingtop: 16,
      paddingbottom: 16,
      paddingleft: 14,
      paddingright: 14,
      add_classes: true,
    });

    const svg = container.querySelector('svg');
    if (!svg) return;

    const noteElements = Array.from(svg.querySelectorAll('.abcjs-note'));
    if (noteElements.length === 0) return;

    // Exact 1-to-1 mapping from each SVG notehead to its BeatStep index
    let cursor = 0;
    steps.forEach((step, stepIdx) => {
      const count = step.noteCountOnStaff;
      for (let sub = 0; sub < count; sub++) {
        const noteEl = noteElements[cursor + sub];
        if (!noteEl) continue;
        noteEl.classList.add('abcjs-note-clickable');
        noteEl.setAttribute('data-step-idx', String(stepIdx));
        noteEl.setAttribute('data-sub-idx', String(sub));
        noteEl.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          onSelectStep(stepIdx, true);
        });
      }
      cursor += count;
    });
  }, [
    abcScore,
    lesson.barCount,
    showAccentHint,
    compactTwoLine,
    zoomPercent,
    steps,
    onSelectStep,
  ]);

  // Update active beat & active sub-note bloom highlight on the rendered SVG
  useEffect(() => {
    const container = staffContainerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const noteElements = Array.from(svg.querySelectorAll('.abcjs-note'));
    noteElements.forEach((el) => {
      const sIdx = Number(el.getAttribute('data-step-idx'));
      const subIdx = Number(el.getAttribute('data-sub-idx'));
      if (sIdx === activeStepIndex) {
        el.classList.add('abcjs-note-active');
        if (subIdx === activeSubNoteIndex) {
          el.classList.remove('abcjs-note-sub-active');
          void (el as HTMLElement).offsetWidth;
          el.classList.add('abcjs-note-sub-active');
        } else {
          el.classList.remove('abcjs-note-sub-active');
        }
      } else {
        el.classList.remove('abcjs-note-active');
        el.classList.remove('abcjs-note-sub-active');
      }
    });
  }, [
    activeStepIndex,
    activeSubNoteIndex,
    abcScore,
    showAccentHint,
    compactTwoLine,
    zoomPercent,
  ]);

  const stageWidthPercent = Math.max(100, Math.round((zoomPercent / 125) * 100));

  return (
    <section
      className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-4 z-50 overflow-y-auto shadow-2xl ring-2 ring-amber-500/40'
          : ''
      } ${isBlooming ? 'staff-zoom-bloom ring-2 ring-amber-400/60' : ''}`}
    >
      {/* Top Row: Section Title + 10 Rhythm Pattern Tabs + Beat Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            五线谱视奏
          </h2>

          {/* 10 Rhythm Pattern Tabs (9 classic + 10th Random Mixed Sight-Reading) */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl">
            {RHYTHM_PATTERNS.map((pat) => {
              const isActive = pat.id === activePattern.id;
              return (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => onSelectPattern(pat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? pat.isRandomMixed
                        ? 'bg-amber-500 text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {pat.name}
                </button>
              );
            })}
          </div>

          {activePattern.isRandomMixed && (
            <button
              type="button"
              onClick={onRefreshMixed}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 cursor-pointer whitespace-nowrap"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>换一组题</span>
            </button>
          )}
        </div>

        {/* Right: Count-in Indicator or Current Beat Counter */}
        <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums whitespace-nowrap shrink-0">
          {countInRemaining > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold">
              预备拍 {countInRemaining}
            </span>
          )}
          {swingPercent > 50 && (
            <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold">
              Swing {swingPercent}%
            </span>
          )}
          <span>
            第 <strong className="text-zinc-900 dark:text-zinc-100 text-sm font-bold">{activeStepIndex + 1}</strong> / {steps.length} 拍
          </span>
        </div>
      </div>

      {/* Middle Control Bar: Amber Focus Tips + Toggles + Zoom */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-zinc-50/90 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
        {/* Left: Focus Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            本课重音与口诀：
          </span>
          {activePattern.keyFocusBadges.map((badge, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/70 text-amber-800 dark:text-amber-300 font-mono font-medium text-xs whitespace-nowrap"
            >
              {badge}
            </span>
          ))}
          <span className="text-zinc-400 dark:text-zinc-500 hidden md:inline">·</span>
          <span className="text-zinc-500 dark:text-zinc-400 hidden md:inline">
            {lesson.meter} ({lesson.barCount}小节) · 调号：{activeKey.majorLabel} ({activeKey.accidentalCountLabel})
          </span>
        </div>

        {/* Right: Switches & Interactive Zoom Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-zinc-700 dark:text-zinc-300">
            <button
              type="button"
              role="switch"
              aria-checked={showAccentHint}
              onClick={() => setShowAccentHint(!showAccentHint)}
              className={`w-8 h-4.5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                showAccentHint ? 'bg-zinc-900 dark:bg-amber-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
            </button>
            <span className="font-medium whitespace-nowrap"># 强弱提示</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-zinc-700 dark:text-zinc-300">
            <button
              type="button"
              role="switch"
              aria-checked={showMnemonic}
              onClick={() => setShowMnemonic(!showMnemonic)}
              className={`w-8 h-4.5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                showMnemonic ? 'bg-zinc-900 dark:bg-amber-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
            </button>
            <span className="font-medium whitespace-nowrap">拟声口诀</span>
          </label>

          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => {
                setCompactTwoLine(false);
                triggerZoomBloom(zoomPercent);
              }}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                !compactTwoLine
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              单行全景
            </button>
            <button
              type="button"
              onClick={() => {
                setCompactTwoLine(true);
                triggerZoomBloom(zoomPercent);
              }}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                compactTwoLine
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              双行折叠
            </button>
          </div>

          <div
            className={`flex items-center gap-1 bg-white dark:bg-zinc-900 border rounded-lg px-2 py-1 transition-all ${
              isBlooming
                ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/40 scale-105 shadow-xs'
                : 'border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <button
              type="button"
              onClick={() => triggerZoomBloom(zoomPercent - 15)}
              disabled={zoomPercent <= 75}
              className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 disabled:opacity-35 cursor-pointer transition-transform active:scale-90"
              title="缩小五线谱"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => triggerZoomBloom(125)}
              className="font-mono text-xs font-bold px-1.5 text-zinc-800 dark:text-zinc-200 hover:text-amber-600 tabular-nums cursor-pointer"
              title="点击重置为 125%"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => triggerZoomBloom(zoomPercent + 15)}
              disabled={zoomPercent >= 200}
              className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 disabled:opacity-35 cursor-pointer transition-transform active:scale-125"
              title="放大五线谱（联动绽放）"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomPercent !== 125 && (
              <button
                type="button"
                onClick={() => triggerZoomBloom(125)}
                className="p-0.5 text-zinc-400 hover:text-amber-600 cursor-pointer"
                title="重置缩放"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const nextFull = !isFullscreen;
              setIsFullscreen(nextFull);
              triggerZoomBloom(nextFull ? Math.max(140, zoomPercent) : 125);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              isFullscreen
                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? '退出放大' : '放大'}</span>
          </button>
        </div>
      </div>

      {/* Five-Line Staff SVG Container */}
      <div
        className={`my-2.5 px-2 py-2 rounded-xl bg-white dark:bg-zinc-900 overflow-x-auto transition-all duration-300 ${
          isBlooming ? 'bg-amber-50/25 dark:bg-amber-950/15' : ''
        }`}
      >
        <div
          ref={staffContainerRef}
          style={{
            width: `${stageWidthPercent}%`,
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="abcjs-container min-h-[125px] flex items-center mx-auto"
        />
      </div>

      {/* Bottom Pill Strip: Dynamic Beat Buttons matching active meter & pattern */}
      <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-2">
        {steps.map((step, idx) => {
          const isSelected = idx === activeStepIndex;
          const isStrongBeat = step.accentType === 'strong';
          const isSyncopated = step.accentType === 'syncopated';
          const stepPitch = resolveStepPitchForKey(step, activeKey.id);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(idx, true)}
              style={isSelected && isBlooming ? { transform: 'scale(1.1)' } : undefined}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50'
                  : isStrongBeat
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/60 text-zinc-900 dark:text-zinc-100 font-semibold hover:bg-amber-100/70 hover:scale-[1.03]'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:scale-[1.03]'
              }`}
            >
              <span>
                {step.id}拍·{stepPitch.pitchName}
              </span>
              {showMnemonic && (
                <span className={isSelected ? 'text-white/95' : 'text-zinc-500 dark:text-zinc-400'}>
                  ({step.cellMnemonic})
                </span>
              )}
              {(isStrongBeat || isSyncopated) && !isSelected && (
                <span
                  className={`w-2 h-2 rounded-full ${isSyncopated ? 'bg-sky-500' : 'bg-amber-500'}`}
                  title={step.accentHzLabel}
                />
              )}
            </button>
          );
        })}

        <div className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 hidden lg:flex items-center gap-2">
          <span>
            当前谱面音高：{resolvedCurrentPitch.pitchName} ({Math.round(resolvedCurrentPitch.pitchFreq)}Hz)
          </span>
          <span>·</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">{currentStep.mnemonic}</span>
        </div>
      </div>
    </section>
  );
};
