import React, { useState, useMemo } from 'react';
import { startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth, format } from 'date-fns';
import { Entry } from '../types';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, PieChart as PieChartIcon, Calendar as CalendarIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

const MOOD_COLORS: Record<string, string> = {
  happy: '#FACC15',
  calm: '#4ADE80',
  neutral: '#9CA3AF',
  sad: '#60A5FA',
  anxious: '#C084FC',
  angry: '#F87171',
  excited: '#FB923C',
  tired: '#94A3B8',
  focused: '#34D399',
  confused: '#818CF8',
  horny: '#F472B6',
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

  const moodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      if (e.mood) {
        counts[e.mood] = (counts[e.mood] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([mood, count]) => ({
        name: mood.charAt(0).toUpperCase() + mood.slice(1),
        originalMood: mood,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
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
        <div className="bg-md-sys-color-surface p-4 sm:p-5 rounded-[24px] border border-md-sys-color-surface-variant/30 w-full overflow-hidden">
          <div className="flex flex-col gap-1 sm:gap-1.5 w-full">
            {/* Header Row for Months */}
            <div className="flex justify-between items-center w-full mb-1">
              <div className="w-6 sm:w-8 shrink-0"></div>
              <div className="flex-1 flex justify-between gap-0.5 sm:gap-1 pl-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex-1 flex justify-center items-center h-4">
                    <div className="w-4 h-4 bg-md-sys-color-surface-variant/20 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* 31 Date Rows */}
            {Array.from({ length: 31 }).map((_, dIndex) => (
              <div key={dIndex} className="flex justify-between items-center w-full">
                <div className="w-6 sm:w-8 h-4 shrink-0 bg-md-sys-color-surface-variant/45 rounded justify-self-start mr-1"></div>
                <div className="flex-1 flex justify-between gap-0.5 sm:gap-1 pl-1">
                  {Array.from({ length: 12 }).map((_, mIndex) => (
                    <div key={mIndex} className="flex-1 flex justify-center items-center">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-md-sys-color-surface-variant/20" />
                    </div>
                  ))}
                </div>
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

      <div className="bg-md-sys-color-surface p-6 rounded-[24px] shadow-sm border border-md-sys-color-surface-variant/50 flex flex-col items-center">
          <h3 className="text-xl font-semibold text-md-sys-color-on-surface mb-6">Mood Distribution</h3>
          {moodDistribution.length > 0 ? (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {moodDistribution.map((entry, index) => {
                      const color = MOOD_COLORS[entry.originalMood as string] || '#4B5563';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--md-sys-color-surface-variant)', 
                      backgroundColor: 'var(--md-sys-color-surface)' 
                    }}
                    itemStyle={{ color: 'var(--md-sys-color-on-surface)' }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} entries`, 
                      `${MOOD_MAP[props.payload.originalMood]?.emoji || ''} ${name}`
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-20 text-md-sys-color-on-surface-variant/70 text-center flex flex-col items-center gap-2">
              <PieChartIcon size={40} className="mb-2 opacity-50" />
              <p>No mood data yet.</p>
              <p className="text-sm">Add some entries with moods to see your stats.</p>
            </div>
          )}
        </div>

        <div className="bg-md-sys-color-surface p-4 sm:p-5 rounded-[24px] shadow-sm border border-md-sys-color-surface-variant/50 w-full overflow-hidden">
          <div className="flex flex-col gap-1 sm:gap-1.5 w-full">
            {/* Header Row for Months */}
            <div className="flex justify-between items-center w-full mb-1">
              <div className="w-6 sm:w-8 shrink-0"></div> {/* Empty space for date labels */}
              <div className="flex-1 flex justify-between gap-0.5 sm:gap-1 pl-1">
                {months.map((monthDate, i) => (
                  <div key={i} className="flex-1 flex justify-center items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-md-sys-color-on-surface-variant font-mono">
                    {format(monthDate, 'MMM').charAt(0)}
                  </div>
                ))}
              </div>
            </div>

            {/* Date Rows */}
            {Array.from({ length: 31 }).map((_, dayIndex) => {
              const dayNumber = dayIndex + 1;
              return (
                <div key={dayIndex} className="flex justify-between items-center w-full">
                  <div className="w-6 sm:w-8 shrink-0 text-[10px] sm:text-[11px] font-bold text-md-sys-color-on-surface-variant/70 text-right pr-2 font-mono">
                    {dayNumber}
                  </div>
                  <div className="flex-1 flex justify-between gap-0.5 sm:gap-1 pl-1">
                    {months.map((monthDate, monthIndex) => {
                      const daysInMonth = getDaysInMonth(monthDate);
                      
                      if (dayNumber > daysInMonth) {
                        return (
                          <div key={monthIndex} className="flex-1 flex justify-center items-center">
                            <div className="w-4 h-4 sm:w-5 sm:h-5"></div>
                          </div>
                        );
                      }

                      const dateStr = format(new Date(year, monthIndex, dayNumber), 'yyyy-MM-dd');
                      const dayEntries = entriesByDate.get(dateStr) || [];
                      const hasEntry = dayEntries.length > 0;
                      const moods = dayEntries.map(e => e.mood).filter(Boolean);
                      const primaryMood = moods.length > 0 ? moods[moods.length - 1] : null;

                      let circleClass = "bg-md-sys-color-surface-variant/30 text-md-sys-color-on-surface-variant/70 hover:bg-md-sys-color-surface-variant/60";
                      let content: React.ReactNode = "";

                      if (primaryMood && MOOD_MAP[primaryMood as string]) {
                        circleClass = MOOD_MAP[primaryMood as string].color;
                        content = <span className="text-[9px] sm:text-[10px] leading-none">{MOOD_MAP[primaryMood as string].emoji}</span>;
                      } else if (hasEntry) {
                        circleClass = "bg-md-sys-color-primary/20 text-md-sys-color-primary font-bold";
                        content = <span className="w-1.5 h-1.5 rounded-full bg-current"></span>;
                      }

                      return (
                        <div key={monthIndex} className="flex-1 flex justify-center items-center">
                          <div 
                            className={cn(
                              "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-default",
                              circleClass
                            )}
                            title={primaryMood ? `${format(new Date(year, monthIndex, dayNumber), 'MMM d')}: ${primaryMood}` : format(new Date(year, monthIndex, dayNumber), 'MMM d')}
                          >
                            {content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
