import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Disc, Music2, Search, Sparkles, X } from 'lucide-react';
import {
  CHURCH_MODES,
  CIRCLE_OF_FIFTHS_KEYS,
  CircleKeyInfo,
  ModeDefinition,
  RHYTHM_PATTERNS,
  RhythmPatternDef,
  TIME_SIGNATURE_LESSONS,
  TimeSignatureLesson,
} from '../data/rhythmData';

export type PaletteItem =
  | { kind: 'lesson'; id: string; title: string; subtitle: string; badge: string; payload: TimeSignatureLesson }
  | { kind: 'pattern'; id: string; title: string; subtitle: string; badge: string; payload: RhythmPatternDef }
  | { kind: 'key'; id: string; title: string; subtitle: string; badge: string; payload: CircleKeyInfo }
  | { kind: 'mode'; id: string; title: string; subtitle: string; badge: string; payload: ModeDefinition };

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  onSelectLesson: (lesson: TimeSignatureLesson) => void;
  onSelectPattern: (pattern: RhythmPatternDef) => void;
  onSelectKey: (keyInfo: CircleKeyInfo) => void;
  onSelectMode: (mode: ModeDefinition) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  open,
  onClose,
  onSelectLesson,
  onSelectPattern,
  onSelectKey,
  onSelectMode,
}) => {
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo<PaletteItem[]>(() => {
    const lessons: PaletteItem[] = TIME_SIGNATURE_LESSONS.map((l) => ({
      kind: 'lesson',
      id: `lesson-${l.id}`,
      title: l.title.split('（')[0],
      subtitle: `${l.categoryLabel} · ${l.pulseBadge} · ${l.recommendedBpm} BPM`,
      badge: '拍号课题',
      payload: l,
    }));
    const patterns: PaletteItem[] = RHYTHM_PATTERNS.map((p) => ({
      kind: 'pattern',
      id: `pat-${p.id}`,
      title: p.name,
      subtitle: `${p.shortMnemonic} · ${p.description}`,
      badge: '节奏型',
      payload: p,
    }));
    const keys: PaletteItem[] = CIRCLE_OF_FIFTHS_KEYS.map((k) => ({
      kind: 'key',
      id: `key-${k.id}`,
      title: `${k.majorLabel} / ${k.minorKey}`,
      subtitle: `${k.accidentalsDetail} · 中音萨克斯 ${k.altoSaxKey}`,
      badge: '五度圈调号',
      payload: k,
    }));
    const modes: PaletteItem[] = CHURCH_MODES.map((m) => ({
      kind: 'mode',
      id: `mode-${m.id}`,
      title: `${m.name} (${m.englishName})`,
      subtitle: `${m.formula} · ${m.colorMood}`,
      badge: '教会调式',
      payload: m,
    }));
    return [...lessons, ...patterns, ...keys, ...modes];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 14);
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q)
      )
      .slice(0, 16);
  }, [allItems, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  const handleTriggerItem = (item: PaletteItem) => {
    if (item.kind === 'lesson') onSelectLesson(item.payload);
    else if (item.kind === 'pattern') onSelectPattern(item.payload);
    else if (item.kind === 'key') onSelectKey(item.payload);
    else if (item.kind === 'mode') onSelectMode(item.payload);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((i) => (filtered.length > 0 ? (i + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((i) => (filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[highlightIdx]) {
        e.preventDefault();
        handleTriggerItem(filtered[highlightIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, highlightIdx, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <Search className="w-4 h-4 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="快速跳转：输入 6/8、7/8、切分、随机、Eb、Dorian..."
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            aria-label="关闭快速检索"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">
              没有找到匹配课题，请尝试搜索拍号（如 7/8）、节奏型或调名（如 Eb）
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isHighlighted = idx === highlightIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setHighlightIdx(idx)}
                  onClick={() => handleTriggerItem(item)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-zinc-900 dark:text-zinc-100'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.kind === 'lesson'
                          ? 'bg-zinc-900 text-white dark:bg-amber-500'
                          : item.kind === 'pattern'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : item.kind === 'key'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {item.kind === 'lesson' ? (
                        <Command className="w-3.5 h-3.5" />
                      ) : item.kind === 'pattern' ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : item.kind === 'key' ? (
                        <Disc className="w-3.5 h-3.5" />
                      ) : (
                        <Music2 className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.title}</div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                    {item.badge}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span>↑↓ 选择 · Enter 跳转 · Esc 关闭</span>
          <span>全局快捷键: Space 打拍/播放 · ↑↓调速 · M 静音</span>
        </div>
      </div>
    </div>
  );
};
