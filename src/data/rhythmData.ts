// Complete Music Theory, Meter-Aware 10 Time Signatures, 10 Rhythm Patterns (including Mixed Sight-Reading) & 12-Key Circle of Fifths Dataset

export type MeterCategory = 'simple' | 'compound' | 'odd';
export type LessonGroup = 'basic' | 'jazz';
export type BeatGridKind = 'quarter' | 'half' | 'dotted';

export interface SubdivisionChip {
  label: string;
  code: string;
  active: boolean;
}

export interface BeatStepItem {
  id: number;
  beatLabel: string; // e.g., "第1小节·第1拍"
  pillText: string; // Displayed inside the clickable pill under the staff
  patternTitle: string; // Large title in top-left detail card
  cellPatternName: string; // Name of this specific beat's cell (crucial for Mixed Sight-Reading)
  cellMnemonic: string; // Short mnemonic for this specific beat's cell
  mnemonic: string; // Full mnemonic + description
  subDescription: string;
  accentType: 'strong' | 'medium' | 'weak' | 'syncopated';
  accentHzLabel: string; // e.g., "强拍 880Hz · 小节拍头"
  baseLetter: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  baseOctave: 4 | 5;
  pitchName: string; // Default C-major pitch name e.g. "C4"
  pitchFreq: number; // Default C-major pitch freq in Hz
  ratios: number[]; // Subdivision duration ratios within this beat
  beatUnits: number; // Relative beat length in metronome beats (1.0 standard, 1.5 for 3-eighth macro-beat in 5/8 & 7/8)
  noteCountOnStaff: number; // Exact number of .abcjs-note elements rendered on the staff for this beat
  subdivisions: SubdivisionChip[];
  hasDotOrSyncopation?: boolean;
}

export interface RhythmPatternDef {
  id: string;
  name: string; // 四分脉搏 | 二八节奏 | 四十六 | 前八后十六 | 前十六后八 | 小切分 | 大切分 | 附点节奏 | 三连音 | 随机混合视奏
  shortMnemonic: string;
  focusTip: string;
  keyFocusBadges: string[];
  description: string;
  defaultRatios: number[];
  isRandomMixed?: boolean;
}

export interface TimeSignatureLesson {
  id: string;
  meter: string; // '2/4', '3/4', '4/4', '2/2', '6/8', '9/8', '12/8', '5/4', '5/8', '7/8'
  title: string;
  category: MeterCategory;
  categoryLabel: string;
  group: LessonGroup;
  pulseBadge: string;
  feelBadge: string;
  recommendedBpm: number;
  beatsPerBar: number; // Macro-beats per bar (e.g., 6/8 has 2 macro-beats, 5/8 has 2, 7/8 has 3, 5/4 has 5)
  beatUnit: number;
  barCount: number; // Authentic bar count displayed on the staff
  beatGrids: BeatGridKind[]; // Per-macro-beat grid within a bar
  beatUnitWeights: number[]; // Relative duration weights for metronome & playback
  accentBarIndices: number[]; // Beat indices inside a bar with strong/medium accent
  accentGrouping: string;
  geometryNodes: number;
  geometryAccents: number[];
  summarySubtitle: string;
  tips: [
    { num: '01'; title: string; body: string },
    { num: '02'; title: string; body: string },
    { num: '03'; title: string; body: string }
  ];
}

export interface DiatonicChordItem {
  degree: string;
  chordName: string;
  seventhName: string;
  roleName: string;
  notesLabel: string;
  frequencies: number[];
  isPrimary: boolean;
}

export interface CircleKeyInfo {
  id: string;
  chromaticNote: string;
  circleOrder: number;
  majorLabel: string;
  minorKey: string;
  minorLabel: string;
  accidentalCountLabel: string;
  accidentalsDetail: string;
  abcKey: string;
  rootMidi: number;
  minorRootMidi: number;
  altoSaxKey: string;
  altoSaxAccidental: string;
  altoSaxNote: string;
  sopranoSaxKey: string;
  sopranoSaxAccidental: string;
  sopranoSaxNote: string;
  diziThumbNote: string;
  chords: DiatonicChordItem[];
}

export interface ModeDefinition {
  id: string;
  name: string;
  englishName: string;
  formula: string;
  semitones: number[];
  characteristicNote: string;
  colorMood: string;
}

export interface ChordProgressionPreset {
  id: string;
  label: string;
  chordIndices: number[]; // Indices into CircleKeyInfo.chords (0=I, 1=ii, 2=iii, 3=IV, 4=V, 5=vi, 6=vii°)
}

export const CHORD_PROGRESSIONS: ChordProgressionPreset[] = [
  { id: 'pop', label: 'I-vi-IV-V', chordIndices: [0, 5, 3, 4] },
  { id: 'jazz', label: 'ii7-V7-Imaj7', chordIndices: [1, 4, 0, 0] },
  { id: 'classic', label: 'I-IV-V-I', chordIndices: [0, 3, 4, 0] },
];

// Base semitone offset from C for natural notes C..B
const NATURAL_SEMITONES: Record<'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Key signature accidental alterations (+1 for sharp, -1 for flat) for each key ID
const KEY_SIGNATURE_ALTERATIONS: Record<string, Partial<Record<'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', number>>> = {
  C: {},
  G: { F: 1 },
  D: { F: 1, C: 1 },
  A: { F: 1, C: 1, G: 1 },
  E: { F: 1, C: 1, G: 1, D: 1 },
  B: { F: 1, C: 1, G: 1, D: 1, A: 1 },
  'F#': { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 },
  Db: { B: -1, E: -1, A: -1, D: -1, G: -1 },
  Ab: { B: -1, E: -1, A: -1, D: -1 },
  Eb: { B: -1, E: -1, A: -1 },
  Bb: { B: -1, E: -1 },
  F: { B: -1 },
};

/**
 * Given a BeatStepItem and the active CircleKeyInfo, compute the exact sounding pitch name
 * and frequency (in Hz) that matches the five-line staff's key signature and octave (C4-C5).
 */
export function resolveStepPitchForKey(
  step: BeatStepItem,
  keyId: string
): { pitchName: string; pitchFreq: number; midi: number } {
  const alterations = KEY_SIGNATURE_ALTERATIONS[keyId] || {};
  const alter = alterations[step.baseLetter] || 0;
  const baseSemi = NATURAL_SEMITONES[step.baseLetter];
  const midi = (step.baseOctave + 1) * 12 + baseSemi + alter;
  const pitchFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const accidentalSymbol = alter === 1 ? '#' : alter === -1 ? 'b' : '';
  const pitchName = `${step.baseLetter}${accidentalSymbol}${step.baseOctave}`;
  return { pitchName, pitchFreq, midi };
}

