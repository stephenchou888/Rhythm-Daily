import React, { useState } from 'react';
import { ArrowLeftRight, Volume2 } from 'lucide-react';
import {
  CHURCH_MODES,
  CHROMATIC_NOTE_ORDER,
  CIRCLE_OF_FIFTHS_KEYS,
  CircleKeyInfo,
  ModeDefinition,
} from '../data/rhythmData';
import { audioEngine } from '../utils/audioEngine';

interface PianoTranspositionCardProps {
  activeKey: CircleKeyInfo;
  onSelectKey: (keyInfo: CircleKeyInfo) => void;
  activeMode?: ModeDefinition;
  onSelectMode?: (mode: ModeDefinition) => void;
}

interface WhiteKeyDef {
  index: number; // 0..17
  midi: number;
  noteName: string; // e.g., 'C3', 'D3', ..., 'F5'
  altoLabel: string; // Written note for Eb Alto Sax (+9 semitones / -3 semitones)
  sopranoLabel: string; // Written note for Bb Soprano Sax (+2 semitones)
}

interface BlackKeyDef {
  afterWhiteIndex: number;
  midi: number;
  noteName: string;
  flatName: string;
}

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToNoteLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES_SHARP[midi % 12];
  return `${name}${octave}`;
}

// Build 18 white keys from C3 (MIDI 48) to F5 (MIDI 77)
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const WHITE_KEYS: WhiteKeyDef[] = [];
let whiteCounter = 0;
for (let oct = 3; oct <= 5; oct++) {
  for (const semi of WHITE_SEMITONES) {
    const midi = (oct + 1) * 12 + semi;
    if (midi > 77) break; // Stop at F5
    WHITE_KEYS.push({
      index: whiteCounter,
      midi,
      noteName: midiToNoteLabel(midi),
      altoLabel: midiToNoteLabel(midi + 9), // Eb Alto Sax reads up major 6th (+9 semitones)
      sopranoLabel: midiToNoteLabel(midi + 2), // Bb Soprano Sax reads up major 2nd (+2 semitones)
    });
    whiteCounter++;
  }
}

const BLACK_KEYS: BlackKeyDef[] = [];
WHITE_KEYS.forEach((wk) => {
  const semiInOct = wk.midi % 12;
  if ([0, 2, 5, 7, 9].includes(semiInOct) && wk.midi + 1 < 77) {
    const blackMidi = wk.midi + 1;
    BLACK_KEYS.push({
      afterWhiteIndex: wk.index,
      midi: blackMidi,
      noteName: midiToNoteLabel(blackMidi),
      flatName: midiToNoteLabel(blackMidi),
    });
  }
});

