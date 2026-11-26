// Web Audio API Hardware-Clock Synthesizer & Lookahead Scheduler for Rhythm Daily

export type SoundMode = 'both' | 'tone' | 'click';
export type MetronomeSubdivision = '1x' | '2x' | '4x' | '3x';

export interface ScheduledBeatStep {
  pitchFreq: number;
  ratios: number[];
  accentType: 'strong' | 'medium' | 'weak' | 'syncopated';
  beatUnits: number; // 1.0 = quarter beat, 1.5 = 3-eighth macro-beat, etc.
}

export interface TransportConfig {
  mode: 'demo' | 'metronome';
  bpm: number;
  swingPercent: number; // 50 (straight) .. 66 (triplet swing)
  subdivision: MetronomeSubdivision;
  beatsPerBar: number;
  beatUnitWeights?: number[]; // e.g. [1.5, 1.0] for 5/8, [1, 1, 1.5] for 7/8
  steps: ScheduledBeatStep[];
  startStepIndex: number;
  autoAdvanceStaff: boolean;
  loop: boolean;
  countIn: boolean;
  onBeatStart: (event: {
    isCountIn: boolean;
    countInRemaining: number;
    stepIndex: number;
    barBeatIndex: number;
    beatUnits: number;
    expectedOnsetPerfMs: number;
    subdivisionPerfOffsetsMs: number[];
  }) => void;
  onSubNote: (stepIndex: number, subIndex: number) => void;
  onComplete: () => void;
}

export function applySwingToRatios(ratios: number[], swingPercent: number): number[] {
  if (swingPercent <= 50) return ratios;
  const s = Math.max(0.5, Math.min(0.67, swingPercent / 100));
  if (ratios.length === 2 && Math.abs(ratios[0] - 0.5) < 0.02 && Math.abs(ratios[1] - 0.5) < 0.02) {
    return [s, 1 - s];
  }
  if (ratios.length === 4 && ratios.every((r) => Math.abs(r - 0.25) < 0.02)) {
    const a = 0.5 * s;
    const b = 0.5 * (1 - s);
    return [a, b, a, b];
  }
  return ratios;
}

class RhythmAudioEngine {
  private ctx: AudioContext | null = null;
  private activeTimers: number[] = [];
  public muted: boolean = false;
  public soundMode: SoundMode = 'both';

  // Hardware-clock lookahead scheduler state
  private schedulerIntervalId: number | null = null;
  private uiQueueTimerId: number | null = null;
  private transportConfig: TransportConfig | null = null;
  private nextNoteTime: number = 0;
  private countInRemaining: number = 0;
  private currentStepIndex: number = 0;
  private barBeatIndex: number = 0;
  private isRunning: boolean = false;

  private pendingUiEvents: Array<{
    audioTime: number;
    type: 'beat' | 'sub' | 'complete';
    payload: unknown;
  }> = [];