// 10 Complete Meter-Aware Time Signature Lessons
export const TIME_SIGNATURE_LESSONS: TimeSignatureLesson[] = [
  {
    id: '4-4',
    meter: '4/4',
    title: '4/4 四四拍（五线谱视奏 · 流行与古典标准脉搏）',
    category: 'simple',
    categoryLabel: '单拍子',
    group: 'basic',
    pulseBadge: '每小节4拍 · 四分音符为一拍',
    feelBadge: '强 · 弱 · 次强 · 弱',
    recommendedBpm: 80,
    beatsPerBar: 4,
    beatUnit: 4,
    barCount: 4,
    beatGrids: ['quarter', 'quarter', 'quarter', 'quarter'],
    beatUnitWeights: [1, 1, 1, 1],
    accentBarIndices: [0, 2],
    accentGrouping: '● 强 (1) · ○ 弱 (2) · ◎ 次强 (3) · ○ 弱 (4)',
    geometryNodes: 16,
    geometryAccents: [0, 4, 8, 12],
    summarySubtitle: '以四分音符（Quarter Note）为稳定步频，掌握第 1 拍重音下沉与第 3 拍次强推进。',
    tips: [
      {
        num: '01',
        title: '速度循序渐进',
        body: '先用 60–80 BPM 慢速跟打四分脉搏与二八节奏，确保每个十六分音符颗粒均匀、不抢拍，再逐步提速至 100–120 BPM。',
      },
      {
        num: '02',
        title: '正拍脚踩与反拍口念',
        body: '练习前八后十六与小切分时，脚尖稳定踩住 1-2-3-4 正拍点，口中用 Da-Di-mi 清晰切分，避免正反拍重心颠倒。',
      },
      {
        num: '03',
        title: '五度圈升降号铁律',
        body: '顺时针每走一格纯五度增加 1 个升号（F-C-G-D-A-E-B），逆时针每走一格纯四度增加 1 个降号（B-E-A-D-G-C-F）。',
      },
    ],
  },
  {
    id: '6-8',
    meter: '6/8',
    title: '6/8 复二拍子（五线谱视奏 · 两大拍附点脉搏）',
    category: 'compound',
    categoryLabel: '复拍子',
    group: 'basic',
    pulseBadge: '每大拍3个八分音符 (3+3)',
    feelBadge: '附点四分音符为一大拍',
    recommendedBpm: 76,
    beatsPerBar: 2,
    beatUnit: 8,
    barCount: 4,
    beatGrids: ['dotted', 'dotted'],
    beatUnitWeights: [1, 1],
    accentBarIndices: [0, 1],
    accentGrouping: '● 强 (1-2-3) ｜ ◎ 次强 (4-5-6)',
    geometryNodes: 12,
    geometryAccents: [0, 6],
    summarySubtitle: '切忌把 6/8 当成 6 个零散拍子！核心是感受第 1 拍与第 4 拍的「两大拍摇摆船歌感」。',
    tips: [
      {
        num: '01',
        title: '速度循序渐进',
        body: '先用 65 BPM 慢速数出 1-2-3、4-5-6 六个八分音符骨架，体会第 1 拍和第 4 拍的自然钟摆重音，再过渡到大拍合流。',
      },
      {
        num: '02',
        title: '复拍子抓附点大拍',
        body: '6/8 拍灵魂在于两个附点四分音符（d. + d.）。练习时身体只在第 1、4 八分音符处轻微下沉，其余拍点保持轻盈弹性。',
      },
      {
        num: '03',
        title: '五度圈三环同心法',
        body: '五度圈外环看大调主音，中环看小三度关系小调（如 C 对应 Am），相邻左右两格即为天然的 IV 级下属与 V 级属和弦。',
      },
    ],
  },
  {
    id: '2-4',
    meter: '2/4',
    title: '2/4 二四拍（五线谱视奏 · 进行曲与民乐轻快律动）',
    category: 'simple',
    categoryLabel: '单拍子',
    group: 'basic',
    pulseBadge: '每小节2拍 · 强弱交替',
    feelBadge: '强 (1) · 弱 (2)',
    recommendedBpm: 88,
    beatsPerBar: 2,
    beatUnit: 4,
    barCount: 4,
    beatGrids: ['quarter', 'quarter'],
    beatUnitWeights: [1, 1],
    accentBarIndices: [0],
    accentGrouping: '● 强 (第1拍) · ○ 弱 (第2拍)',
    geometryNodes: 8,
    geometryAccents: [0, 4],
    summarySubtitle: '一强一弱、步伐果断，常见于进行曲、波尔卡以及竹笛/唢呐快板欢快乐段。',
    tips: [
      {
        num: '01',
        title: '一强一弱呼吸循环',
        body: '2/4 拍周期极短，第 1 拍重音要干脆利落，第 2 拍顺势收尾并为下一小节第 1 拍预留呼吸空间。',
      },
      {
        num: '02',
        title: '十六分音符颗粒度',
        body: '在 2/4 拍中演奏四十六（Da-ka-Di-mi）时，确保四个音时值完全均等，切勿把后两个十六分音符赶拍。',
      },
      {
        num: '03',
        title: '移调乐器读谱心法',
        body: '中音萨克斯（Eb）实音比记谱低大六度，高音/次中音萨克斯（Bb）实音比记谱低大二度，借助下方钢琴图可一眼锁定。',
      },
    ],
  },
  {
    id: '3-4',
    meter: '3/4',
    title: '3/4 三四拍（五线谱视奏 · 圆舞曲华尔兹三拍律动）',
    category: 'simple',
    categoryLabel: '单拍子',
    group: 'basic',
    pulseBadge: '每小节3拍 · 圆舞曲呼吸',
    feelBadge: '强 · 弱 · 弱 (● ○ ○)',
    recommendedBpm: 84,
    beatsPerBar: 3,
    beatUnit: 4,
    barCount: 4,
    beatGrids: ['quarter', 'quarter', 'quarter'],
    beatUnitWeights: [1, 1, 1],
    accentBarIndices: [0],
    accentGrouping: '● 强 (1) · ○ 弱 (2) · ○ 弱 (3)',
    geometryNodes: 12,
    geometryAccents: [0, 4, 8],
    summarySubtitle: '「蓬-嚓-嚓」三角形旋转动感，第一拍深沉落地，第二、三拍向上轻盈托起。',
    tips: [
      {
        num: '01',
        title: '避免第三拍抢拍',
        body: '三拍子最常见的误区是第 3 拍匆忙缩短、急着进入下一小节。务必让第 3 拍走满完整时值。',
      },
      {
        num: '02',
        title: '华尔兹二三拍轻抬',
        body: '想象圆舞曲舞步：第 1 拍膝盖微屈重心向下，第 2、3 拍脚尖发力向上漂浮，赋予乐句呼吸感。',
      },
      {
        num: '03',
        title: '小调导音升高原则',
        body: '和声小调需将第 7 级音升高半音（如 A 和声小调升 G#），形成强烈的导音向主音倾向。',
      },
    ],
  },
  {
    id: '2-2',
    meter: '2/2',
    title: '2/2 二二拍 Alla Breve（五线谱视奏 · 二分音符大步脉搏）',
    category: 'simple',
    categoryLabel: '单拍子',
    group: 'basic',
    pulseBadge: '以二分音符为一拍 · 2大拍',
    feelBadge: '开阔进行感 (Cut Time)',
    recommendedBpm: 72,
    beatsPerBar: 2,
    beatUnit: 2,
    barCount: 4,
    beatGrids: ['half', 'half'],
    beatUnitWeights: [1, 1],
    accentBarIndices: [0],
    accentGrouping: '● 第一大拍 (二分音符) · ○ 第二大拍 (二分音符)',
    geometryNodes: 8,
    geometryAccents: [0, 4],
    summarySubtitle: '谱面看似 4/4，但律动思维减半为「两大拍」，让快速乐段拥有从容宽广的线条感。',
    tips: [
      {
        num: '01',
        title: '思维从四拍合并为两拍',
        body: '不要逐个数四个四分音符，而是将两个四分音符视为一个完整的「一上一下」大拍。',
      },
      {
        num: '02',
        title: '切分音在二二拍的弹性',
        body: '大切分（四分-二分-四分）在 2/2 拍中极其常见，注意中间长音跨越大拍中心时的稳定支撑。',
      },
      {
        num: '03',
        title: '大调与关系小调快速定位',
        body: '任何大调主音往下数小三度（3个半音）即为关系小调主音，两者共享完全相同的五线谱调号。',
      },
    ],
  },
  {
    id: '9-8',
    meter: '9/8',
    title: '9/8 复三拍子（五线谱视奏 · 三大拍三连音抒情律动）',
    category: 'compound',
    categoryLabel: '复拍子',
    group: 'basic',
    pulseBadge: '每小节3大拍 (3+3+3)',
    feelBadge: '三大拍复合圆舞曲',
    recommendedBpm: 72,
    beatsPerBar: 3,
    beatUnit: 8,
    barCount: 4,
    beatGrids: ['dotted', 'dotted', 'dotted'],
    beatUnitWeights: [1, 1, 1],
    accentBarIndices: [0],
    accentGrouping: '● (1-2-3) · ○ (4-5-6) · ○ (7-8-9)',
    geometryNodes: 9,
    geometryAccents: [0, 3, 6],
    summarySubtitle: '3/4 拍的三拍圆舞曲骨架 + 每拍内嵌三连音八分律动，常见于夜曲、巴赫组曲与现代抒情曲。',
    tips: [
      {
        num: '01',
        title: '抓稳 1 · 4 · 7 三大支点',
        body: '9 个八分音符分为三组（123-456-789），手指或节拍器先锁定 1、4、7 三个附点四分音符支点。',
      },
      {
        num: '02',
        title: '复合拍内的连线延音',
        body: '当附点四分音符与八分音符交替出现时，内心持续默念 Da-di-da 三分脉冲，防止长音时值缩水。',
      },
      {
        num: '03',
        title: '2-5-1 爵士与流行和声进行',
        body: '在五度圈上逆时针连续退两格回到主音（如 Dm7 → G7 → Cmaj7），即为最经典的 ii-V-I 进行。',
      },
    ],
  },
  {
    id: '12-8',
    meter: '12/8',
    title: '12/8 复四拍子（五线谱视奏 · 蓝调 Blues 与慢摇滚律动）',
    category: 'compound',
    categoryLabel: '复拍子',
    group: 'jazz',
    pulseBadge: '每小节4大拍 (3+3+3+3)',
    feelBadge: 'Slow Blues & Gospel 律动',
    recommendedBpm: 68,
    beatsPerBar: 4,
    beatUnit: 8,
    barCount: 3,
    beatGrids: ['dotted', 'dotted', 'dotted', 'dotted'],
    beatUnitWeights: [1, 1, 1, 1],
    accentBarIndices: [0, 2],
    accentGrouping: '● (1-2-3) · ○ (4-5-6) · ◎ (7-8-9) · ○ (10-11-12)',
    geometryNodes: 12,
    geometryAccents: [0, 3, 6, 9],
    summarySubtitle: '四大拍附点脉搏，天然自带三连音 Swing 摇摆基因，是萨克斯慢蓝调与 R&B 必练拍号。',
    tips: [
      {
        num: '01',
        title: '建立 4 大拍 + 三分内脉冲',
        body: '脚下踩稳 4 个附点四分音符大拍，脑海中把每一拍均匀切分为「1-trip-let」，切忌打成死板的十六分音符。',
      },
      {
        num: '02',
        title: '2、4 大拍后仰 Snare 律动',
        body: '蓝调与灵魂乐中，第 2 大拍（第 4 个八分音符）与第 4 大拍（第 10 个八分音符）是核心反拍重音。',
      },
      {
        num: '03',
        title: 'Mixolydian 属七蓝调色彩',
        body: '在五度圈对应大调中将第 7 音降低半音（b7），即可获得浓郁的 Blues / Mixolydian 调式色彩。',
      },
    ],
  },
  {
    id: '5-4',
    meter: '5/4',
    title: '5/4 混合五拍子（五线谱视奏 · Take Five 爵士 3+2 律动）',
    category: 'odd',
    categoryLabel: '混合奇拍',
    group: 'jazz',
    pulseBadge: '3+2 非对称混合拍 (5拍/小节)',
    feelBadge: '经典爵士 Take Five 律动',
    recommendedBpm: 92,
    beatsPerBar: 5,
    beatUnit: 4,
    barCount: 3,
    beatGrids: ['quarter', 'quarter', 'quarter', 'quarter', 'quarter'],
    beatUnitWeights: [1, 1, 1, 1, 1],
    accentBarIndices: [0, 3],
    accentGrouping: '● 1 - ○ 2 - ○ 3 ｜ ◎ 4 - ○ 5 (3+2 组合)',
    geometryNodes: 10,
    geometryAccents: [0, 6],
    summarySubtitle: '由一个三拍子（1-2-3）加一个二拍子（4-5）拼接而成，既有华尔兹的摇曳又有进行曲的推进。',
    tips: [
      {
        num: '01',
        title: '拆解为 3+2 两段式呼吸',
        body: '把 5/4 拍口诀化为「1-2-3 | 1-2」，重点盯住第 1 拍主重音与第 4 拍次强支点，瞬间消除奇数拍陌生感。',
      },
      {
        num: '02',
        title: 'Take Five 经典伴奏型',
        body: '萨克斯名曲《Take Five》采用 Ebm 小调，前三拍走附点切分，后两拍稳落四分音符，极具绅士摇摆感。',
      },
      {
        num: '03',
        title: 'Dorian 调式与爵士小调',
        body: 'Dorian 调式（1-2-b3-4-5-6-b7）比自然小调升高了还原 6 级音，听感明亮摩登，是爵士即兴首选。',
      },
    ],
  },
  {
    id: '5-8',
    meter: '5/8',
    title: '5/8 奇数八分拍（五线谱视奏 · 现代融合 3+2 长短律动）',
    category: 'odd',
    categoryLabel: '混合奇拍',
    group: 'jazz',
    pulseBadge: '八分音符脉冲 · 3+2 不对称长短拍',
    feelBadge: '长-短 (3+2) 不对称弹跳',
    recommendedBpm: 96,
    beatsPerBar: 2,
    beatUnit: 8,
    barCount: 4,
    beatGrids: ['dotted', 'quarter'],
    beatUnitWeights: [1.5, 1.0],
    accentBarIndices: [0, 1],
    accentGrouping: '● [1 - 2 - 3] (长拍) + ◎ [4 - 5] (短拍)',
    geometryNodes: 10,
    geometryAccents: [0, 6],
    summarySubtitle: '以八分音符为最小网格，感受「一长拍（3个八分）+ 一短拍（2个八分）」的敏捷跛行律动。',
    tips: [
      {
        num: '01',
        title: '禁止按等长拍硬套节拍器',
        body: '5/8 拍的两个大拍长度不等（3:2），练习时必须以恒定八分音符为骨架数出「Da-di-mi | Da-di」。',
      },
      {
        num: '02',
        title: '3+2 与 2+3 自由切换',
        body: '熟练掌握 123-45 后，可尝试将重音移至第 1、3 拍变成 12-345（短+长），训练大脑对非对称重音的控制。',
      },
      {
        num: '03',
        title: '等音调（Enharmonic）转换',
        body: '五度圈底部的 F# 大调（6个升号）与 Gb 大调（6个降号）在钢琴键盘上位置完全重合，互为等音调。',
      },
    ],
  },
  {
    id: '7-8',
    meter: '7/8',
    title: '7/8 混合七拍子（五线谱视奏 · 2+2+3 前卫律动挑战）',
    category: 'odd',
    categoryLabel: '混合奇拍',
    group: 'jazz',
    pulseBadge: '2+2+3 非对称组合 (7个八分)',
    feelBadge: '短-短-长 (2+2+3) 脉冲',
    recommendedBpm: 90,
    beatsPerBar: 3,
    beatUnit: 8,
    barCount: 4,
    beatGrids: ['quarter', 'quarter', 'dotted'],
    beatUnitWeights: [1.0, 1.0, 1.5],
    accentBarIndices: [0, 1, 2],
    accentGrouping: '● [1-2] (短) + ◎ [3-4] (短) + ▲ [5-6-7] (长)',
    geometryNodes: 14,
    geometryAccents: [0, 4, 8],
    summarySubtitle: '现代爵士、前卫摇滚与民族舞曲高阶拍号，通过「短-短-长 (12-12-123)」即可轻松驯服。',
    tips: [
      {
        num: '01',
        title: '口诀：Ta-ki | Ta-ki | Ta-ki-ta',
        body: '将 7 个八分音符切分为 2+2+3 三组，前两组各占 2 个八分音符，末组占 3 个八分音符，形成极具推动力的循环。',
      },
      {
        num: '02',
        title: '盯紧第 5 拍的三连尾拍',
        body: '初学者最容易把最后一组（5-6-7）压缩成两拍而变成 6/8，务必让第 7 个八分音符清晰落地。',
      },
      {
        num: '03',
        title: '全调性移调思维',
        body: '掌握任意一条节奏型后，结合下方五度圈每日换一个调号进行单音+音阶视奏，实现节拍与指法双突破。',
      },
    ],
  },
];