export const PianoTranspositionCard: React.FC<PianoTranspositionCardProps> = ({
  activeKey,
  onSelectKey,
  activeMode: controlledMode,
  onSelectMode,
}) => {
  const [internalMode, setInternalMode] = useState<ModeDefinition>(CHURCH_MODES[0]);
  const activeMode = controlledMode ?? internalMode;
  const setMode = (mode: ModeDefinition) => {
    setInternalMode(mode);
    onSelectMode?.(mode);
  };

  // Select key by chromatic note name (e.g. 'C', 'C#', 'D', 'Eb'...)
  const handleSelectChromatic = (chromNote: string) => {
    const found = CIRCLE_OF_FIFTHS_KEYS.find((k) => k.chromaticNote === chromNote);
    if (found) {
      onSelectKey(found);
      audioEngine.playPianoNote(found.rootMidi, 0.55, true);
    }
  };

  // Compute coordinates on the SVG piano keyboard for the top Amber curved arrow and bottom Sky-Blue curved arrow
  const whiteKeyWidth = 42;
  const startX = 42;

  const getKeyCenterX = (targetMidi: number): number => {
    // Clamp into our C3 (48) .. F5 (77) range
    let m = targetMidi;
    while (m < 48) m += 12;
    while (m > 76) m -= 12;

    const wk = WHITE_KEYS.find((w) => w.midi === m);
    if (wk) {
      return startX + wk.index * whiteKeyWidth + whiteKeyWidth / 2;
    }
    const bk = BLACK_KEYS.find((b) => b.midi === m);
    if (bk) {
      return startX + (bk.afterWhiteIndex + 1) * whiteKeyWidth;
    }
    return startX + 7 * whiteKeyWidth;
  };

  // Written/Selected Tonic MIDI around octave 4 (60..71)
  const tonicMidi = activeKey.rootMidi;
  // Concert pitch when played on Eb Alto Sax (9 semitones lower) or Relative Minor (-3 semitones)
  const altoConcertMidi = tonicMidi - 9;
  // Concert pitch when played on Bb Soprano Sax (2 semitones lower)
  const sopranoConcertMidi = tonicMidi - 2;
  // Active scale/mode pitch classes (0..11)
  const modePitchClasses = new Set(
    activeMode.semitones.map((semi) => (tonicMidi + semi) % 12)
  );

  const tonicX = getKeyCenterX(tonicMidi);
  const altoConcertX = getKeyCenterX(altoConcertMidi);
  const sopranoConcertX = getKeyCenterX(sopranoConcertMidi);

  const concertNoteName = midiToNoteLabel(tonicMidi);
  const altoConcertNoteName = midiToNoteLabel(altoConcertMidi);
  const sopranoConcertNoteName = midiToNoteLabel(sopranoConcertMidi);

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-xs">
      {/* Header Row (1:1 Match with Saxophone Screenshot Tier 5) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
            <ArrowLeftRight className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              五度圈 ↔ 钢琴键盘 调式与管乐移调原理图
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-4xl">
              五度圈、钢琴实音与移调乐器（萨克斯/竹笛）遵循严格的半音几何映射：键盘上方标出每个琴键在
              <strong className="text-amber-600 dark:text-amber-400 font-semibold mx-0.5">
                大调主音 / 中音萨克斯 (Eb)
              </strong>
              上的位置，下方是
              <strong className="text-sky-600 dark:text-sky-400 font-semibold mx-0.5">
                关系小调 / 高音萨克斯 (Bb)
              </strong>
              的移调对应；点击任意琴键或下方卡片即可合成试听。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => audioEngine.playTranspositionDemo(activeKey.rootMidi, false)}
          className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          跟随当前调试听音阶
        </button>
      </div>

      {/* 12 Chromatic Key Selector Pills + 7 Church Modes Selector */}
      <div className="mt-5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 w-14 shrink-0">记谱主音</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {CHROMATIC_NOTE_ORDER.map((note) => {
              const isSelected = activeKey.chromaticNote === note;
              return (
                <button
                  key={note}
                  type="button"
                  onClick={() => handleSelectChromatic(note)}
                  className={`min-w-[38px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-xs scale-105'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-amber-400'
                  }`}
                >
                  {note}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 w-14 shrink-0">七大调式</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {CHURCH_MODES.map((mode) => {
              const isSelected = activeMode.id === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setMode(mode);
                    audioEngine.playTranspositionDemo(
                      activeKey.rootMidi,
                      mode.semitones.includes(3),
                      mode.semitones
                    );
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-amber-500 text-white font-semibold shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {mode.name}
                </button>
              );
            })}
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2 hidden md:inline">
              结构：{activeMode.formula} · 色彩：{activeMode.colorMood}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Piano Keyboard with Top Amber Curved Arrow & Bottom Sky-Blue Curved Arrow */}
      <div className="mt-4 w-full overflow-x-auto py-2">
        <div className="min-w-[780px] flex justify-center">
          <svg viewBox="0 0 840 345" className="w-full max-w-[880px] select-none">
            <defs>
              <marker
                id="amberArrowHead"
                markerWidth="8"
                markerHeight="8"
                refX="5"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B" />
              </marker>
              <marker
                id="skyArrowHead"
                markerWidth="8"
                markerHeight="8"
                refX="5"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#0EA5E9" />
              </marker>
            </defs>

            {/* Top Curved Amber Arrow: From Written/Tonic Key to Eb Alto Concert Key (-9 semitones) */}
            <text
              x={(tonicX + altoConcertX) / 2}
              y="22"
              textAnchor="middle"
              fill="#18181B"
              className="dark:fill-zinc-100"
              fontSize="12.5"
              fontWeight="800"
            >
              中音 Eb 移调 ↓ 大六度 (9个半音) · 关系小调 ↓ 小三度 (3个半音)
            </text>
            <path
              d={`M ${tonicX} 75 Q ${(tonicX + altoConcertX) / 2} 26 ${altoConcertX} 102`}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.8"
              markerEnd="url(#amberArrowHead)"
            />

            {/* Top Label Strip Above Keyboard (Matches light beige bar in Saxophone screenshot) */}
            <rect
              x={startX - 8}
              y="55"
              width={WHITE_KEYS.length * whiteKeyWidth + 16}
              height="48"
              rx="8"
              fill="#FFFBEB"
              stroke="#FDE68A"
              strokeWidth="1"
            />
            {WHITE_KEYS.map((wk) => {
              const cx = startX + wk.index * whiteKeyWidth + whiteKeyWidth / 2;
              const isTonic = wk.midi === tonicMidi;
              return (
                <g key={`top-${wk.midi}`}>
                  {isTonic && (
                    <rect
                      x={cx - 16}
                      y="78"
                      width="32"
                      height="20"
                      rx="5"
                      fill="#F59E0B"
                    />
                  )}
                  <text
                    x={cx}
                    y="69"
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#92400E"
                    opacity="0.7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {wk.altoLabel}
                  </text>
                  <text
                    x={cx}
                    y="91"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight={isTonic ? '800' : '600'}
                    fill={isTonic ? '#FFFFFF' : '#78350F'}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {wk.noteName}
                  </text>
                </g>
              );
            })}

            {/* Piano Outer Dark Frame */}
            <rect
              x={startX - 6}
              y="105"
              width={WHITE_KEYS.length * whiteKeyWidth + 12}
              height="146"
              rx="8"
              fill="#18181B"
            />

            {/* 18 White Keys */}
            {WHITE_KEYS.map((wk) => {
              const x = startX + wk.index * whiteKeyWidth;
              const isPrimaryAmber = wk.midi === altoConcertMidi;
              const isSkyActive = wk.midi === sopranoConcertMidi;
              const isWrittenTonic = wk.midi === tonicMidi;
              const isInScale = modePitchClasses.has(wk.midi % 12);

              let fill = '#FFFFFF';
              if (isPrimaryAmber) fill = '#F59E0B';
              else if (isSkyActive) fill = '#0EA5E9';
              else if (isWrittenTonic) fill = '#FEF3C7';

              return (
                <g
                  key={wk.midi}
                  onClick={() => audioEngine.playPianoNote(wk.midi, 0.6, true)}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <rect
                    x={x + 1}
                    y="108"
                    width={whiteKeyWidth - 2}
                    height="138"
                    rx="5"
                    fill={fill}
                    stroke={isWrittenTonic ? '#F59E0B' : '#CBD5E1'}
                    strokeWidth={isWrittenTonic ? '2' : '1'}
                  />

                  {/* Scale degree dot */}
                  {isInScale && !isPrimaryAmber && !isSkyActive && (
                    <circle
                      cx={x + whiteKeyWidth / 2}
                      cy="212"
                      r="3.5"
                      fill="#F59E0B"
                      opacity="0.7"
                    />
                  )}

                  {/* Written Score Badge ("谱") */}
                  {isWrittenTonic && (
                    <g>
                      <rect
                        x={x + 8}
                        y="194"
                        width={whiteKeyWidth - 16}
                        height="22"
                        rx="4"
                        fill="#FFFFFF"
                        stroke="#18181B"
                        strokeWidth="1.5"
                      />
                      <text
                        x={x + whiteKeyWidth / 2}
                        y="209"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="800"
                        fill="#18181B"
                      >
                        主
                      </text>
                    </g>
                  )}

                  {/* Octave C markers */}
                  {(wk.noteName === 'C3' || wk.noteName === 'C4' || wk.noteName === 'C5') && (
                    <text
                      x={x + whiteKeyWidth / 2}
                      y="236"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={isPrimaryAmber || isSkyActive ? '#FFFFFF' : '#94A3B8'}
                    >
                      {wk.noteName === 'C4' ? '中央C' : wk.noteName}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Black Keys */}
            {BLACK_KEYS.map((bk) => {
              const bw = 26;
              const x = startX + (bk.afterWhiteIndex + 1) * whiteKeyWidth - bw / 2;
              const isPrimaryAmber = bk.midi === altoConcertMidi || bk.midi === tonicMidi;
              const isSkyActive = bk.midi === sopranoConcertMidi;

              let fill = '#18181B';
              if (isPrimaryAmber) fill = '#F59E0B';
              else if (isSkyActive) fill = '#0EA5E9';

              return (
                <g
                  key={bk.midi}
                  onClick={() => audioEngine.playPianoNote(bk.midi, 0.6, true)}
                  className="cursor-pointer hover:opacity-90"
                >
                  <rect
                    x={x}
                    y="108"
                    width={bw}
                    height="86"
                    rx="4"
                    fill={fill}
                    stroke="#09090B"
                    strokeWidth="1"
                  />
                  {(isPrimaryAmber || isSkyActive) && (
                    <text
                      x={x + bw / 2}
                      y="178"
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="#FFFFFF"
                    >
                      {bk.noteName}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Bottom Label Strip Below Keyboard (Matches light sky-blue bar in Saxophone screenshot) */}
            <rect
              x={startX - 8}
              y="253"
              width={WHITE_KEYS.length * whiteKeyWidth + 16}
              height="46"
              rx="8"
              fill="#F0F9FF"
              stroke="#BAE6FD"
              strokeWidth="1"
            />
            {WHITE_KEYS.map((wk) => {
              const cx = startX + wk.index * whiteKeyWidth + whiteKeyWidth / 2;
              const isSopranoTarget = wk.midi === sopranoConcertMidi;
              return (
                <g key={`bot-${wk.midi}`}>
                  {isSopranoTarget && (
                    <rect
                      x={cx - 16}
                      y="257"
                      width="32"
                      height="20"
                      rx="5"
                      fill="#0EA5E9"
                    />
                  )}
                  <text
                    x={cx}
                    y="271"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight={isSopranoTarget ? '800' : '600'}
                    fill={isSopranoTarget ? '#FFFFFF' : '#0369A1'}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {wk.noteName}
                  </text>
                  <text
                    x={cx}
                    y="290"
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#0284C7"
                    opacity="0.75"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {wk.sopranoLabel}
                  </text>
                </g>
              );
            })}

            {/* Bottom Curved Sky-Blue Arrow */}
            <path
              d={`M ${tonicX} 276 Q ${(tonicX + sopranoConcertX) / 2} 322 ${sopranoConcertX} 252`}
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="2.8"
              markerEnd="url(#skyArrowHead)"
            />
            <text
              x={(tonicX + sopranoConcertX) / 2}
              y="334"
              textAnchor="middle"
              fill="#18181B"
              className="dark:fill-zinc-100"
              fontSize="12.5"
              fontWeight="800"
            >
              高音 / 次中音 Bb 移调 ↓ 大二度 (2个半音)
            </text>
          </svg>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards (1 Amber Card + 1 Sky-Blue Card, 1:1 with Saxophone Screenshot) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Amber Card */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/35 dark:bg-amber-950/20 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                中音萨克斯 Eb / 大调主音定位
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                五度圈外环
              </span>
            </div>

            <button
              type="button"
              onClick={() => audioEngine.playTranspositionDemo(activeKey.rootMidi, false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 cursor-pointer shadow-2xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>试听</span>
            </button>
          </div>

          <div className="my-4 flex items-baseline gap-2.5">
            <span className="text-xs text-zinc-400">记谱主音</span>
            <span className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
              {concertNoteName}
            </span>
            <span className="text-zinc-400 font-mono">→</span>
            <span className="text-xs text-zinc-400">中音实音</span>
            <span className="text-2xl font-extrabold font-mono text-amber-500">
              {altoConcertNoteName}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
              (合奏调号：{activeKey.altoSaxKey} · {activeKey.altoSaxAccidental})
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            中音萨克斯实音比记谱低大六度（9个半音），谱上的 C 吹出来是钢琴的 Eb。
            <br />
            口诀：在五度圈上顺时针走 3 格（加 3 个升号 / 减 3 个降号），即为中音谱调号。
          </p>
        </div>

        {/* Right Sky-Blue Card */}
        <div className="rounded-2xl border border-sky-200 dark:border-sky-800/70 bg-sky-50/35 dark:bg-sky-950/20 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                高音萨克斯 Bb / 关系小调 & 竹笛移调
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/50 text-[11px] font-medium text-sky-800 dark:text-sky-300">
                五度圈中环
              </span>
            </div>

            <button
              type="button"
              onClick={() => audioEngine.playTranspositionDemo(activeKey.minorRootMidi, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 cursor-pointer shadow-2xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-500" />
              <span>试听</span>
            </button>
          </div>

          <div className="my-4 flex items-baseline gap-2.5">
            <span className="text-xs text-zinc-400">记谱主音</span>
            <span className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
              {concertNoteName}
            </span>
            <span className="text-zinc-400 font-mono">→</span>
            <span className="text-xs text-zinc-400">高音实音</span>
            <span className="text-2xl font-extrabold font-mono text-sky-500">
              {sopranoConcertNoteName}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
              (关系小调：{activeKey.minorKey} · {activeKey.diziThumbNote})
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            高音/次中音萨克斯实音比记谱低大二度（2个半音）；关系小调主音在大调主音下方小三度（3个半音）。
            <br />
            口诀：五度圈顺时针走 2 格（加 2 个升号）即为高音萨克斯谱调号；竹笛通过变换筒音指法实现同调合奏。
          </p>
        </div>
      </div>

      {/* Bottom 3-Column 12-Key Lookup Table (1:1 Match with Saxophone Screenshot "调号对照（与钢琴合奏时）") */}
      <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          12 大调五度圈升降号、关系小调与管乐移调对照（点击任意行可切换全站调号并试听）
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-medium">
                <th className="py-2.5 pr-4">钢琴 / 乐队实音 (五度圈大调)</th>
                <th className="py-2.5 px-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    中音萨克斯谱 (Eb) · 关系小调
                  </span>
                </th>
                <th className="py-2.5 pl-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    高音萨克斯谱 (Bb) · 竹笛筒音指法
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 font-mono tabular-nums">
              {CIRCLE_OF_FIFTHS_KEYS.map((row) => {
                const isCurrent = row.id === activeKey.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      onSelectKey(row);
                      audioEngine.playChord(row.chords[0].frequencies, 0.75, 25);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 font-semibold'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.majorLabel}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 ml-2">{row.accidentalCountLabel}</span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-amber-600 dark:text-amber-400">{row.altoSaxKey}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 ml-2">{row.altoSaxAccidental}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 mx-1.5">·</span>
                      <span className="text-zinc-600 dark:text-zinc-300">关系小调 {row.minorKey}</span>
                    </td>
                    <td className="py-2.5 pl-4 whitespace-nowrap">
                      <span className="font-bold text-sky-600 dark:text-sky-400">{row.sopranoSaxKey}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 ml-2">{row.sopranoSaxAccidental}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 mx-1.5">·</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-sans">{row.diziThumbNote}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          规律：顺时针每走一格五度增加 1 个升号（或减少 1 个降号）；中音谱比钢琴实音多 3 个升号，高音谱比钢琴实音多 2 个升号。
        </p>
      </div>
    </section>
  );
};
