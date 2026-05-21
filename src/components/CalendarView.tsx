import React, { useState, useMemo } from 'react';
import { startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth, format } from 'date-fns';
import { Entry } from '../types';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MOOD_MAP: Record<string, { emoji: string; color: string }> = {
  happy: { emoji: '✨', color: 'bg-yellow-400 text-yellow-950 font-bold' },
  calm: { emoji: '🍃', color: 'bg-green-400 text-green-950 font-bold' },
  neutral: { emoji: '☁️', color: 'bg-gray-400 text-gray-950 font-bold' },
  sad: { emoji: '🌧️', color: 'bg-blue-400 text-blue-950 font-bold' },
  anxious: { emoji: '⚡', color: 'bg-purple-400 text-purple-950 font-bold' },
  angry: { emoji: '🔥', color: 'bg-red-400 text-red-950 font-bold' },
  excited: { emoji: '🌟', color: 'bg-orange-400 text-orange-950 font-bold' },
  tired: { emoji: '🥱', color: 'bg-slate-400 text-slate-950 font-bold' },
  focused: { emoji: '🎯', color: 'bg-emerald-400 text-emerald-950 font-bold' },
  confused: { emoji: '🤔', color: 'bg-indigo-400 text-indigo-950 font-bold' },
  horny: { emoji: '😈', color: 'bg-pink-400 text-pink-950 font-bold' },
};

interface CalendarViewProps {
  entries: Entry[];
  loading?: boolean;
}

export function CalendarView({ entries, loading }: CalendarViewProps) {
  const [year, setYear] = useState(new Date().getFullYear());

  const months = useMemo(() => eachMonthOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 0, 1))
  }), [year]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach(e => {
      if (e.createdAt) {
        const dateStr = format(e.createdAt.toDate(), 'yyyy-MM-dd');
        if (!map.has(dateStr)) map.set(dateStr, []);
        map.get(dateStr)!.push(e);
      }
    });
    return map;
  }, [entries]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-24 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center bg-md-sys-color-surface p-4 rounded-2xl border border-md-sys-color-surface-variant/30">
          <div className="h-10 w-10 bg-md-sys-color-surface-variant/30 rounded-full"></div>
          <div className="h-8 w-20 bg-md-sys-color-primary-container/40 rounded-lg"></div>
          <div className="h-10 w-10 bg-md-sys-color-surface-variant/30 rounded-full"></div>
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="bg-md-sys-color-surface p-4 rounded-[24px] border border-md-sys-color-surface-variant/30 overflow-x-auto">
          <div className="min-w-max flex flex-col gap-2">
            {/* Header Row for Days */}
            <div className="flex items-center gap-1 mb-1">
              <div className="w-10"></div>
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className="w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-md-sys-color-surface-variant/20 rounded">
                </div>
              ))}
            </div>

            {/* Simulated 12 Months Skeleton Rows */}
            {Array.from({ length: 12 }).map((_, mIndex) => (
              <div key={mIndex} className="flex items-center gap-1">
                <div className="w-10 h-3 bg-md-sys-color-surface-variant/45 rounded mr-2 self-center"></div>
                {Array.from({ length: 31 }).map((_, dIndex) => (
                  <div 
                    key={dIndex} 
                    className="w-6 h-6 rounded-full bg-md-sys-color-surface-variant/20"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex justify-between items-center bg-md-sys-color-surface p-4 rounded-2xl shadow-sm border border-md-sys-color-surface-variant/50">
        <button 
          onClick={() => setYear(y => y - 1)}
          className="p-2 hover:bg-md-sys-color-surface-variant rounded-full transition-colors"
        >
          <ChevronLeft size={24} className="text-md-sys-color-on-surface-variant" />
        </button>
        <h2 className="text-3xl font-display font-bold text-md-sys-color-primary">{year}</h2>
        <button 
          onClick={() => setYear(y => y + 1)}
          className="p-2 hover:bg-md-sys-color-surface-variant rounded-full transition-colors"
        >
          <ChevronRight size={24} className="text-md-sys-color-on-surface-variant" />
        </button>
      </div>

      <div className="bg-md-sys-color-surface p-4 rounded-[24px] shadow-sm border border-md-sys-color-surface-variant/50 overflow-x-auto">
        <div className="min-w-max flex flex-col gap-1 sm:gap-1.5">
          {/* Header Row for Days */}
          <div className="flex items-center gap-0.5 sm:gap-1 mb-1">
            <div className="w-8 sm:w-10"></div> {/* Empty space for month labels */}
            {Array.from({ length: 31 }).map((_, i) => (
              <div key={i} className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-md-sys-color-on-surface-variant/70">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Months Rows */}
          {months.map((monthDate, monthIndex) => {
            const daysInMonth = getDaysInMonth(monthDate);
            const monthLabel = format(monthDate, 'MMM');

            return (
              <div key={monthIndex} className="flex items-center gap-0.5 sm:gap-1">
                <div className="w-8 sm:w-10 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-md-sys-color-on-surface-variant text-right pr-1 sm:pr-2">
                  {monthLabel}
                </div>
                {Array.from({ length: 31 }).map((_, dayIndex) => {
                  const dayNumber = dayIndex + 1;
                  if (dayNumber > daysInMonth) {
                    return <div key={dayIndex} className="w-5 h-5 sm:w-6 sm:h-6" />; // Empty placeholder
                  }

                  const dateStr = format(new Date(year, monthIndex, dayNumber), 'yyyy-MM-dd');
                  const dayEntries = entriesByDate.get(dateStr) || [];
                  const hasEntry = dayEntries.length > 0;
                  const moods = dayEntries.map(e => e.mood).filter(Boolean);
                  const primaryMood = moods.length > 0 ? moods[moods.length - 1] : null;

                  let circleClass = "bg-md-sys-color-surface-variant/30 text-md-sys-color-on-surface-variant/70 hover:bg-md-sys-color-surface-variant/60";
                  let content: React.ReactNode = dayNumber;

                  if (primaryMood && MOOD_MAP[primaryMood as string]) {
                    circleClass = MOOD_MAP[primaryMood as string].color;
                    content = <span className="text-[10px] sm:text-xs leading-none">{MOOD_MAP[primaryMood as string].emoji}</span>;
                  } else if (hasEntry) {
                    circleClass = "bg-md-sys-color-primary/20 text-md-sys-color-primary font-bold";
                  }

                  return (
                    <div 
                      key={dayIndex} 
                      className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold transition-all hover:scale-110 cursor-default",
                        circleClass
                      )}
                      title={primaryMood ? `${format(new Date(year, monthIndex, dayNumber), 'MMM d')}: ${primaryMood}` : format(new Date(year, monthIndex, dayNumber), 'MMM d')}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