// Scale pitch pool (C4 -> C5 -> C4) in ABC pitch letters
const PITCH_SEQUENCE: Array<{
  letter: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  octave: 4 | 5;
  abc: string;
  defaultFreq: number;
}> = [
  { letter: 'C', octave: 4, abc: 'C', defaultFreq: 261.63 },
  { letter: 'D', octave: 4, abc: 'D', defaultFreq: 293.66 },
  { letter: 'E', octave: 4, abc: 'E', defaultFreq: 329.63 },
  { letter: 'F', octave: 4, abc: 'F', defaultFreq: 349.23 },
  { letter: 'G', octave: 4, abc: 'G', defaultFreq: 392.0 },
  { letter: 'A', octave: 4, abc: 'A', defaultFreq: 440.0 },
  { letter: 'B', octave: 4, abc: 'B', defaultFreq: 493.88 },
  { letter: 'C', octave: 5, abc: 'c', defaultFreq: 523.25 },
  { letter: 'B', octave: 4, abc: 'B', defaultFreq: 493.88 },
  { letter: 'A', octave: 4, abc: 'A', defaultFreq: 440.0 },
  { letter: 'G', octave: 4, abc: 'G', defaultFreq: 392.0 },
  { letter: 'F', octave: 4, abc: 'F', defaultFreq: 349.23 },
  { letter: 'E', octave: 4, abc: 'E', defaultFreq: 329.63 },
  { letter: 'D', octave: 4, abc: 'D', defaultFreq: 293.66 },
  { letter: 'C', octave: 4, abc: 'C', defaultFreq: 261.63 },
  { letter: 'C', octave: 4, abc: 'C', defaultFreq: 261.63 },
];

