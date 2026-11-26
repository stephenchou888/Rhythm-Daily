import React, { useEffect, useState } from 'react';
import { Info, Pause, Play, RotateCcw, Volume2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  BeatStepItem,
  CHORD_PROGRESSIONS,
  ChordProgressionPreset,
  CIRCLE_OF_FIFTHS_KEYS,
  CircleKeyInfo,
  DiatonicChordItem,
  RhythmPatternDef,
  TimeSignatureLesson,
} from '../data/rhythmData';
import { audioEngine, SoundMode } from '../utils/audioEngine';

interface CircleOfFifthsCardProps {
  activeKey: CircleKeyInfo;
  onSelectKey: (keyInfo: CircleKeyInfo) => void;
  lesson: TimeSignatureLesson;
  activePattern: RhythmPatternDef;
  activeStep: BeatStepItem;
  activeStepIndex: number;
  bpm: number;
}

type DiagramViewMode = 'circle' | 'geometry' | 'split';
type VoicingMode = 'triad' | 'seventh' | 'arpeggio';

export const CircleOfFifthsCard: React.FC<CircleOfFifthsCardProps> = ({
  activeKey,
  onSelectKey,
  lesson,
  activePattern,
  activeStep,
  activeStepIndex,
  bpm,
}) => {
  const [viewMode, setViewMode] = useState<DiagramViewMode>('circle');
  const [showChordNotes, setShowChordNotes] = useState(true);
  const [selectedChordIdx, setSelectedChordIdx] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [voicingMode, setVoicingMode] = useState<VoicingMode>('triad');
  const [soundMode, setSoundMode] = useState<SoundMode>('both');

  // Backing Chord Progression Loop state
  const [activeProg, setActiveProg] = useState<ChordProgressionPreset>(CHORD_PROGRESSIONS[0]);
  const [isBackingPlaying, setIsBackingPlaying] = useState<boolean>(false);
  const [progStepIdx, setProgStepIdx] = useState<number>(0);

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const createSectorPath = (
    cx: number,
    cy: number,
    rInner: number,
    rOuter: number,
    startAngle: number,
    endAngle: number
  ) => {
    const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
    const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
    const p3 = polarToCartesian(cx, cy, rInner, endAngle);
    const p4 = polarToCartesian(cx, cy, rInner, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  };

  const playChordVoicing = (
    chord: DiatonicChordItem,
    idx: number,
    durationSec: number = 0.9,
    forceSeventh: boolean = false
  ) => {
    setSelectedChordIdx(idx);
    const freqs = [...chord.frequencies];
    if (voicingMode === 'seventh' || forceSeventh) {
      const rootFreq = freqs[0];
      const seventhRatio = idx === 0 || idx === 3 ? 1.88775 : 1.7818;
      freqs.push(rootFreq * seventhRatio);
    }
    const arpMs = voicingMode === 'arpeggio' ? 110 : 25;
    audioEngine.playChord(freqs, durationSec, arpMs);
  };

  // BPM-synced Backing Chord Progression Loop (plays 1 chord per bar of the active meter)
  useEffect(() => {
    if (!isBackingPlaying) return;

    const barUnits = lesson.beatUnitWeights.reduce((acc, w) => acc + w, 0);
    const barDurationMs = Math.round((60 / Math.max(40, Math.min(220, bpm))) * barUnits * 1000);
    const chordDurationSec = Math.max(0.45, (barDurationMs / 1000) * 0.92);

    let stepCursor = 0;
    const triggerAtCursor = (cursor: number) => {
      const chordIdx = activeProg.chordIndices[cursor % activeProg.chordIndices.length];
      const chord = activeKey.chords[chordIdx];
      setProgStepIdx(cursor % activeProg.chordIndices.length);
      if (chord) {
        playChordVoicing(chord, chordIdx, chordDurationSec, activeProg.id === 'jazz');
      }
    };

    triggerAtCursor(0);
    const timer = window.setInterval(() => {
      stepCursor = (stepCursor + 1) % activeProg.chordIndices.length;
      triggerAtCursor(stepCursor);
    }, barDurationMs);

    return () => window.clearInterval(timer);
  }, [isBackingPlaying, activeProg, activeKey, bpm, lesson.beatUnitWeights, voicingMode]);

  const handleSoundModeChange = (mode: SoundMode) => {
    setSoundMode(mode);
    audioEngine.soundMode = mode;
    audioEngine.playBeat('strong', activeStep.pitchFreq, 0.2);
  };

  const activeCircleOrder = activeKey.circleOrder;
  const ivOrder = (activeCircleOrder + 11) % 12;
  const vOrder = (activeCircleOrder + 1) % 12;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              五度圈调式盘 & 节奏几何图示
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              · {activeKey.majorLabel} / {activeKey.minorLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('circle')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'circle'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              五度圈调式盘
            </button>
            <button
              type="button"
              onClick={() => setViewMode('geometry')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'geometry'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              节拍几何图示
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              双盘对照
            </button>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7 cols): Interactive SVG Canvas */}
          <div className="lg:col-span-7 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 p-4 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
            <div className="w-full flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 mb-1 px-1">
              <span>逆时针 ← 纯四度 (降号 b)</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {activeKey.majorLabel} · {activeKey.accidentalCountLabel}
              </span>
              <span>顺时针 → 纯五度 (升号 #)</span>
            </div>

            <div
              className="w-full flex flex-col items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${zoomScale / 100})` }}
            >
              {(viewMode === 'circle' || viewMode === 'split') && (
                <svg
                  viewBox="0 0 380 380"
                  className={viewMode === 'split' ? 'w-full max-w-[260px]' : 'w-full max-w-[350px]'}
                >
                  <defs>
                    <filter id="amberGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.35" />
                    </filter>
                  </defs>

                  {CIRCLE_OF_FIFTHS_KEYS.map((item) => {
                    const centerAngle = item.circleOrder * 30;
                    const startAngle = centerAngle - 15;
                    const endAngle = centerAngle + 15;

                    const isSelected = item.id === activeKey.id;
                    const isNeighborIV = item.circleOrder === ivOrder;
                    const isNeighborV = item.circleOrder === vOrder;

                    const outerPath = createSectorPath(190, 190, 122, 172, startAngle, endAngle);
                    const outerLabelPos = polarToCartesian(190, 190, 147, centerAngle);

                    const midPath = createSectorPath(190, 190, 82, 122, startAngle, endAngle);
                    const midLabelPos = polarToCartesian(190, 190, 102, centerAngle);

                    const innerPath = createSectorPath(190, 190, 50, 82, startAngle, endAngle);
                    const innerLabelPos = polarToCartesian(190, 190, 66, centerAngle);

                    const outerFill = isSelected
                      ? '#F59E0B'
                      : isNeighborIV || isNeighborV
                      ? '#FEF3C7'
                      : '#FFFFFF';

                    const midFill = isSelected
                      ? '#0EA5E9'
                      : isNeighborIV || isNeighborV
                      ? '#E0F2FE'
                      : '#F8FAFC';

                    const innerFill = isSelected ? '#FFFBEB' : '#F1F5F9';

                    return (
                      <g
                        key={item.id}
                        onClick={() => {
                          onSelectKey(item);
                          audioEngine.playChord(item.chords[0].frequencies, 0.75, 25);
                        }}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                      >
                        <path
                          d={outerPath}
                          fill={outerFill}
                          stroke="#E2E8F0"
                          strokeWidth="1.2"
                          filter={isSelected ? 'url(#amberGlow)' : undefined}
                        />
                        <text
                          x={outerLabelPos.x}
                          y={outerLabelPos.y - 3}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isSelected ? '#FFFFFF' : isNeighborIV || isNeighborV ? '#92400E' : '#18181B'}
                          fontSize={isSelected ? '14' : '12.5'}
                          fontWeight={isSelected ? '800' : '700'}
                        >
                          {item.id}
                        </text>
                        {(isSelected || isNeighborIV || isNeighborV) && (
                          <text
                            x={outerLabelPos.x}
                            y={outerLabelPos.y + 11}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={isSelected ? '#FEF3C7' : '#D97706'}
                            fontSize="8.5"
                            fontWeight="700"
                          >
                            {isSelected ? 'I 主音' : isNeighborIV ? 'IV 下属' : 'V 属音'}
                          </text>
                        )}

                        <path d={midPath} fill={midFill} stroke="#E2E8F0" strokeWidth="1" />
                        <text
                          x={midLabelPos.x}
                          y={midLabelPos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isSelected ? '#FFFFFF' : isNeighborIV || isNeighborV ? '#0369A1' : '#52525B'}
                          fontSize="10.5"
                          fontWeight={isSelected ? '700' : '600'}
                        >
                          {item.minorKey}
                        </text>

                        <path d={innerPath} fill={innerFill} stroke="#E2E8F0" strokeWidth="1" />
                        <text
                          x={innerLabelPos.x}
                          y={innerLabelPos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isSelected ? '#B45309' : '#71717A'}
                          fontSize="9"
                          fontWeight="600"
                        >
                          {item.accidentalCountLabel}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="190" cy="190" r="48" fill="#18181B" />
                  <text x="190" y="179" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="800">
                    {activeKey.id} / {activeKey.minorKey}
                  </text>
                  <text x="190" y="196" textAnchor="middle" fill="#E4E4E7" fontSize="9.5" fontWeight="600">
                    {activeKey.accidentalCountLabel}
                  </text>
                  <text x="190" y="210" textAnchor="middle" fill="#A1A1AA" fontSize="8">
                    点击扇区换调
                  </text>
                </svg>
              )}

              {(viewMode === 'geometry' || viewMode === 'split') && (
                <svg
                  viewBox="0 0 320 320"
                  className={viewMode === 'split' ? 'w-full max-w-[230px] mt-2' : 'w-full max-w-[330px]'}
                >
                  <circle
                    cx="160"
                    cy="160"
                    r="116"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />

                  {(() => {
                    const total = lesson.geometryNodes;
                    const accentPoints = lesson.geometryAccents
                      .map((idx) => {
                        const angle = (idx / total) * 360;
                        const pt = polarToCartesian(160, 160, 116, angle);
                        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        points={accentPoints}
                        fill="rgba(245, 158, 11, 0.14)"
                        stroke="#F59E0B"
                        strokeWidth="2.5"
                      />
                    );
                  })()}

                  {Array.from({ length: lesson.geometryNodes }).map((_, idx) => {
                    const angle = (idx / lesson.geometryNodes) * 360;
                    const pt = polarToCartesian(160, 160, 116, angle);
                    const isAccent = lesson.geometryAccents.includes(idx);
                    const isCurrentPulse = idx === activeStepIndex % lesson.geometryNodes;

                    return (
                      <g
                        key={idx}
                        onClick={() =>
                          audioEngine.playBeat(isAccent ? 'strong' : 'weak', isAccent ? 880 : 440, 0.2)
                        }
                        className="cursor-pointer"
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isCurrentPulse ? 15 : isAccent ? 12 : 8}
                          fill={isCurrentPulse ? '#F59E0B' : isAccent ? '#FEF3C7' : '#FFFFFF'}
                          stroke={isCurrentPulse || isAccent ? '#F59E0B' : '#CBD5E1'}
                          strokeWidth={isCurrentPulse ? '3' : '2'}
                        />
                        <text
                          x={pt.x}
                          y={pt.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={isCurrentPulse || isAccent ? '10' : '8.5'}
                          fontWeight="700"
                          fill={isCurrentPulse ? '#FFFFFF' : isAccent ? '#B45309' : '#64748B'}
                        >
                          {idx + 1}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="160" cy="160" r="46" fill="#18181B" />
                  <text x="160" y="153" textAnchor="middle" fill="#F59E0B" fontSize="18" fontWeight="800">
                    {lesson.meter}
                  </text>
                  <text x="160" y="171" textAnchor="middle" fill="#E4E4E7" fontSize="9.5" fontWeight="600">
                    {activePattern.name} ({bpm}BPM)
                  </text>
                </svg>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-semibold shadow-2xs">
                ● 大调外环：{activeKey.majorLabel}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white font-semibold shadow-2xs">
                ● 关系小调中环：{activeKey.minorKey} ({activeKey.minorLabel})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
                调号：{activeKey.accidentalsDetail}
              </span>
            </div>
          </div>

          {/* Right Column (5 cols): Diatonic Chords List + BPM-Synced Backing Chord Loop */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  当前调顺阶和弦 (点击试听)
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs text-zinc-500 dark:text-zinc-400">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showChordNotes}
                    onClick={() => setShowChordNotes(!showChordNotes)}
                    className={`w-7 h-4 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                      showChordNotes ? 'bg-amber-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white shadow-2xs" />
                  </button>
                  <span>查构成音</span>
                </label>
              </div>

              {/* 7 Diatonic Chord Cards */}
              <div className="space-y-1.5">
                {activeKey.chords.map((chord, idx) => {
                  const isSelected = idx === selectedChordIdx;
                  const isLoopActiveChord =
                    isBackingPlaying &&
                    activeProg.chordIndices[progStepIdx % activeProg.chordIndices.length] === idx;
                  const displayChordName = voicingMode === 'seventh' ? chord.seventhName : chord.chordName;
                  return (
                    <button
                      key={chord.degree}
                      type="button"
                      onClick={() => playChordVoicing(chord, idx)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isLoopActiveChord
                          ? 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 ring-1 ring-amber-400/50 shadow-2xs'
                          : isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 shadow-2xs'
                          : 'bg-zinc-50/70 dark:bg-zinc-800/50 border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            chord.isPrimary
                              ? 'bg-amber-500'
                              : 'border-2 border-zinc-300 dark:border-zinc-600 bg-transparent'
                          }`}
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <span className="font-mono text-amber-600 dark:text-amber-400">{chord.degree}级</span>
                            <span>{displayChordName}</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {chord.roleName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {showChordNotes && (
                          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                            {chord.notesLabel}
                          </span>
                        )}
                        <Volume2 className={`w-3.5 h-3.5 ${isLoopActiveChord ? 'text-amber-500' : 'text-zinc-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Backing Chord Progression Loop Control */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-50/90 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {CHORD_PROGRESSIONS.map((prog) => {
                    const isCurr = prog.id === activeProg.id;
                    return (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => setActiveProg(prog)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                          isCurr
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200 dark:border-zinc-700'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {prog.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setIsBackingPlaying(!isBackingPlaying)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                    isBackingPlaying
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-zinc-900 dark:bg-zinc-700 text-white hover:bg-zinc-800'
                  }`}
                >
                  {isBackingPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>{isBackingPlaying ? '停止伴奏' : `循环伴奏 (${bpm}BPM)`}</span>
                </button>
              </div>
            </div>

            <div className="mt-2.5 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>正三和弦与小调主音 (I · IV · V · vi)：调性骨架</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 shrink-0" />
                <span>副三和弦与导音 (ii · iii · vii°)：2-5-1 色彩过渡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <span>缩放</span>
            <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(80, s - 10))}
                className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-transform active:scale-90"
                title="缩小图示"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(100)}
                className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 hover:text-amber-600 px-1 tabular-nums cursor-pointer"
                title="点击重置 100%"
              >
                {zoomScale}%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(130, s + 10))}
                className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-transform active:scale-125"
                title="放大图示"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(100)}
                className="hover:text-amber-600 dark:hover:text-amber-400 ml-0.5 cursor-pointer"
                title="重置缩放"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">和弦听感</span>
            <div className="inline-flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              {(
                [
                  { id: 'triad', label: '标准三和弦' },
                  { id: 'seventh', label: '爵士七和弦 (+7th)' },
                  { id: 'arpeggio', label: '分解琶音' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoicingMode(v.id)}
                  className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    voicingMode === v.id
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'both', label: '拍音+乐音' },
              { id: 'tone', label: '仅钢琴乐音' },
              { id: 'click', label: '仅木鱼拍音' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSoundModeChange(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                soundMode === m.id
                  ? 'bg-zinc-900 dark:bg-amber-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            点击五度圈扇区、顺阶和弦，或开启 {activeProg.label} 循环伴奏即兴练习
          </span>
          <span className="font-mono">
            当前调式: {activeKey.majorLabel} / {activeKey.minorKey} ({activeKey.accidentalCountLabel})
          </span>
        </div>
      </div>
    </div>
  );
};
