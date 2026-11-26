/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Drum,
  Keyboard,
  Lightbulb,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Repeat,
  Shuffle,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  buildMeterAwarePattern,
  CHURCH_MODES,
  CIRCLE_OF_FIFTHS_KEYS,
  CircleKeyInfo,
  LessonGroup,
  MeterCategory,
  ModeDefinition,
  resolveStepPitchForKey,
  RHYTHM_PATTERNS,
  RhythmPatternDef,
  TIME_SIGNATURE_LESSONS,
  TimeSignatureLesson,
} from './data/rhythmData';
import { audioEngine, MetronomeSubdivision, ScheduledBeatStep } from './utils/audioEngine';
import { StaffCard } from './components/StaffCard';
import { CircleOfFifthsCard } from './components/CircleOfFifthsCard';
import { PianoTranspositionCard } from './components/PianoTranspositionCard';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAComponents';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '今'];

interface TapResultItem {
  status: 'Perfect' | 'Good' | 'Early' | 'Late';
  deltaMs: number;
  accuracy: number;
}

function getInitialUrlState() {
  if (typeof window === 'undefined') {
    return {
      lesson: TIME_SIGNATURE_LESSONS[1],
      pattern: RHYTHM_PATTERNS[3],
      key: CIRCLE_OF_FIFTHS_KEYS[0],
      bpm: TIME_SIGNATURE_LESSONS[1].recommendedBpm,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const meterParam = params.get('meter');
  const patternParam = params.get('pattern');
  const keyParam = params.get('key');
  const bpmParam = params.get('bpm');

  const lesson =
    TIME_SIGNATURE_LESSONS.find((l) => l.meter === meterParam || l.id === meterParam) ||
    TIME_SIGNATURE_LESSONS[1];
  const pattern = RHYTHM_PATTERNS.find((p) => p.id === patternParam) || RHYTHM_PATTERNS[3];
  const key = CIRCLE_OF_FIFTHS_KEYS.find((k) => k.id === keyParam) || CIRCLE_OF_FIFTHS_KEYS[0];
  const parsedBpm = bpmParam ? parseInt(bpmParam, 10) : NaN;
  const bpm =
    !Number.isNaN(parsedBpm) && parsedBpm >= 50 && parsedBpm <= 180
      ? parsedBpm
      : lesson.recommendedBpm;

  return { lesson, pattern, key, bpm };
}

export default function App() {
  const initial = useMemo(() => getInitialUrlState(), []);

  // Theme & Audio State
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);

  // Core Curriculum State
  const [activeLesson, setActiveLesson] = useState<TimeSignatureLesson>(initial.lesson);
  const [activePattern, setActivePattern] = useState<RhythmPatternDef>(initial.pattern);
  const [activeKey, setActiveKey] = useState<CircleKeyInfo>(initial.key);
  const [activeMode, setActiveMode] = useState<ModeDefinition>(CHURCH_MODES[0]);
  const [mixedSeed, setMixedSeed] = useState<number>(1);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activeSubNoteIndex, setActiveSubNoteIndex] = useState<number>(0);

  // Hardware Transport & Metronome State
  const [bpm, setBpm] = useState<number>(initial.bpm);
  const [swingPercent, setSwingPercent] = useState<number>(50);
  const [subdivision, setSubdivision] = useState<MetronomeSubdivision>('1x');
  const [countInEnabled, setCountInEnabled] = useState<boolean>(false);
  const [countInRemaining, setCountInRemaining] = useState<number>(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const [isMetronomeRunning, setIsMetronomeRunning] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [autoAdvanceStaff, setAutoAdvanceStaff] = useState<boolean>(true);
  const [metronomeSubTick, setMetronomeSubTick] = useState<number>(0);

  // Check-in Streak State (persisted in localStorage)
  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rhythm_daily_streak');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [checkedInToday, setCheckedInToday] = useState<boolean>(() => {
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      return localStorage.getItem('rhythm_daily_last_date') === todayKey;
    } catch {
      return false;
    }
  });

  // Upgraded Spacebar Tap Trainer State
  const [tapTrainerActive, setTapTrainerActive] = useState<boolean>(false);
  const [tapMode, setTapMode] = useState<'beat' | 'pattern'>('beat');
  const [tapHistory, setTapHistory] = useState<TapResultItem[]>([]);

  // Hardware onset timestamps recorded by the audio lookahead scheduler (ms in performance.now())
  const expectedBeatTimestampsRef = useRef<number[]>([performance.now()]);
  const expectedPatternTimestampsRef = useRef<number[]>([performance.now()]);

  // Meter-aware Steps & ABC Score
  const { steps, abcScore } = useMemo(
    () => buildMeterAwarePattern(activeLesson, activePattern, activeKey.abcKey, mixedSeed),
    [activeLesson, activePattern, activeKey.abcKey, mixedSeed]
  );

  // Keep activeStepIndex valid whenever meter changes bar/beat length
  const safeStepIndex = activeStepIndex < steps.length ? activeStepIndex : 0;
  useEffect(() => {
    if (activeStepIndex >= steps.length) {
      setActiveStepIndex(0);
    }
  }, [activeStepIndex, steps.length]);

  // URL Query State Persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('meter', activeLesson.meter);
    params.set('pattern', activePattern.id);
    params.set('key', activeKey.id);
    params.set('bpm', String(bpm));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [activeLesson.meter, activePattern.id, activeKey.id, bpm]);

  // Cleanup transport on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopTransport();
    };
  }, []);

  // Sync Dark Mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioEngine.muted = next;
      return next;
    });
  }, []);

  // Current step with key-signature-resolved pitch name and frequency
  const currentStep = useMemo(() => {
    const rawStep = steps[safeStepIndex] || steps[0];
    const resolved = resolveStepPitchForKey(rawStep, activeKey.id);
    return {
      ...rawStep,
      pitchName: resolved.pitchName,
      pitchFreq: resolved.pitchFreq,
      patternTitle: `${rawStep.cellPatternName} (${resolved.pitchName})`,
    };
  }, [steps, safeStepIndex, activeKey.id]);

  // Pre-build ScheduledBeatStep[] for the hardware lookahead engine
  const scheduledSteps = useMemo<ScheduledBeatStep[]>(() => {
    return steps.map((step) => {
      const resolved = resolveStepPitchForKey(step, activeKey.id);
      return {
        pitchFreq: resolved.pitchFreq,
        ratios: step.ratios,
        accentType: step.accentType,
        beatUnits: step.beatUnits,
      };
    });
  }, [steps, activeKey.id]);

  // Live-update running hardware transport when BPM, Swing, Subdivision, Steps, or Loop toggles change
  useEffect(() => {
    if (!isDemoPlaying && !isMetronomeRunning) return;
    audioEngine.updateTransportParams({
      bpm,
      swingPercent,
      subdivision,
      beatsPerBar: activeLesson.beatsPerBar,
      beatUnitWeights: activeLesson.beatUnitWeights,
      steps: scheduledSteps,
      autoAdvanceStaff,
      loop: isLooping,
    });
  }, [
    isDemoPlaying,
    isMetronomeRunning,
    bpm,
    swingPercent,
    subdivision,
    activeLesson.beatsPerBar,
    activeLesson.beatUnitWeights,
    scheduledSteps,
    autoAdvanceStaff,
    isLooping,
  ]);

  // Single beat one-shot playback (click on staff notehead, pill, prev/next, or Listen button)
  const triggerStepPlayback = useCallback(
    (
      stepIndex: number,
      targetSteps = steps,
      keyInfo: CircleKeyInfo = activeKey,
      tempo: number = bpm,
      swing: number = swingPercent
    ) => {
      const targetStep = targetSteps[stepIndex];
      if (!targetStep) return;
      const resolved = resolveStepPitchForKey(targetStep, keyInfo.id);
      setActiveSubNoteIndex(0);
      audioEngine.playRhythmCell(
        targetStep.ratios,
        tempo,
        targetStep.accentType,
        resolved.pitchFreq,
        (subIdx) => setActiveSubNoteIndex(subIdx),
        targetStep.beatUnits,
        swing
      );
    },
    [steps, activeKey, bpm, swingPercent]
  );

  const handleSelectStep = useCallback(
    (index: number, playAudio: boolean = true) => {
      const safeIndex = (index + steps.length) % steps.length;
      setActiveStepIndex(safeIndex);
      setActiveSubNoteIndex(0);
      if (isDemoPlaying || isMetronomeRunning) {
        audioEngine.seekStep(safeIndex);
      } else if (playAudio) {
        triggerStepPlayback(safeIndex);
      }
    },
    [steps.length, isDemoPlaying, isMetronomeRunning, triggerStepPlayback]
  );

  const launchTransport = useCallback(
    (
      mode: 'demo' | 'metronome',
      startStep: number,
      overrideLesson: TimeSignatureLesson = activeLesson,
      overrideSteps: ScheduledBeatStep[] = scheduledSteps,
      overrideBpm: number = bpm
    ) => {
      expectedBeatTimestampsRef.current = [performance.now()];
      expectedPatternTimestampsRef.current = [performance.now()];
      setCountInRemaining(countInEnabled ? overrideLesson.beatsPerBar : 0);

      audioEngine.startTransport({
        mode,
        bpm: overrideBpm,
        swingPercent,
        subdivision,
        beatsPerBar: overrideLesson.beatsPerBar,
        beatUnitWeights: overrideLesson.beatUnitWeights,
        steps: overrideSteps,
        startStepIndex: startStep,
        autoAdvanceStaff,
        loop: isLooping,
        countIn: countInEnabled,
        onBeatStart: (evt) => {
          setCountInRemaining(evt.isCountIn ? evt.countInRemaining : 0);
          setMetronomeSubTick(evt.barBeatIndex);

          if (!evt.isCountIn) {
            if (mode === 'demo' || autoAdvanceStaff) {
              setActiveStepIndex(evt.stepIndex);
            }
            // Record exact expected onset timestamps for Tap Accuracy Trainer
            const beatList = expectedBeatTimestampsRef.current;
            beatList.push(evt.expectedOnsetPerfMs);
            if (beatList.length > 24) beatList.shift();

            const patList = expectedPatternTimestampsRef.current;
            evt.subdivisionPerfOffsetsMs.forEach((offset) => {
              patList.push(evt.expectedOnsetPerfMs + offset);
            });
            if (patList.length > 48) {
              patList.splice(0, patList.length - 48);
            }
          }
        },
        onSubNote: (sIdx, subIdx) => {
          if (mode === 'demo' || autoAdvanceStaff) {
            setActiveStepIndex(sIdx);
            setActiveSubNoteIndex(subIdx);
          }
        },
        onComplete: () => {
          setIsDemoPlaying(false);
          setCountInRemaining(0);
          setActiveStepIndex(0);
          setActiveSubNoteIndex(0);
        },
      });
    },
    [
      activeLesson,
      scheduledSteps,
      bpm,
      swingPercent,
      subdivision,
      autoAdvanceStaff,
      isLooping,
      countInEnabled,
    ]
  );

  const handleToggleDemoPlay = useCallback(() => {
    if (isDemoPlaying) {
      setIsDemoPlaying(false);
      setCountInRemaining(0);
      audioEngine.stopTransport();
    } else {
      setIsMetronomeRunning(false);
      setIsDemoPlaying(true);
      launchTransport('demo', safeStepIndex);
    }
  }, [isDemoPlaying, launchTransport, safeStepIndex]);

  const handleToggleMetronome = useCallback(() => {
    if (isMetronomeRunning) {
      setIsMetronomeRunning(false);
      setCountInRemaining(0);
      audioEngine.stopTransport();
    } else {
      setIsDemoPlaying(false);
      setMetronomeSubTick(0);
      setIsMetronomeRunning(true);
      launchTransport('metronome', safeStepIndex);
    }
  }, [isMetronomeRunning, launchTransport, safeStepIndex]);

  // Switch Lesson handler
  const handleSelectLesson = useCallback(
    (lesson: TimeSignatureLesson) => {
      audioEngine.stopTransport();
      setIsDemoPlaying(false);
      setIsMetronomeRunning(false);
      setCountInRemaining(0);
      setActiveLesson(lesson);
      setBpm(lesson.recommendedBpm);
      setActiveStepIndex(0);
      setActiveSubNoteIndex(0);

      const { steps: nextSteps } = buildMeterAwarePattern(
        lesson,
        activePattern,
        activeKey.abcKey,
        mixedSeed
      );
      triggerStepPlayback(0, nextSteps, activeKey, lesson.recommendedBpm, swingPercent);
    },
    [activePattern, activeKey, mixedSeed, swingPercent, triggerStepPlayback]
  );

  const handleSelectCategory = (cat: MeterCategory) => {
    const firstMatch = TIME_SIGNATURE_LESSONS.find((l) => l.category === cat);
    if (firstMatch) handleSelectLesson(firstMatch);
  };

  const handleSelectGroup = (grp: LessonGroup) => {
    const firstMatch = TIME_SIGNATURE_LESSONS.find((l) => l.group === grp);
    if (firstMatch) handleSelectLesson(firstMatch);
  };

  const handleSelectPattern = useCallback(
    (pat: RhythmPatternDef) => {
      audioEngine.stopTransport();
      setIsDemoPlaying(false);
      setIsMetronomeRunning(false);
      setCountInRemaining(0);
      setActivePattern(pat);
      setActiveStepIndex(0);
      setActiveSubNoteIndex(0);

      const { steps: nextSteps } = buildMeterAwarePattern(activeLesson, pat, activeKey.abcKey, mixedSeed);
      triggerStepPlayback(0, nextSteps, activeKey, bpm, swingPercent);
    },
    [activeLesson, activeKey, mixedSeed, bpm, swingPercent, triggerStepPlayback]
  );

  // Spacebar Tap Accuracy Evaluation against Hardware Lookahead Timestamps
  const evaluateUserTap = useCallback(() => {
    const now = performance.now();
    const beatMs = (60 / bpm) * 1000;
    const candidates =
      tapMode === 'pattern'
        ? expectedPatternTimestampsRef.current
        : expectedBeatTimestampsRef.current;

    // Also include predicted next beat in case the tap is early for the upcoming beat
    const lastRecorded = candidates[candidates.length - 1] ?? now;
    const allTargets = [...candidates, lastRecorded + beatMs * (currentStep.beatUnits || 1)];

    let bestSignedDelta = 0;
    let minAbs = Infinity;
    for (const target of allTargets) {
      const diff = now - target;
      if (Math.abs(diff) < minAbs) {
        minAbs = Math.abs(diff);
        bestSignedDelta = Math.round(diff);
      }
    }

    const absDelta = Math.abs(bestSignedDelta);
    let status: TapResultItem['status'] = 'Perfect';
    if (absDelta <= 28) status = 'Perfect';
    else if (absDelta <= 55) status = 'Good';
    else if (bestSignedDelta < 0) status = 'Early';
    else status = 'Late';

    const accuracy = Math.max(50, Math.min(100, Math.round(100 - (absDelta / (beatMs / 2)) * 45)));
    setTapHistory((prev) => [...prev.slice(-7), { status, deltaMs: bestSignedDelta, accuracy }]);
    audioEngine.playBeat('syncopated', currentStep.pitchFreq, 0.14);
  }, [bpm, tapMode, currentStep.beatUnits, currentStep.pitchFreq]);

  // Global Keyboard Shortcuts (Ctrl+K, Space, Arrows, M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (paletteOpen) return;

      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (tapTrainerActive) {
          if (!e.repeat) evaluateUserTap();
        } else if (!e.repeat) {
          handleToggleDemoPlay();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSelectStep(safeStepIndex - 1, true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSelectStep(safeStepIndex + 1, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setBpm((b) => Math.min(180, b + 2));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setBpm((b) => Math.max(50, b - 2));
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    paletteOpen,
    tapTrainerActive,
    evaluateUserTap,
    handleToggleDemoPlay,
    handleSelectStep,
    safeStepIndex,
    toggleMute,
  ]);

  const handleCheckInToday = () => {
    if (checkedInToday) return;
    const nextStreak = streakDays + 1;
    setStreakDays(nextStreak);
    setCheckedInToday(true);
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem('rhythm_daily_streak', String(nextStreak));
      localStorage.setItem('rhythm_daily_last_date', todayKey);
    } catch {
      // ignore storage errors
    }
    audioEngine.playTranspositionDemo(activeKey.rootMidi, false);
  };

  // Tap Trainer summary metrics
  const latestTap = tapHistory[tapHistory.length - 1] ?? null;
  const tapStats = useMemo(() => {
    if (tapHistory.length === 0) return null;
    const avgBias = Math.round(tapHistory.reduce((acc, t) => acc + t.deltaMs, 0) / tapHistory.length);
    const hitRate = Math.round(
      (tapHistory.filter((t) => t.status === 'Perfect' || t.status === 'Good').length / tapHistory.length) * 100
    );
    return { avgBias, hitRate };
  }, [tapHistory]);

  const formattedDate = useMemo(() => {
    const now = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日${weekdays[now.getDay()]} · 今日主修`;
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* =====================================================================
          TIER 1: TOP BRAND NAVIGATION BAR
      ====================================================================== */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-amber-500 text-white flex items-center justify-center shadow-2xs">
              <Drum className="w-4 h-4" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
              Rhythm Daily
            </span>
            <span className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              节拍与乐理基本功
            </span>
          </div>

          {/* Right: Meter Category Pills + Offline/PWA + Audio + Theme */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              {(
                [
                  { id: 'simple', label: '单拍子 (2/4·3/4·4/4)' },
                  { id: 'compound', label: '复拍子 (6/8·9/8·12/8)' },
                  { id: 'odd', label: '混合奇拍 (5/4·5/8·7/8)' },
                ] as const
              ).map((cat) => {
                const isActive = activeLesson.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-zinc-900 dark:bg-amber-500 text-white font-semibold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <OfflineIndicator />
            <PWAInstallButton />

            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
              title={muted ? '开启声音 (快捷键 M)' : '静音 (快捷键 M)'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
              title={darkMode ? '切换浅色模式' : '切换深色模式'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* =====================================================================
            TIER 2: LESSON TITLE BAR & FILTER SELECTOR
        ====================================================================== */}
        <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {activeLesson.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                今日推荐
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                {activeLesson.categoryLabel}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium">
                {activeLesson.pulseBadge}
              </span>
              <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 ml-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{formattedDate}</span>
              </span>
            </div>
          </div>

          {/* Right: Group Toggle + Random + Command Palette Trigger + 10-Meter Dropdown */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectGroup('basic')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeLesson.group === 'basic'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                基础节拍
              </button>
              <button
                type="button"
                onClick={() => handleSelectGroup('jazz')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeLesson.group === 'jazz'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                奇数拍与爵士
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const others = TIME_SIGNATURE_LESSONS.filter((l) => l.id !== activeLesson.id);
                const pick = others[Math.floor(Math.random() * others.length)];
                if (pick) handleSelectLesson(pick);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5 text-zinc-400" />
              <span>随机抽拍</span>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-amber-400 cursor-pointer whitespace-nowrap"
              title="打开全局快速检索面板 (Ctrl+K / Cmd+K)"
            >
              <Command className="w-3.5 h-3.5 text-amber-500" />
              <span>Ctrl K</span>
            </button>

            <div className="relative">
              <select
                aria-label="选择节拍课题"
                value={activeLesson.id}
                onChange={(e) => {
                  const found = TIME_SIGNATURE_LESSONS.find((l) => l.id === e.target.value);
                  if (found) handleSelectLesson(found);
                }}
                className="appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {TIME_SIGNATURE_LESSONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.meter} · {item.title.split('（')[0].replace(item.meter, '').trim()}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </section>

        {/* =====================================================================
            TIER 3: FULL-WIDTH FIVE-LINE STAFF SIGHT-READING CARD
        ====================================================================== */}
        <StaffCard
          lesson={activeLesson}
          activePattern={activePattern}
          onSelectPattern={handleSelectPattern}
          steps={steps}
          abcScore={abcScore}
          activeStepIndex={safeStepIndex}
          activeSubNoteIndex={activeSubNoteIndex}
          onSelectStep={handleSelectStep}
          activeKey={activeKey}
          countInRemaining={countInRemaining}
          onRefreshMixed={() => setMixedSeed((s) => s + 1)}
          swingPercent={swingPercent}
        />

        {/* =====================================================================
            TIER 4: MIDDLE 2-COLUMN BENTO GRID
        ====================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column Stack (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Left-Top Card: Current Beat & Rhythm Detail Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  当前拍点与谱面音高
                </span>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {currentStep.accentHzLabel}
                  </span>
                  <div className="mt-1 text-[11px] text-zinc-400 font-mono">
                    谱面实音 {currentStep.pitchName} ({Math.round(currentStep.pitchFreq)}Hz) · {activeKey.majorLabel}
                  </div>
                </div>
              </div>

              <div className="mt-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-[40px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">
                    {currentStep.cellPatternName}
                  </span>
                  <span className="text-2xl font-extrabold font-mono text-amber-500">
                    {currentStep.pitchName}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  口诀：{currentStep.mnemonic}
                </div>
                <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  {activeLesson.accentGrouping}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">
                  <span>小节视奏进度 ({currentStep.beatLabel})</span>
                  <span className="font-mono tabular-nums">
                    {safeStepIndex + 1} / {steps.length}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-150"
                    style={{
                      width: `${((safeStepIndex + 1) / steps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Subdivision Breakdown Chips */}
              <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">拍内时值拆解</span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    本拍共 {currentStep.ratios.length} 个五线谱音符 ({currentStep.pitchName})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {currentStep.subdivisions.map((chip, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        chip.active
                          ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-700 text-zinc-900 dark:text-zinc-100'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          chip.active ? 'bg-amber-500' : 'border border-zinc-400'
                        }`}
                      />
                      <span>{chip.code}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectStep(safeStepIndex - 1, true)}
                  className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 cursor-pointer shrink-0"
                  title="上一拍 (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleDemoPlay}
                  className="flex-1 h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isDemoPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {countInRemaining > 0 ? `预备拍 ${countInRemaining}...` : '暂停律动演示'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>慢速律动演示</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectStep(safeStepIndex + 1, true)}
                  className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 cursor-pointer shrink-0"
                  title="下一拍 (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isLooping
                      ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-400'
                  }`}
                  title="循环播放"
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => triggerStepPlayback(safeStepIndex)}
                  className="h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>试听</span>
                </button>
              </div>

              <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                Web Audio 硬件时钟驱动：<strong className="text-zinc-700 dark:text-zinc-300">{bpm} BPM</strong> · 快捷键 ←/→ 切拍 · ↑/↓ 调速 · Space {tapTrainerActive ? '测准' : '播放'}
              </p>
            </div>

            {/* Left-Bottom 2-Column Sub-Grid: Metronome (with Subdivisions, Swing, Count-in) + Streak & Tap Trainer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
              {/* Sub-Card 1: Metronome Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">节拍器</h3>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        细分脉冲 · 预备拍 · Swing
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: Math.min(6, activeLesson.beatsPerBar) }).map((_, i) => {
                        const isBeatLit =
                          (isMetronomeRunning || isDemoPlaying) &&
                          metronomeSubTick % Math.min(6, activeLesson.beatsPerBar) === i;
                        return (
                          <span
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              isBeatLit
                                ? i === 0
                                  ? 'bg-amber-500 scale-125'
                                  : 'bg-sky-500 scale-110'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* BPM Display */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setBpm((b) => Math.max(50, b - 2))}
                      className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 cursor-pointer"
                      title="降低 BPM (↓)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-center">
                      <span className="text-3xl font-extrabold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        {bpm}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">BPM</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBpm((b) => Math.min(180, b + 2))}
                      className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 cursor-pointer"
                      title="提高 BPM (↑)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* BPM Range Slider */}
                  <div className="mt-2">
                    <input
                      type="range"
                      aria-label="节拍器速度 BPM"
                      min={50}
                      max={180}
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-full accent-zinc-900 dark:accent-amber-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                  </div>

                  {/* Subdivision Modes (1x | 2x | 4x | 3x) */}
                  <div className="mt-2.5 flex items-center justify-between gap-1.5">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">细分</span>
                    <div className="grid grid-cols-4 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex-1">
                      {(
                        [
                          { id: '1x', label: '1x' },
                          { id: '2x', label: '2x' },
                          { id: '4x', label: '4x' },
                          { id: '3x', label: '3x' },
                        ] as const
                      ).map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSubdivision(sub.id)}
                          className={`py-0.5 rounded-md text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                            subdivision === sub.id
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Swing Slider (50% Straight <-> 66% Triplet Swing) */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                      <span>Swing 摇摆度</span>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {swingPercent === 50 ? '50% 直拍' : `${swingPercent}% 摇摆`}
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Swing 摇摆度"
                      min={50}
                      max={66}
                      value={swingPercent}
                      onChange={(e) => setSwingPercent(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                  </div>

                  {/* Quick Meter Switch Pills */}
                  <div className="mt-2.5 grid grid-cols-5 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center">
                    {['2/4', '3/4', '4/4', '6/8', '5/4'].map((m) => {
                      const isCurr = activeLesson.meter === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            const found = TIME_SIGNATURE_LESSONS.find((l) => l.meter === m);
                            if (found) handleSelectLesson(found);
                          }}
                          className={`py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                            isCurr
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>

                  {/* Toggles: Count-in + Auto-advance */}
                  <div className="mt-2.5 space-y-1.5">
                    <label className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                      <span>1小节预备拍</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={countInEnabled}
                        onClick={() => setCountInEnabled(!countInEnabled)}
                        className={`w-8 h-4.5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                          countInEnabled
                            ? 'bg-zinc-900 dark:bg-amber-500 justify-end'
                            : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
                      </button>
                    </label>

                    <label className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                      <span>随节拍推进五线谱</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoAdvanceStaff}
                        onClick={() => setAutoAdvanceStaff(!autoAdvanceStaff)}
                        className={`w-8 h-4.5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                          autoAdvanceStaff
                            ? 'bg-zinc-900 dark:bg-amber-500 justify-end'
                            : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
                      </button>
                    </label>
                  </div>
                </div>

                {/* Start Metronome Button */}
                <button
                  type="button"
                  onClick={handleToggleMetronome}
                  className="mt-3 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isMetronomeRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {countInRemaining > 0 ? `预备拍 ${countInRemaining}...` : '停止节拍器'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>开始节拍器跟练</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sub-Card 2: Streak Check-in & Upgraded Tap Accuracy Trainer */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">连续打卡</h3>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        数据保存在本机浏览器
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      15分钟/天
                    </span>
                  </div>

                  {/* Big Streak Counter */}
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {streakDays}
                    </span>
                    <span className="text-xs text-zinc-500">天</span>
                  </div>

                  {/* 7-Day Circles */}
                  <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
                    {WEEKDAY_LABELS.map((day, idx) => {
                      const isToday = idx === 6;
                      const pastStreak = checkedInToday ? Math.max(0, streakDays - 1) : streakDays;
                      const isDone = isToday ? checkedInToday : idx >= 6 - Math.min(6, pastStreak);
                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                              isDone
                                ? 'bg-amber-500 text-white'
                                : isToday
                                ? 'border border-dashed border-zinc-400 dark:border-zinc-500 text-zinc-500'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isDone ? <Check className="w-3 h-3" /> : ''}
                          </div>
                          <span
                            className={`text-[10px] ${
                              isToday ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Upgraded Spacebar Tap Accuracy Interactive Trainer */}
                  <div className="mt-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1">
                        <Keyboard className="w-3.5 h-3.5 text-amber-500" />
                        打拍测准器
                      </span>
                      {latestTap ? (
                        <span
                          className={`font-mono font-bold ${
                            latestTap.status === 'Perfect'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : latestTap.status === 'Good'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {latestTap.status} ({latestTap.deltaMs > 0 ? `+${latestTap.deltaMs}` : latestTap.deltaMs}ms)
                        </span>
                      ) : (
                        <span className="text-zinc-400">按空格跟打</span>
                      )}
                    </div>

                    {/* Mode Toggle: 正拍踩点 | 全节奏跟打 */}
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-200/70 dark:bg-zinc-900 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTapMode('beat')}
                        className={`py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                          tapMode === 'beat'
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        正拍踩点
                      </button>
                      <button
                        type="button"
                        onClick={() => setTapMode('pattern')}
                        className={`py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                          tapMode === 'pattern'
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        全节奏型跟打
                      </button>
                    </div>

                    {/* 8-Tap Offset Distribution Bar (Early <- 0ms -> Late) */}
                    <div>
                      <div className="relative h-6 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700 overflow-hidden flex items-center">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-600" />
                        <div className="absolute left-[calc(50%-14px)] right-[calc(50%-14px)] top-0 bottom-0 bg-emerald-500/10" />
                        {tapHistory.map((item, idx) => {
                          const clamped = Math.max(-120, Math.min(120, item.deltaMs));
                          const leftPct = 50 + (clamped / 120) * 44;
                          const isNewest = idx === tapHistory.length - 1;
                          const dotColor =
                            item.status === 'Perfect'
                              ? 'bg-emerald-500'
                              : item.status === 'Good'
                              ? 'bg-amber-500'
                              : 'bg-sky-500';
                          return (
                            <span
                              key={idx}
                              style={{ left: `${leftPct}%` }}
                              className={`absolute -translate-x-1/2 rounded-full transition-all ${dotColor} ${
                                isNewest ? 'w-2.5 h-2.5 ring-2 ring-white dark:ring-zinc-900 z-10' : 'w-1.5 h-1.5 opacity-60'
                              }`}
                              title={`${item.status}: ${item.deltaMs}ms`}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>Early</span>
                        <span>
                          {tapStats
                            ? `均偏 ${tapStats.avgBias > 0 ? `+${tapStats.avgBias}` : tapStats.avgBias}ms · 命中 ${tapStats.hitRate}%`
                            : '0ms 中心线'}
                        </span>
                        <span>Late</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!tapTrainerActive) {
                          setTapTrainerActive(true);
                          if (!isMetronomeRunning && !isDemoPlaying) {
                            handleToggleMetronome();
                          }
                        } else {
                          evaluateUserTap();
                        }
                      }}
                      className={`w-full py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        tapTrainerActive
                          ? 'bg-amber-500/15 border-amber-400 text-amber-800 dark:text-amber-300'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {tapTrainerActive ? '点此或按 [Space空格键] 敲击测准' : '⌨️ 开启空格键打拍测准'}
                    </button>
                  </div>
                </div>

                {/* Check-in CTA Button */}
                <button
                  type="button"
                  onClick={handleCheckInToday}
                  className={`mt-3 w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    checkedInToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{checkedInToday ? '今日已完成练拍打卡' : '完成今日打卡'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Interactive Circle of Fifths & Rhythm Geometry Card */}
          <div className="lg:col-span-7">
            <CircleOfFifthsCard
              activeKey={activeKey}
              onSelectKey={setActiveKey}
              lesson={activeLesson}
              activePattern={activePattern}
              activeStep={currentStep}
              activeStepIndex={safeStepIndex}
              bpm={bpm}
            />
          </div>
        </section>

        {/* =====================================================================
            TIER 5: FULL-WIDTH CIRCLE OF FIFTHS <-> PIANO KEYBOARD & TRANSPOSITION CARD
        ====================================================================== */}
        <PianoTranspositionCard
          activeKey={activeKey}
          onSelectKey={setActiveKey}
          activeMode={activeMode}
          onSelectMode={setActiveMode}
        />

        {/* =====================================================================
            TIER 6: BOTTOM "今日练拍与乐理重点" 3-COLUMN CARDS
        ====================================================================== */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Lightbulb className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                今日练拍与乐理重点
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
                  {activeLesson.title.split('（')[0]} · {activePattern.name}：
                </strong>
                {activeLesson.summarySubtitle}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeLesson.tips.map((tip) => (
              <div
                key={tip.num}
                className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/30 p-4"
              >
                <div className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500">
                  {tip.num}
                </div>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {tip.title}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {tip.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* =====================================================================
          FOOTER
      ====================================================================== */}
      <footer className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 border-t border-zinc-200/60 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <span>Rhythm Daily · 节拍视奏、五度圈与调式每日基本功</span>
        <span>坚持练习，律动自见</span>
      </footer>

      {/* Quick Command Palette Modal (Ctrl+K / Cmd+K) */}
      <CommandPaletteModal
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectLesson={handleSelectLesson}
        onSelectPattern={handleSelectPattern}
        onSelectKey={(keyInfo) => {
          setActiveKey(keyInfo);
          audioEngine.playChord(keyInfo.chords[0].frequencies, 0.75, 25);
        }}
        onSelectMode={(mode) => {
          setActiveMode(mode);
          audioEngine.playTranspositionDemo(
            activeKey.rootMidi,
            mode.semitones.includes(3),
            mode.semitones
          );
        }}
      />
    </div>
  );
}