// 10 Essential Rhythm Patterns (9 classic patterns + 10th Random Mixed Sight-Reading)
export const RHYTHM_PATTERNS: RhythmPatternDef[] = [
  {
    id: 'quarter',
    name: '四分脉搏',
    shortMnemonic: 'Da',
    focusTip: '强拍(●)深沉落地 · 单位拍恒定步频 Da-Da-Da-Da',
    keyFocusBadges: ['1拍 · 强拍(●) Da', '时值 100% 饱满', '拍点零偏移'],
    description: '单拍稳固脉搏基准（每拍一音），训练呼吸稳定度与节拍器零偏差贴合。',
    defaultRatios: [1],
  },
  {
    id: 'eighths',
    name: '二八节奏',
    shortMnemonic: 'Da-Di',
    focusTip: '正拍脚踩 Da(●) · 反拍抬起 Di(↑) · 复拍子自然摇摆为三八律动',
    keyFocusBadges: ['正拍 Da (●)', '反拍 Di (↑)', '颗粒均等 (或 Swing 摇摆)'],
    description: '标准二等分正反拍（复拍子自动呈 3-eighth 摇摆分组），现代律动坐标轴。',
    defaultRatios: [0.5, 0.5],
  },
  {
    id: 'sixteenths',
    name: '四十六',
    shortMnemonic: 'Da-ka-Di-mi',
    focusTip: '四颗十六分音符均匀颗粒 · Da-ka-Di-mi (1-e-&-a) 严禁抢拍',
    keyFocusBadges: ['拍头 Da (1/4)', '第二音 ka (1/4)', '反拍 Di (1/4)', '末音 mi (1/4)'],
    description: '拍内四等分颗粒（复拍子为六连十六分），检验手指/舌头与内脉冲均匀度。',
    defaultRatios: [0.25, 0.25, 0.25, 0.25],
  },
  {
    id: 'eight-two-sixteen',
    name: '前八后十六',
    shortMnemonic: 'Da-Di-mi',
    focusTip: '马蹄律动：前半拍稳住 Da(1/2) · 后半拍轻巧连发 Di-mi(1/4+1/4)',
    keyFocusBadges: ['前半拍 Da (1/2)', '反拍 Di (1/4)', '拍尾 mi (1/4)'],
    description: '前半拍八分音符 + 后半拍两个十六分音符（复拍子为长短八分 2+1）。',
    defaultRatios: [0.5, 0.25, 0.25],
  },
  {
    id: 'two-sixteen-eight',
    name: '前十六后八',
    shortMnemonic: 'Da-ka-Di',
    focusTip: '前半拍敏捷双发 Da-ka(1/4+1/4) · 后半拍稳落反拍 Di(1/2)',
    keyFocusBadges: ['拍头 Da (1/4)', '紧接 ka (1/4)', '反拍立住 Di (1/2)'],
    description: '前半拍两个十六分音符 + 后半拍八分音符（复拍子为短长八分 1+2）。',
    defaultRatios: [0.25, 0.25, 0.5],
  },
  {
    id: 'small-syncopation',
    name: '小切分',
    shortMnemonic: 'Da-Di-Da',
    focusTip: '切分核心：中间长音 Di(◐) 跨越正反拍中心，制造弹跳推进感',
    keyFocusBadges: ['短起 Da (1/4)', '切分重音 Di (1/2 ◐)', '短收 Da (1/4)'],
    description: '拍内「短 + 长 + 短（1/4 + 1/2 + 1/4）」，中间长音强行改变拍内重心。',
    defaultRatios: [0.25, 0.5, 0.25],
  },
  {
    id: 'big-syncopation',
    name: '大切分',
    shortMnemonic: 'Da-Di—Da',
    focusTip: '切分核心：短-长-短 (Da - Di— - Da) · 中间切分音突强并延留跨越拍心',
    keyFocusBadges: ['拍头 Da (短起)', '切分突强 Di— (跨拍心 ◐)', '拍尾 Da (落地)'],
    description: '经典「短-长-短」重音切分律动，强化反拍突强与跨拍心延留控制。',
    defaultRatios: [0.25, 0.5, 0.25],
  },
  {
    id: 'dotted',
    name: '附点节奏',
    shortMnemonic: 'Da..-mi',
    focusTip: '前附点黄金比例 3:1 · 附点音延长满 3/4 拍，末音 mi 拍尾极速切入',
    keyFocusBadges: ['附点长音 Da.. (3/4)', '拍尾短促 mi (1/4)', '严禁退化成三连音'],
    description: '附点八分音符（3/4拍）+ 十六分音符（1/4拍），鲜明的跳跃感与进行曲张力。',
    defaultRatios: [0.75, 0.25],
  },
  {
    id: 'triplet',
    name: '三连音',
    shortMnemonic: 'Da-di-da',
    focusTip: '一拍均分三等份 (1/3 + 1/3 + 1/3) · 呈圆润滚动感，复拍子演练二对三交叉',
    keyFocusBadges: ['第1音 Da (1/3)', '第2音 di (1/3)', '第3音 da (1/3)'],
    description: '打破二等分惯性，均匀切分三连音（Triplet），复拍子中演练二对三（3:2）交叉。',
    defaultRatios: [0.333, 0.333, 0.334],
  },
  {
    id: 'mixed',
    name: '随机混合视奏',
    shortMnemonic: '混合视奏',
    focusTip: '每拍随机组合四分/二八/十六分/切分/附点/三连音，模拟真实曲目视奏挑战',
    keyFocusBadges: ['多型混编', '逐拍变速切换', '点击「换一组题」刷新'],
    description: '高阶真实视奏训练：每小节各拍混排不同节奏型，强迫眼睛超前读谱 1–2 拍。',
    defaultRatios: [0.5, 0.25, 0.25],
    isRandomMixed: true,
  },
];

interface CellSpec {
  cellName: string;
  mnemonic: string;
  subDesc: string;
  ratios: number[];
  isSyncopated?: boolean;
  subdivisions: SubdivisionChip[];
  makeAbc: (n: string) => string; // In L:1/16!
}