  private getContext(allowMuted: boolean = false): AudioContext | null {
    if (this.muted && !allowMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Clear legacy one-shot timers and stop hardware-clock transport
   */
  public clearScheduledSubdivisions() {
    this.activeTimers.forEach((id) => window.clearTimeout(id));
    this.activeTimers = [];
  }

  public stopTransport() {
    this.isRunning = false;
    this.transportConfig = null;
    this.pendingUiEvents = [];
    if (this.schedulerIntervalId !== null) {
      window.clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    if (this.uiQueueTimerId !== null) {
      window.cancelAnimationFrame(this.uiQueueTimerId);
      this.uiQueueTimerId = null;
    }
    this.clearScheduledSubdivisions();
  }

  public updateTransportParams(partial: Partial<TransportConfig>) {
    if (!this.transportConfig) return;
    this.transportConfig = { ...this.transportConfig, ...partial };
  }

  public seekStep(stepIndex: number) {
    if (!this.isRunning || !this.transportConfig) return;
    const total = this.transportConfig.steps.length;
    if (total <= 0) return;
    this.currentStepIndex = ((stepIndex % total) + total) % total;
  }

  /**
   * Start hardware-clock Web Audio Lookahead Scheduler (25ms poll / 100ms lookahead)
   */
  public startTransport(config: TransportConfig) {
    this.stopTransport();
    const ctx = this.getContext(true);
    if (!ctx) return;

    this.transportConfig = config;
    this.isRunning = true;
    this.countInRemaining = config.countIn ? config.beatsPerBar : 0;
    this.currentStepIndex = config.startStepIndex;
    this.barBeatIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.04;

    const LOOKAHEAD_SEC = 0.11;
    const POLL_MS = 25;

    const scheduleStep = () => {
      if (!this.isRunning || !this.transportConfig || !this.ctx) return;
      const cfg = this.transportConfig;
      const beatBaseSec = 60 / Math.max(40, Math.min(240, cfg.bpm));

      while (this.nextNoteTime < this.ctx.currentTime + LOOKAHEAD_SEC) {
        const audioTime = this.nextNoteTime;
        const audioDeltaSec = audioTime - this.ctx.currentTime;
        const expectedOnsetPerfMs = performance.now() + audioDeltaSec * 1000;

        if (this.countInRemaining > 0) {
          // Schedule 1-bar Count-in click
          const countIdx = cfg.beatsPerBar - this.countInRemaining;
          const weight = cfg.beatUnitWeights?.[countIdx % cfg.beatUnitWeights.length] ?? 1;
          const stepDurSec = beatBaseSec * weight;

          this.scheduleClickAt(
            this.ctx,
            audioTime,
            countIdx === 0 ? 'strong' : 'medium',
            countIdx === 0 ? 1046.5 : 784
          );

          this.pendingUiEvents.push({
            audioTime,
            type: 'beat',
            payload: {
              isCountIn: true,
              countInRemaining: this.countInRemaining,
              stepIndex: this.currentStepIndex,
              barBeatIndex: countIdx,
              beatUnits: weight,
              expectedOnsetPerfMs,
              subdivisionPerfOffsetsMs: [0],
            },
          });

          this.countInRemaining -= 1;
          this.nextNoteTime += stepDurSec;
          continue;
        }

        const step = cfg.steps[this.currentStepIndex] || cfg.steps[0];
        const stepDurSec = beatBaseSec * (step?.beatUnits ?? 1);
        const isBarDownbeat = this.barBeatIndex === 0;

        const playPatternNotes = cfg.mode === 'demo' || (cfg.mode === 'metronome' && cfg.autoAdvanceStaff);
        let subOffsetsMs: number[] = [0];

        if (playPatternNotes && step) {
          const swungRatios = applySwingToRatios(step.ratios, cfg.swingPercent);
          let relOffsetSec = 0;
          subOffsetsMs = [];

          swungRatios.forEach((ratio, subIdx) => {
            const subTime = audioTime + relOffsetSec;
            const subDurSec = stepDurSec * ratio;
            subOffsetsMs.push(relOffsetSec * 1000);

            const isSyncMid = step.accentType === 'syncopated' && swungRatios.length === 3 && subIdx === 1;
            const subAccent: 'strong' | 'medium' | 'weak' | 'syncopated' | 'sub' =
              subIdx === 0
                ? step.accentType === 'syncopated'
                  ? 'weak'
                  : isBarDownbeat
                  ? 'strong'
                  : step.accentType
                : isSyncMid
                ? 'syncopated'
                : 'sub';

            const noteSoundDur = Math.max(0.08, Math.min(0.9, subDurSec * 0.86));
            this.scheduleBeatAt(this.ctx!, subTime, subAccent, step.pitchFreq, noteSoundDur);

            this.pendingUiEvents.push({
              audioTime: subTime,
              type: 'sub',
              payload: { stepIndex: this.currentStepIndex, subIndex: subIdx },
            });

            relOffsetSec += subDurSec;
          });

          // If running metronome with subdivision clicks in background & autoAdvanceStaff, also layer subtle subdivision clicks if requested
          if (cfg.mode === 'metronome' && cfg.subdivision !== '1x') {
            this.scheduleMetronomeSubClicks(this.ctx, audioTime, stepDurSec, cfg.subdivision, cfg.swingPercent);
          }
        } else {
          // Pure Metronome mode (supports 1x, 2x, 4x, 3x subdivisions & swing)
          const subCount =
            cfg.subdivision === '4x' ? 4 : cfg.subdivision === '3x' ? 3 : cfg.subdivision === '2x' ? 2 : 1;
          const baseRatios = Array.from({ length: subCount }, () => 1 / subCount);
          const subRatios = applySwingToRatios(baseRatios, cfg.swingPercent);

          let relSec = 0;
          subOffsetsMs = [];
          subRatios.forEach((ratio, idx) => {
            const subTime = audioTime + relSec;
            subOffsetsMs.push(relSec * 1000);
            const acc: 'strong' | 'medium' | 'weak' | 'sub' =
              idx === 0 ? (isBarDownbeat ? 'strong' : 'weak') : 'sub';
            const pitch = idx === 0 ? (isBarDownbeat ? 880 : 440) : 540;
            this.scheduleBeatAt(this.ctx!, subTime, acc, pitch, Math.max(0.07, stepDurSec * ratio * 0.65));
            relSec += stepDurSec * ratio;
          });
        }

        this.pendingUiEvents.push({
          audioTime,
          type: 'beat',
          payload: {
            isCountIn: false,
            countInRemaining: 0,
            stepIndex: this.currentStepIndex,
            barBeatIndex: this.barBeatIndex,
            beatUnits: step?.beatUnits ?? 1,
            expectedOnsetPerfMs,
            subdivisionPerfOffsetsMs: subOffsetsMs,
          },
        });

        // Advance counters
        this.barBeatIndex = (this.barBeatIndex + 1) % cfg.beatsPerBar;
        if (playPatternNotes) {
          const nextStep = this.currentStepIndex + 1;
          if (nextStep >= cfg.steps.length) {
            if (!cfg.loop && cfg.mode === 'demo') {
              this.pendingUiEvents.push({
                audioTime: audioTime + stepDurSec,
                type: 'complete',
                payload: null,
              });
              this.isRunning = false;
              break;
            }
            this.currentStepIndex = 0;
          } else {
            this.currentStepIndex = nextStep;
          }
        }

        this.nextNoteTime += stepDurSec;
      }
    };

    const flushUiEvents = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      while (this.pendingUiEvents.length > 0 && this.pendingUiEvents[0].audioTime <= now + 0.015) {
        const evt = this.pendingUiEvents.shift()!;
        const cfg = this.transportConfig;
        if (!cfg) break;
        if (evt.type === 'beat') {
          cfg.onBeatStart(evt.payload as Parameters<TransportConfig['onBeatStart']>[0]);
        } else if (evt.type === 'sub') {
          const p = evt.payload as { stepIndex: number; subIndex: number };
          cfg.onSubNote(p.stepIndex, p.subIndex);
        } else if (evt.type === 'complete') {
          cfg.onComplete();
          this.stopTransport();
          return;
        }
      }
      if (this.isRunning || this.pendingUiEvents.length > 0) {
        this.uiQueueTimerId = window.requestAnimationFrame(flushUiEvents);
      }
    };

    scheduleStep();
    this.schedulerIntervalId = window.setInterval(scheduleStep, POLL_MS);
    this.uiQueueTimerId = window.requestAnimationFrame(flushUiEvents);
  }

  private scheduleMetronomeSubClicks(
    ctx: AudioContext,
    beatTime: number,
    beatDurSec: number,
    subdivision: MetronomeSubdivision,
    swingPercent: number
  ) {
    const subCount = subdivision === '4x' ? 4 : subdivision === '3x' ? 3 : 2;
    const ratios = applySwingToRatios(
      Array.from({ length: subCount }, () => 1 / subCount),
      swingPercent
    );
    let rel = 0;
    ratios.forEach((r, idx) => {
      if (idx > 0) {
        this.scheduleClickAt(ctx, beatTime + rel, 'sub', 520);
      }
      rel += beatDurSec * r;
    });
  }

  private scheduleClickAt(
    ctx: AudioContext,
    time: number,
    accent: 'strong' | 'medium' | 'weak' | 'syncopated' | 'sub',
    freqOverride?: number
  ) {
    if (this.muted) return;
    if (this.soundMode !== 'both' && this.soundMode !== 'click') return;

    const clickFreqMap = {
      strong: 880,
      medium: 660,
      syncopated: 587.33,
      weak: 440,
      sub: 520,
    };
    const baseClickFreq = freqOverride ?? clickFreqMap[accent];

    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = accent === 'strong' ? 'triangle' : 'sine';
    clickOsc.frequency.setValueAtTime(baseClickFreq * 1.2, time);
    clickOsc.frequency.exponentialRampToValueAtTime(baseClickFreq * 0.65, time + 0.04);

    const peakGain =
      accent === 'strong'
        ? 0.36
        : accent === 'medium'
        ? 0.25
        : accent === 'syncopated'
        ? 0.32
        : accent === 'weak'
        ? 0.19
        : 0.13;

    clickGain.gain.setValueAtTime(0.001, time);
    clickGain.gain.linearRampToValueAtTime(peakGain, time + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.048);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(time);
    clickOsc.stop(time + 0.055);
  }

  private scheduleBeatAt(
    ctx: AudioContext,
    time: number,
    accent: 'strong' | 'medium' | 'weak' | 'syncopated' | 'sub',
    noteFreq: number,
    durationSec: number
  ) {
    if (this.muted) return;

    if (this.soundMode === 'both' || this.soundMode === 'click') {
      this.scheduleClickAt(ctx, time, accent);
    }

    if (this.soundMode === 'both' || this.soundMode === 'tone') {
      const pitch = noteFreq || 261.63;
      const noteVolume =
        accent === 'strong' ? 0.3 : accent === 'syncopated' ? 0.28 : accent === 'sub' ? 0.2 : 0.25;
      this.triggerPianoVoice(ctx, pitch, time, durationSec, noteVolume);
    }
  }

  /**
   * Immediate one-shot beat sound (used for Tap feedback and geometry dot clicks)
   */
  public playBeat(
    accent: 'strong' | 'medium' | 'weak' | 'syncopated' | 'sub' = 'weak',
    noteFreq?: number,
    durationSec: number = 0.22
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.scheduleBeatAt(ctx, ctx.currentTime, accent, noteFreq || 261.63, durationSec);
  }

  /**
   * Play a single beat's internal subdivisions immediately using AudioContext hardware scheduling
   */
  public playRhythmCell(
    ratios: number[],
    bpm: number,
    accent: 'strong' | 'medium' | 'weak' | 'syncopated' = 'strong',
    pitchFreq: number = 261.63,
    onSubNote?: (subIndex: number) => void,
    beatUnits: number = 1,
    swingPercent: number = 50
  ) {
    this.clearScheduledSubdivisions();
    const ctx = this.getContext(true);
    if (!ctx) return;

    const swungRatios = applySwingToRatios(ratios, swingPercent);
    const beatDurationSec = (60 / Math.max(40, Math.min(240, bpm))) * beatUnits;
    const baseTime = ctx.currentTime;
    let offsetSec = 0;

    swungRatios.forEach((ratio, idx) => {
      const subDur = beatDurationSec * ratio;
      const subTime = baseTime + offsetSec;
      const delayMs = Math.round(offsetSec * 1000);

      const isSyncopatedMiddle = accent === 'syncopated' && swungRatios.length === 3 && idx === 1;
      const subAccent: 'strong' | 'medium' | 'weak' | 'syncopated' | 'sub' =
        idx === 0 ? (accent === 'syncopated' ? 'weak' : accent) : isSyncopatedMiddle ? 'syncopated' : 'sub';

      const noteSoundDuration = Math.max(0.09, Math.min(0.85, subDur * 0.86));
      this.scheduleBeatAt(ctx, subTime, subAccent, pitchFreq, noteSoundDuration);

      if (onSubNote) {
        if (delayMs === 0) {
          onSubNote(0);
        } else {
          const timerId = window.setTimeout(() => onSubNote(idx), delayMs);
          this.activeTimers.push(timerId);
        }
      }

      offsetSec += subDur;
    });
  }

  public playPianoNote(freqOrMidi: number, durationSec: number = 0.55, isMidi: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const freq = isMidi ? 440 * Math.pow(2, (freqOrMidi - 69) / 12) : freqOrMidi;
    this.triggerPianoVoice(ctx, freq, ctx.currentTime, durationSec, 0.28);
  }

  public playChord(frequencies: number[], durationSec: number = 0.85, arpeggiateMs: number = 28) {
    const ctx = this.getContext();
    if (!ctx) return;
    frequencies.forEach((freq, idx) => {
      const startTime = ctx.currentTime + (idx * arpeggiateMs) / 1000;
      this.triggerPianoVoice(ctx, freq, startTime, durationSec, 0.18);
    });
  }

  public playTranspositionDemo(
    rootMidi: number,
    isMinor: boolean = false,
    customSemitones?: number[]
  ) {
    this.clearScheduledSubdivisions();
    const ctx = this.getContext();
    if (!ctx) return;

    const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const intervals = customSemitones
      ? [...customSemitones, 12]
      : isMinor
      ? [0, 2, 3, 5, 7, 8, 11, 12]
      : [0, 2, 4, 5, 7, 9, 11, 12];

    const thirdInterval = intervals.includes(3) ? 3 : 4;
    const baseTime = ctx.currentTime;

    intervals.forEach((semi, idx) => {
      this.triggerPianoVoice(ctx, midiToFreq(rootMidi + semi), baseTime + idx * 0.14, 0.22, 0.26);
    });

    const triadStart = baseTime + intervals.length * 0.14 + 0.06;
    const triad = [
      midiToFreq(rootMidi),
      midiToFreq(rootMidi + thirdInterval),
      midiToFreq(rootMidi + 7),
      midiToFreq(rootMidi + 12),
    ];
    triad.forEach((freq, idx) => {
      this.triggerPianoVoice(ctx, freq, triadStart + idx * 0.025, 0.9, 0.18);
    });
  }

  private triggerPianoVoice(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    durationSec: number,
    volume: number
  ) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4800, freq * 5.5), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(600, freq * 1.8), startTime + durationSec);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(volume * 0.45, startTime + durationSec * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.24, startTime);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + durationSec + 0.02);
    osc2.stop(startTime + durationSec + 0.02);
  }
}

export const audioEngine = new RhythmAudioEngine();