function getCellSpec(patternId: string, grid: BeatGridKind): CellSpec {
  if (grid === 'dotted') {
    // Dotted-quarter beat = 6 sixteenths in L:1/16
    switch (patternId) {
      case 'quarter':
        return {
          cellName: '附点大拍',
          mnemonic: 'Da——',
          subDesc: '附点四分音符（整大拍 3 个八分音符）',
          ratios: [1],
          subdivisions: [
            { label: '大拍起音', code: '1 · Da (3/3八分)', active: true },
            { label: '拍内延续', code: '2-3 · (附点保持)', active: false },
          ],
          makeAbc: (n) => `${n}6`,
        };
      case 'eighths':
        return {
          cellName: '三八摇摆',
          mnemonic: 'Da-di-da',
          subDesc: '复拍三等分（3 个八分音符均分）',
          ratios: [1 / 3, 1 / 3, 1 / 3],
          subdivisions: [
            { label: '第1八分', code: '1 · Da (1/3)', active: true },
            { label: '第2八分', code: '2 · di (1/3)', active: true },
            { label: '第3八分', code: '3 · da (1/3)', active: true },
          ],
          makeAbc: (n) => `${n}2${n}2${n}2`,
        };
      case 'sixteenths':
        return {
          cellName: '六连十六分',
          mnemonic: 'Da-ka-Di-ki-Mi-ki',
          subDesc: '复拍六等分十六分音符（6×1/6）',
          ratios: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
          subdivisions: [
            { label: '前组', code: '1-e · Da-ka', active: true },
            { label: '中组', code: '2-& · Di-ki', active: true },
            { label: '末组', code: '3-a · Mi-ki', active: true },
          ],
          makeAbc: (n) => `${n}${n}${n}${n}${n}${n}`,
        };
      case 'eight-two-sixteen':
        return {
          cellName: '长短八分 (2+1)',
          mnemonic: 'Da— - di',
          subDesc: '四分音符 + 八分音符（2/3 + 1/3 大拍）',
          ratios: [2 / 3, 1 / 3],
          subdivisions: [
            { label: '前两八分', code: '1-2 · Da— (2/3)', active: true },
            { label: '第三八分', code: '3 · di (1/3)', active: true },
          ],
          makeAbc: (n) => `${n}4${n}2`,
        };
      case 'two-sixteen-eight':
        return {
          cellName: '短长八分 (1+2)',
          mnemonic: 'Da - di—',
          subDesc: '八分音符 + 四分音符（1/3 + 2/3 大拍）',
          ratios: [1 / 3, 2 / 3],
          subdivisions: [
            { label: '第一八分', code: '1 · Da (1/3)', active: true },
            { label: '后两八分', code: '2-3 · di— (2/3)', active: true },
          ],
          makeAbc: (n) => `${n}2${n}4`,
        };
      case 'small-syncopation':
        return {
          cellName: '复合小切分',
          mnemonic: 'Da-Di-Da-mi',
          subDesc: '十六分+双八分+十六分 (1:2:2:1)',
          ratios: [1 / 6, 1 / 3, 1 / 3, 1 / 6],
          isSyncopated: true,
          subdivisions: [
            { label: '短起', code: '1 · Da (1/6)', active: true },
            { label: '切分1', code: 'Di (1/3)', active: true },
            { label: '切分2', code: 'Da (1/3)', active: true },
            { label: '短收', code: 'mi (1/6)', active: true },
          ],
          makeAbc: (n) => `${n}${n}2${n}2${n}`,
        };
      case 'big-syncopation':
        return {
          cellName: '复合大切分',
          mnemonic: 'Da - Di—— - da',
          subDesc: '十六分+四分+十六分 (1:4:1 跨拍切分)',
          ratios: [1 / 6, 2 / 3, 1 / 6],
          isSyncopated: true,
          subdivisions: [
            { label: '拍头短起', code: '1 · Da (1/6)', active: true },
            { label: '切分长音', code: 'Di—— (4/6 ◐)', active: true },
            { label: '拍尾落地', code: 'da (1/6)', active: true },
          ],
          makeAbc: (n) => `${n}${n}4${n}`,
        };
      case 'dotted':
        return {
          cellName: '复合附点',
          mnemonic: 'Da..-mi-da',
          subDesc: '附点八分 + 十六分 + 八分 (3:1:2)',
          ratios: [0.5, 1 / 6, 1 / 3],
          isSyncopated: true,
          subdivisions: [
            { label: '附点起音', code: 'Da.. (3/6)', active: true },
            { label: '快速过渡', code: 'mi (1/6)', active: true },
            { label: '末八分', code: 'da (2/6)', active: true },
          ],
          makeAbc: (n) => `${n}3${n}${n}2`,
        };
      case 'triplet':
      default:
        return {
          cellName: '二对三交叉',
          mnemonic: 'Da.. - Di..',
          subDesc: '两个附点八分均分三大拍（2 against 3）',
          ratios: [0.5, 0.5],
          subdivisions: [
            { label: '前半大拍', code: '1 · Da.. (1/2)', active: true },
            { label: '后半大拍', code: '2 · Di.. (1/2)', active: true },
          ],
          makeAbc: (n) => `${n}3${n}3`,
        };
    }
  }

  if (grid === 'half') {
    // Half-note beat in 2/2 Cut Time = 8 sixteenths in L:1/16
    switch (patternId) {
      case 'quarter':
        return {
          cellName: '二分大拍',
          mnemonic: 'Da——',
          subDesc: '二分音符（Cut Time 完整 1 大拍）',
          ratios: [1],
          subdivisions: [
            { label: '大拍起音', code: '1 · Da (100%)', active: true },
            { label: '后半保持', code: '2 · (二分延音)', active: false },
          ],
          makeAbc: (n) => `${n}8`,
        };
      case 'eighths':
        return {
          cellName: '双四分律动',
          mnemonic: 'Da - Di',
          subDesc: '两个四分音符均分一大拍 (1/2 + 1/2)',
          ratios: [0.5, 0.5],
          subdivisions: [
            { label: '前半大拍', code: '1 · Da (1/2)', active: true },
            { label: '后半大拍', code: '& · Di (1/2)', active: true },
          ],
          makeAbc: (n) => `${n}4 ${n}4`,
        };
      case 'sixteenths':
        return {
          cellName: '四八分推进',
          mnemonic: 'Da-ka-Di-mi',
          subDesc: '四个八分音符均分一大拍 (4×1/4)',
          ratios: [0.25, 0.25, 0.25, 0.25],
          subdivisions: [
            { label: '第1音', code: 'Da (1/4)', active: true },
            { label: '第2音', code: 'ka (1/4)', active: true },
            { label: '第3音', code: 'Di (1/4)', active: true },
            { label: '第4音', code: 'mi (1/4)', active: true },
          ],
          makeAbc: (n) => `${n}2${n}2${n}2${n}2`,
        };
      case 'eight-two-sixteen':
        return {
          cellName: '前四后二八',
          mnemonic: 'Da - Di-mi',
          subDesc: '四分音符 + 两个八分音符 (1/2 + 1/4 + 1/4)',
          ratios: [0.5, 0.25, 0.25],
          subdivisions: [
            { label: '前半拍四分', code: 'Da (1/2)', active: true },
            { label: '后半双八分', code: 'Di-mi (1/4+1/4)', active: true },
          ],
          makeAbc: (n) => `${n}4 ${n}2${n}2`,
        };
      case 'two-sixteen-eight':
        return {
          cellName: '前二八后四',
          mnemonic: 'Da-ka - Di',
          subDesc: '两个八分音符 + 四分音符 (1/4 + 1/4 + 1/2)',
          ratios: [0.25, 0.25, 0.5],
          subdivisions: [
            { label: '前半双八分', code: 'Da-ka (1/4+1/4)', active: true },
            { label: '后半拍四分', code: 'Di (1/2)', active: true },
          ],
          makeAbc: (n) => `${n}2${n}2 ${n}4`,
        };
      case 'small-syncopation':
      case 'big-syncopation':
        return {
          cellName: '二二拍切分',
          mnemonic: 'Da - Di— - Da',
          subDesc: '八分 + 四分 + 八分 (Cut Time 经典切分)',
          ratios: [0.25, 0.5, 0.25],
          isSyncopated: true,
          subdivisions: [
            { label: '短起', code: 'Da (1/4)', active: true },
            { label: '跨心切分', code: 'Di— (1/2 ◐)', active: true },
            { label: '短收', code: 'Da (1/4)', active: true },
          ],
          makeAbc: (n) => `${n}2${n}4${n}2`,
        };
      case 'dotted':
        return {
          cellName: '二二拍附点',
          mnemonic: 'Da.. - mi',
          subDesc: '附点四分 + 八分 (3:1 跨拍行进)',
          ratios: [0.75, 0.25],
          isSyncopated: true,
          subdivisions: [
            { label: '附点长音', code: 'Da.. (3/4)', active: true },
            { label: '拍尾八分', code: 'mi (1/4)', active: true },
          ],
          makeAbc: (n) => `${n}6${n}2`,
        };
      case 'triplet':
      default:
        return {
          cellName: '四分三连音',
          mnemonic: 'Da - di - da',
          subDesc: '大拍内三等分四分三连音 (1/3+1/3+1/3)',
          ratios: [1 / 3, 1 / 3, 1 / 3],
          subdivisions: [
            { label: '第1三分音', code: 'Da (1/3)', active: true },
            { label: '第2三分音', code: 'di (1/3)', active: true },
            { label: '第3三分音', code: 'da (1/3)', active: true },
          ],
          makeAbc: (n) => `(3${n}4${n}4${n}4`,
        };
    }
  }

  // Standard quarter-note grid = 4 sixteenths in L:1/16
  switch (patternId) {
    case 'quarter':
      return {
        cellName: '四分脉搏',
        mnemonic: 'Da',
        subDesc: '一拍一音（完整 1 拍时值）',
        ratios: [1],
        subdivisions: [
          { label: '拍头触发', code: '1 · Da (100%)', active: true },
          { label: '前半拍保持', code: '1-e (延音)', active: false },
          { label: '后半拍支撑', code: '&-a (收尾)', active: false },
        ],
        makeAbc: (n) => `${n}4`,
      };
    case 'eighths':
      return {
        cellName: '二八节奏',
        mnemonic: 'Da-Di',
        subDesc: '正反拍均分（1/2拍 + 1/2拍）',
        ratios: [0.5, 0.5],
        subdivisions: [
          { label: '前半拍正拍', code: '1 · Da (1/2拍)', active: true },
          { label: '后半拍反拍', code: '& · Di (1/2拍)', active: true },
        ],
        makeAbc: (n) => `${n}2${n}2`,
      };
    case 'sixteenths':
      return {
        cellName: '四十六',
        mnemonic: 'Da-ka-Di-mi',
        subDesc: '四等分颗粒（1/4 + 1/4 + 1/4 + 1/4拍）',
        ratios: [0.25, 0.25, 0.25, 0.25],
        subdivisions: [
          { label: '第1十六分', code: '1 · Da (1/4)', active: true },
          { label: '第2十六分', code: 'e · ka (1/4)', active: true },
          { label: '第3十六分', code: '& · Di (1/4)', active: true },
          { label: '第4十六分', code: 'a · mi (1/4)', active: true },
        ],
        makeAbc: (n) => `${n}${n}${n}${n}`,
      };
    case 'eight-two-sixteen':
      return {
        cellName: '前八后十六',
        mnemonic: 'Da-Di-mi',
        subDesc: '马蹄律动（1/2拍 + 1/4拍 + 1/4拍）',
        ratios: [0.5, 0.25, 0.25],
        subdivisions: [
          { label: '前半拍八分', code: '1 · Da (1/2拍)', active: true },
          { label: '第2十六分延留', code: 'e · (延音)', active: false },
          { label: '第3十六分反拍', code: '& · Di (1/4拍)', active: true },
          { label: '第4十六分拍尾', code: 'a · mi (1/4拍)', active: true },
        ],
        makeAbc: (n) => `${n}2${n}${n}`,
      };
    case 'two-sixteen-eight':
      return {
        cellName: '前十六后八',
        mnemonic: 'Da-ka-Di',
        subDesc: '急起稳落（1/4拍 + 1/4拍 + 1/2拍）',
        ratios: [0.25, 0.25, 0.5],
        subdivisions: [
          { label: '第1十六分拍头', code: '1 · Da (1/4拍)', active: true },
          { label: '第2十六分紧跟', code: 'e · ka (1/4拍)', active: true },
          { label: '后半拍八分', code: '& · Di (1/2拍)', active: true },
          { label: '第4十六分延留', code: 'a · (延音)', active: false },
        ],
        makeAbc: (n) => `${n}${n}${n}2`,
      };
    case 'small-syncopation':
      return {
        cellName: '小切分',
        mnemonic: 'Da-Di-Da',
        subDesc: '拍内切分（1/4拍 + 1/2切分长音 + 1/4拍）',
        ratios: [0.25, 0.5, 0.25],
        isSyncopated: true,
        subdivisions: [
          { label: '拍头短起', code: '1 · Da (1/4拍)', active: true },
          { label: '切分突强重音', code: 'e-& · Di (1/2拍)', active: true },
          { label: '切分延留过中轴', code: '& · (跨半拍延留)', active: false },
          { label: '拍尾短收', code: 'a · Da (1/4拍)', active: true },
        ],
        makeAbc: (n) => `${n}${n}2${n}`,
      };
    case 'big-syncopation':
      return {
        cellName: '大切分',
        mnemonic: 'Da-Di—Da',
        subDesc: '切分律动（短起 1/4 + 切分长音 1/2 + 短收 1/4）',
        ratios: [0.25, 0.5, 0.25],
        isSyncopated: true,
        subdivisions: [
          { label: '正拍短起', code: '1 · Da (短起)', active: true },
          { label: '反拍切分起音', code: 'e-& · Di— (切分突强)', active: true },
          { label: '跨中轴延音', code: '& · (延音不重奏)', active: false },
          { label: '拍尾落地', code: 'a · Da (短收)', active: true },
        ],
        makeAbc: (n) => `${n}${n}2${n}`,
      };
    case 'dotted':
      return {
        cellName: '前附点 (3:1)',
        mnemonic: 'Da..-mi',
        subDesc: '3:1 黄金切分（附点八分 3/4拍 + 十六分 1/4拍）',
        ratios: [0.75, 0.25],
        isSyncopated: true,
        subdivisions: [
          { label: '第1十六分起音', code: '1 · Da (起音)', active: true },
          { label: '第2十六分保持', code: 'e · (附点延音)', active: false },
          { label: '第3十六分附点', code: '& · (附点延音)', active: false },
          { label: '第4十六分短促', code: 'a · mi (1/4拍)', active: true },
        ],
        makeAbc: (n) => `${n}3${n}`,
      };
    case 'triplet':
    default:
      return {
        cellName: '三连音 Triplet',
        mnemonic: 'Da-di-da',
        subDesc: '三等分滚动律动（1/3拍 + 1/3拍 + 1/3拍）',
        ratios: [0.333, 0.333, 0.334],
        subdivisions: [
          { label: '三连音第1音', code: '1 · Da (1/3拍)', active: true },
          { label: '三连音第2音', code: 'trip · di (1/3拍)', active: true },
          { label: '三连音第3音', code: 'let · da (1/3拍)', active: true },
        ],
        makeAbc: (n) => `(3${n}2${n}2${n}2`,
      };
  }
}

const MIXED_POOL = [
  'quarter',
  'eighths',
  'sixteenths',
  'eight-two-sixteen',
  'two-sixteen-eight',
  'small-syncopation',
  'dotted',
  'triplet',
];

function seededChoice(seed: number, index: number): string {
  const hash = Math.abs(Math.sin((seed + 1) * 9301 + index * 49297) * 233280);
  return MIXED_POOL[Math.floor(hash) % MIXED_POOL.length];
}

/**
 * Build meter-accurate BeatStepItem[] and matching ABC notation for ANY of the 10 meters and 10 patterns!
 */
export function buildMeterAwarePattern(
  lesson: TimeSignatureLesson,
  pattern: RhythmPatternDef,
  keySig: string,
  mixedSeed: number = 1
): { steps: BeatStepItem[]; abcScore: string } {
  const steps: BeatStepItem[] = [];
  const barStrings: string[] = [];

  let globalIdx = 0;
  for (let bar = 0; bar < lesson.barCount; bar++) {
    const barTokens: string[] = [];
    for (let b = 0; b < lesson.beatsPerBar; b++) {
      const pitch = PITCH_SEQUENCE[globalIdx % PITCH_SEQUENCE.length];
      const grid = lesson.beatGrids[b] || 'quarter';
      const beatUnits = lesson.beatUnitWeights[b] ?? 1;

      const cellId = pattern.isRandomMixed ? seededChoice(mixedSeed, globalIdx) : pattern.id;
      const spec = getCellSpec(cellId, grid);

      const isStrong = b === 0;
      const isMedium = !isStrong && lesson.accentBarIndices.includes(b);
      const accentType: 'strong' | 'medium' | 'weak' | 'syncopated' = spec.isSyncopated
        ? 'syncopated'
        : isStrong
        ? 'strong'
        : isMedium
        ? 'medium'
        : 'weak';

      const markSymbol =
        accentType === 'strong'
          ? '●'
          : accentType === 'medium'
          ? '◎'
          : accentType === 'syncopated'
          ? '◐'
          : '○';

      const accentHzLabel =
        accentType === 'strong'
          ? '强拍 880Hz · 小节拍头'
          : accentType === 'medium'
          ? '次强拍 660Hz · 律动分组点'
          : accentType === 'syncopated'
          ? '切分重音 587Hz · 反拍突强'
          : '弱拍 440Hz · 稳定推进';

      const defaultPitchName = `${pitch.letter}${pitch.octave}`;
      const stepNum = globalIdx + 1;

      steps.push({
        id: stepNum,
        beatLabel: `第${bar + 1}小节·第${b + 1}拍`,
        pillText: `${stepNum}拍 · ${spec.mnemonic}`,
        patternTitle: `${spec.cellName} (${defaultPitchName})`,
        cellPatternName: spec.cellName,
        cellMnemonic: spec.mnemonic,
        mnemonic: `${spec.mnemonic} · ${spec.subDesc}`,
        subDescription: `第 ${bar + 1} 小节第 ${b + 1} 拍 · 五线谱音高 ${defaultPitchName}`,
        accentType,
        accentHzLabel,
        baseLetter: pitch.letter,
        baseOctave: pitch.octave,
        pitchName: defaultPitchName,
        pitchFreq: pitch.defaultFreq,
        ratios: spec.ratios,
        beatUnits,
        noteCountOnStaff: spec.ratios.length,
        subdivisions: spec.subdivisions,
        hasDotOrSyncopation: spec.isSyncopated || isStrong,
      });

      barTokens.push(`"${stepNum}${markSymbol}"${spec.makeAbc(pitch.abc)}`);
      globalIdx++;
    }
    barStrings.push(barTokens.join(' '));
  }

  const abcScore = `X:1
M:${lesson.meter}
L:1/16
K:${keySig}
${barStrings.join(' | ')} |]`;

  return { steps, abcScore };
}

// Helper to build diatonic chords for any root MIDI & note spelling
function makeChords(
  names: [string, string, string, string, string, string, string],
  notesList: [string, string, string, string, string, string, string],
  rootMidi: number
): DiatonicChordItem[] {
  const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const scaleOffsets = [0, 2, 4, 5, 7, 9, 11];
  const qualities = ['', 'm', 'm', '', '', 'm', 'dim'];
  const sevenths = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
  const degrees = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const roles = [
    '主和弦 Tonic (稳定中心)',
    '上主音 Supertonic (2-5-1起点)',
    '中音和弦 Mediant (柔和色彩)',
    '下属和弦 Subdominant (外扩推进)',
    '属和弦 Dominant (强烈回归主音)',
    '关系小调主音 Submediant (小调中心)',
    '导音减三和弦 Leading-Tone (紧张倾向)',
  ];

  return degrees.map((deg, idx) => {
    const chordRootMidi = rootMidi + scaleOffsets[idx];
    const thirdInterval = idx === 0 || idx === 3 || idx === 4 ? 4 : 3;
    const fifthInterval = idx === 6 ? 6 : 7;
    return {
      degree: deg,
      chordName: `${names[idx]}${qualities[idx]}`,
      seventhName: `${names[idx]}${sevenths[idx]}`,
      roleName: roles[idx],
      notesLabel: notesList[idx],
      frequencies: [
        midiToFreq(chordRootMidi),
        midiToFreq(chordRootMidi + thirdInterval),
        midiToFreq(chordRootMidi + fifthInterval),
      ],
      isPrimary: idx === 0 || idx === 3 || idx === 4 || idx === 5,
    };
  });
}

// All 12 Keys around the Circle of Fifths (Ordered clockwise 0..11)
export const CIRCLE_OF_FIFTHS_KEYS: CircleKeyInfo[] = [
  {
    id: 'C',
    chromaticNote: 'C',
    circleOrder: 0,
    majorLabel: 'C 大调',
    minorKey: 'Am',
    minorLabel: 'A 自然/和声小调',
    accidentalCountLabel: '无升降',
    accidentalsDetail: '无升降号 (全白键自然音阶)',
    abcKey: 'C',
    rootMidi: 60,
    minorRootMidi: 57,
    altoSaxKey: 'A 大调',
    altoSaxAccidental: '3# (F#, C#, G#)',
    altoSaxNote: 'A4',
    sopranoSaxKey: 'D 大调',
    sopranoSaxAccidental: '2# (F#, C#)',
    sopranoSaxNote: 'D5',
    diziThumbNote: 'D曲笛筒音作 2 (尺字调)',
    chords: makeChords(
      ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      ['C · E · G', 'D · F · A', 'E · G · B', 'F · A · C', 'G · B · D', 'A · C · E', 'B · D · F'],
      60
    ),
  },
  {
    id: 'G',
    chromaticNote: 'G',
    circleOrder: 1,
    majorLabel: 'G 大调',
    minorKey: 'Em',
    minorLabel: 'E 自然/和声小调',
    accidentalCountLabel: '1#',
    accidentalsDetail: '1个升号: F#',
    abcKey: 'G',
    rootMidi: 67,
    minorRootMidi: 64,
    altoSaxKey: 'E 大调',
    altoSaxAccidental: '4# (F#, C#, G#, D#)',
    altoSaxNote: 'E5',
    sopranoSaxKey: 'A 大调',
    sopranoSaxAccidental: '3# (F#, C#, G#)',
    sopranoSaxNote: 'A4',
    diziThumbNote: 'D曲笛筒音作 5 (正宫调)',
    chords: makeChords(
      ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      ['G · B · D', 'A · C · E', 'B · D · F#', 'C · E · G', 'D · F# · A', 'E · G · B', 'F# · A · C'],
      67
    ),
  },
  {
    id: 'D',
    chromaticNote: 'D',
    circleOrder: 2,
    majorLabel: 'D 大调',
    minorKey: 'Bm',
    minorLabel: 'B 自然/和声小调',
    accidentalCountLabel: '2#',
    accidentalsDetail: '2个升号: F#, C#',
    abcKey: 'D',
    rootMidi: 62,
    minorRootMidi: 59,
    altoSaxKey: 'B 大调',
    altoSaxAccidental: '5# (F#, C#, G#, D#, A#)',
    altoSaxNote: 'B4',
    sopranoSaxKey: 'E 大调',
    sopranoSaxAccidental: '4# (F#, C#, G#, D#)',
    sopranoSaxNote: 'E4',
    diziThumbNote: 'D曲笛本调 筒音作 1',
    chords: makeChords(
      ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
      ['D · F# · A', 'E · G · B', 'F# · A · C#', 'G · B · D', 'A · C# · E', 'B · D · F#', 'C# · E · G'],
      62
    ),
  },
  {
    id: 'A',
    chromaticNote: 'A',
    circleOrder: 3,
    majorLabel: 'A 大调',
    minorKey: 'F#m',
    minorLabel: 'F# 自然/和声小调',
    accidentalCountLabel: '3#',
    accidentalsDetail: '3个升号: F#, C#, G#',
    abcKey: 'A',
    rootMidi: 69,
    minorRootMidi: 66,
    altoSaxKey: 'F# / Gb 大调',
    altoSaxAccidental: '6# / 6b',
    altoSaxNote: 'F#5',
    sopranoSaxKey: 'B 大调',
    sopranoSaxAccidental: '5# (F#, C#, G#, D#, A#)',
    sopranoSaxNote: 'B4',
    diziThumbNote: 'D曲笛筒音作 4',
    chords: makeChords(
      ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
      ['A · C# · E', 'B · D · F#', 'C# · E · G#', 'D · F# · A', 'E · G# · B', 'F# · A · C#', 'G# · B · D'],
      69
    ),
  },
  {
    id: 'E',
    chromaticNote: 'E',
    circleOrder: 4,
    majorLabel: 'E 大调',
    minorKey: 'C#m',
    minorLabel: 'C# 自然/和声小调',
    accidentalCountLabel: '4#',
    accidentalsDetail: '4个升号: F#, C#, G#, D#',
    abcKey: 'E',
    rootMidi: 64,
    minorRootMidi: 61,
    altoSaxKey: 'Db 大调',
    altoSaxAccidental: '5b (Bb, Eb, Ab, Db, Gb)',
    altoSaxNote: 'C#5',
    sopranoSaxKey: 'F# / Gb 大调',
    sopranoSaxAccidental: '6# / 6b',
    sopranoSaxNote: 'F#4',
    diziThumbNote: 'E调曲笛筒音作 5',
    chords: makeChords(
      ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
      ['E · G# · B', 'F# · A · C#', 'G# · B · D#', 'A · C# · E', 'B · D# · F#', 'C# · E · G#', 'D# · F# · A'],
      64
    ),
  },
  {
    id: 'B',
    chromaticNote: 'B',
    circleOrder: 5,
    majorLabel: 'B 大调',
    minorKey: 'G#m',
    minorLabel: 'G# 自然/和声小调',
    accidentalCountLabel: '5#',
    accidentalsDetail: '5个升号: F#, C#, G#, D#, A#',
    abcKey: 'B',
    rootMidi: 71,
    minorRootMidi: 68,
    altoSaxKey: 'Ab 大调',
    altoSaxAccidental: '4b (Bb, Eb, Ab, Db)',
    altoSaxNote: 'G#5',
    sopranoSaxKey: 'Db 大调',
    sopranoSaxAccidental: '5b (Bb, Eb, Ab, Db, Gb)',
    sopranoSaxNote: 'C#5',
    diziThumbNote: 'E调曲笛筒音作 1',
    chords: makeChords(
      ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
      ['B · D# · F#', 'C# · E · G#', 'D# · F# · A#', 'E · G# · B', 'F# · A# · C#', 'G# · B · D#', 'A# · C# · E'],
      71
    ),
  },
  {
    id: 'F#',
    chromaticNote: 'F#',
    circleOrder: 6,
    majorLabel: 'F# / Gb 大调',
    minorKey: 'D#m',
    minorLabel: 'D# / Ebm 小调',
    accidentalCountLabel: '6# / 6b',
    accidentalsDetail: '6个升号 (F#..E#) 或 6个降号 (Bb..Cb)',
    abcKey: 'F#',
    rootMidi: 66,
    minorRootMidi: 63,
    altoSaxKey: 'Eb 大调',
    altoSaxAccidental: '3b (Bb, Eb, Ab)',
    altoSaxNote: 'Eb5',
    sopranoSaxKey: 'Ab 大调',
    sopranoSaxAccidental: '4b (Bb, Eb, Ab, Db)',
    sopranoSaxNote: 'Ab4',
    diziThumbNote: 'F梆笛半孔移调',
    chords: makeChords(
      ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
      ['F# · A# · C#', 'G# · B · D#', 'A# · C# · E#', 'B · D# · F#', 'C# · E# · G#', 'D# · F# · A#', 'E# · G# · B'],
      66
    ),
  },
  {
    id: 'Db',
    chromaticNote: 'C#',
    circleOrder: 7,
    majorLabel: 'Db / C# 大调',
    minorKey: 'Bbm',
    minorLabel: 'Bb 自然/和声小调',
    accidentalCountLabel: '5b',
    accidentalsDetail: '5个降号: Bb, Eb, Ab, Db, Gb',
    abcKey: 'Db',
    rootMidi: 61,
    minorRootMidi: 58,
    altoSaxKey: 'Bb 大调',
    altoSaxAccidental: '2b (Bb, Eb)',
    altoSaxNote: 'Bb4',
    sopranoSaxKey: 'Eb 大调',
    sopranoSaxAccidental: '3b (Bb, Eb, Ab)',
    sopranoSaxNote: 'Eb4',
    diziThumbNote: 'C曲笛半孔移调',
    chords: makeChords(
      ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
      ['Db · F · Ab', 'Eb · Gb · Bb', 'F · Ab · C', 'Gb · Bb · Db', 'Ab · C · Eb', 'Bb · Db · F', 'C · Eb · Gb'],
      61
    ),
  },
  {
    id: 'Ab',
    chromaticNote: 'Ab',
    circleOrder: 8,
    majorLabel: 'Ab 大调',
    minorKey: 'Fm',
    minorLabel: 'F 自然/和声小调',
    accidentalCountLabel: '4b',
    accidentalsDetail: '4个降号: Bb, Eb, Ab, Db',
    abcKey: 'Ab',
    rootMidi: 68,
    minorRootMidi: 65,
    altoSaxKey: 'F 大调',
    altoSaxAccidental: '1b (Bb)',
    altoSaxNote: 'F5',
    sopranoSaxKey: 'Bb 大调',
    sopranoSaxAccidental: '2b (Bb, Eb)',
    sopranoSaxNote: 'Bb4',
    diziThumbNote: 'Eb调笛筒音作 2',
    chords: makeChords(
      ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
      ['Ab · C · Eb', 'Bb · Db · F', 'C · Eb · G', 'Db · F · Ab', 'Eb · G · Bb', 'F · Ab · C', 'G · Bb · Db'],
      68
    ),
  },
  {
    id: 'Eb',
    chromaticNote: 'Eb',
    circleOrder: 9,
    majorLabel: 'Eb 大调',
    minorKey: 'Cm',
    minorLabel: 'C 自然/和声小调',
    accidentalCountLabel: '3b',
    accidentalsDetail: '3个降号: Bb, Eb, Ab',
    abcKey: 'Eb',
    rootMidi: 63,
    minorRootMidi: 60,
    altoSaxKey: 'C 大调 (中音萨克斯本调)',
    altoSaxAccidental: '无升降',
    altoSaxNote: 'C5',
    sopranoSaxKey: 'F 大调',
    sopranoSaxAccidental: '1b (Bb)',
    sopranoSaxNote: 'F4',
    diziThumbNote: 'Bb调笛筒音作 2',
    chords: makeChords(
      ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
      ['Eb · G · Bb', 'F · Ab · C', 'G · Bb · D', 'Ab · C · Eb', 'Bb · D · F', 'C · Eb · G', 'D · F · Ab'],
      63
    ),
  },
  {
    id: 'Bb',
    chromaticNote: 'Bb',
    circleOrder: 10,
    majorLabel: 'Bb 大调',
    minorKey: 'Gm',
    minorLabel: 'G 自然/和声小调',
    accidentalCountLabel: '2b',
    accidentalsDetail: '2个降号: Bb, Eb',
    abcKey: 'Bb',
    rootMidi: 70,
    minorRootMidi: 67,
    altoSaxKey: 'G 大调',
    altoSaxAccidental: '1# (F#)',
    altoSaxNote: 'G5',
    sopranoSaxKey: 'C 大调 (高音/次中音本调)',
    sopranoSaxAccidental: '无升降',
    sopranoSaxNote: 'C5',
    diziThumbNote: 'F梆笛筒音作 2',
    chords: makeChords(
      ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
      ['Bb · D · F', 'C · Eb · G', 'D · F · A', 'Eb · G · Bb', 'F · A · C', 'G · Bb · D', 'A · C · Eb'],
      70
    ),
  },
  {
    id: 'F',
    chromaticNote: 'F',
    circleOrder: 11,
    majorLabel: 'F 大调',
    minorKey: 'Dm',
    minorLabel: 'D 自然/和声小调',
    accidentalCountLabel: '1b',
    accidentalsDetail: '1个降号: Bb',
    abcKey: 'F',
    rootMidi: 65,
    minorRootMidi: 62,
    altoSaxKey: 'D 大调',
    altoSaxAccidental: '2# (F#, C#)',
    altoSaxNote: 'D5',
    sopranoSaxKey: 'G 大调',
    sopranoSaxAccidental: '1# (F#)',
    sopranoSaxNote: 'G4',
    diziThumbNote: 'C曲笛筒音作 2 / F梆笛筒音作 5',
    chords: makeChords(
      ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
      ['F · A · C', 'G · Bb · D', 'A · C · E', 'Bb · D · F', 'C · E · G', 'D · F · A', 'E · G · Bb'],
      65
    ),
  },
];

export const CHROMATIC_NOTE_ORDER = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const CHURCH_MODES: ModeDefinition[] = [
  {
    id: 'ionian',
    name: '自然大调',
    englishName: 'Ionian',
    formula: '1 - 2 - 3 - 4 - 5 - 6 - 7 (全-全-半-全-全-全-半)',
    semitones: [0, 2, 4, 5, 7, 9, 11],
    characteristicNote: '自然 4 级与自然 7 级导音',
    colorMood: '明亮、开阔、辉煌稳定',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    englishName: 'Dorian 多利亚',
    formula: '1 - 2 - b3 - 4 - 5 - 6 - b7',
    semitones: [0, 2, 3, 5, 7, 9, 10],
    characteristicNote: '还原 6 级 (Natural 6th)',
    colorMood: '爵士小调、摩登、丝滑律动 (Take Five / So What)',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    englishName: 'Phrygian 弗里吉亚',
    formula: '1 - b2 - b3 - 4 - 5 - b6 - b7',
    semitones: [0, 1, 3, 5, 7, 8, 10],
    characteristicNote: '降 2 级 (b2 弗拉门戈半音)',
    colorMood: '西班牙弗拉门戈、神秘异域张力',
  },
  {
    id: 'lydian',
    name: 'Lydian',
    englishName: 'Lydian 利底亚',
    formula: '1 - 2 - 3 - #4 - 5 - 6 - 7',
    semitones: [0, 2, 4, 6, 7, 9, 11],
    characteristicNote: '升 4 级 (#4 增四度)',
    colorMood: '梦幻、太空漂浮、电影配乐感',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    englishName: 'Mixolydian 混合利底亚',
    formula: '1 - 2 - 3 - 4 - 5 - 6 - b7',
    semitones: [0, 2, 4, 5, 7, 9, 10],
    characteristicNote: '降 7 级 (b7 属七蓝调音)',
    colorMood: 'Blues 蓝调、Funk 放克、摇滚律动',
  },
  {
    id: 'aeolian',
    name: '自然小调',
    englishName: 'Aeolian 爱奥利亚',
    formula: '1 - 2 - b3 - 4 - 5 - b6 - b7 (全-半-全-全-半-全-全)',
    semitones: [0, 2, 3, 5, 7, 8, 10],
    characteristicNote: '降 3、降 6、降 7 级',
    colorMood: '抒情、忧郁、流行叙事小调',
  },
  {
    id: 'harmonic-minor',
    name: '和声小调',
    englishName: 'Harmonic Minor',
    formula: '1 - 2 - b3 - 4 - 5 - b6 - #7 (升高第7级导音)',
    semitones: [0, 2, 3, 5, 7, 8, 11],
    characteristicNote: '升高第 7 级导音 (#7 增二度)',
    colorMood: '古典戏剧感、探戈与爵士小调属和弦',
  },
];
