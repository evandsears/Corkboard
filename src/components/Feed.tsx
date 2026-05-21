import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Entry, Mood } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { Trash2, Filter, X, Heart, ChevronDown, Calendar, Sparkles, Image, Check, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

const MOOD_MAP: Record<Mood, { emoji: string; color: string }> = {
  happy: { emoji: '✨', color: 'bg-yellow-100 text-yellow-800' },
  calm: { emoji: '🍃', color: 'bg-green-100 text-green-800' },
  neutral: { emoji: '☁️', color: 'bg-gray-100 text-gray-800' },
  sad: { emoji: '🌧️', color: 'bg-blue-100 text-blue-800' },
  anxious: { emoji: '⚡', color: 'bg-purple-100 text-purple-800' },
  angry: { emoji: '🔥', color: 'bg-red-100 text-red-800' },
  excited: { emoji: '🌟', color: 'bg-orange-100 text-orange-800' },
  tired: { emoji: '🥱', color: 'bg-slate-100 text-slate-800' },
  focused: { emoji: '🎯', color: 'bg-emerald-100 text-emerald-800' },
  confused: { emoji: '🤔', color: 'bg-indigo-100 text-indigo-800' },
  horny: { emoji: '😈', color: 'bg-pink-100 text-pink-800' },
};

interface FeedProps {
  entries: Entry[];
  allEntries?: Entry[];
  loading: boolean;
  onEdit: (entry: Entry) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function Feed({ entries, allEntries, loading, onEdit, hasMore, onLoadMore }: FeedProps) {
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [filterPhoto, setFilterPhoto] = useState<string>('all');
  const [filterFavorite, setFilterFavorite] = useState<boolean>(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  const loaderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { threshold: 0.1, rootMargin: '100px' });

    const currentRef = loaderRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filterMonth !== 'all') count++;
    if (filterMood !== 'all') count++;
    if (filterPhoto !== 'all') count++;
    if (filterFavorite) count++;
    return count;
  }, [filterMonth, filterMood, filterPhoto, filterFavorite]);

  const clearAllFilters = () => {
    setFilterMonth('all');
    setFilterMood('all');
    setFilterPhoto('all');
    setFilterFavorite(false);
  };

  const availableMonths = React.useMemo(() => {
    const map = new Map<string, string>();
    const source = allEntries || entries;
    source.forEach(e => {
      if (e.createdAt) {
        const d = e.createdAt.toDate();
        const val = format(d, 'yyyy-MM');
        const lbl = format(d, 'MMMM yyyy');
        map.set(val, lbl);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => b.value.localeCompare(a.value));
  }, [allEntries, entries]);

  const filteredEntries = React.useMemo(() => {
    return entries.filter(e => {
      if (filterMonth !== 'all') {
        if (!e.createdAt) return false;
        if (format(e.createdAt.toDate(), 'yyyy-MM') !== filterMonth) return false;
      }
      if (filterMood !== 'all' && e.mood !== filterMood) return false;
      if (filterPhoto === 'photos' && !e.image) return false;
      if (filterPhoto === 'no-photos' && e.image) return false;
      if (filterFavorite && !e.favorite) return false;
      return true;
    });
  }, [entries, filterMonth, filterMood, filterPhoto, filterFavorite]);

  const allFilteredEntries = React.useMemo(() => {
    const source = allEntries || entries;
    return source.filter(e => {
      if (filterMonth !== 'all') {
        if (!e.createdAt) return false;
        if (format(e.createdAt.toDate(), 'yyyy-MM') !== filterMonth) return false;
      }
      if (filterMood !== 'all' && e.mood !== filterMood) return false;
      if (filterPhoto === 'photos' && !e.image) return false;
      if (filterPhoto === 'no-photos' && e.image) return false;
      if (filterFavorite && !e.favorite) return false;
      return true;
    });
  }, [allEntries, entries, filterMonth, filterMood, filterPhoto, filterFavorite]);

  const toggleFavorite = async (entry: Entry) => {
    if (!auth.currentUser) return;
    try {
      const entryRef = doc(db, 'users', auth.currentUser.uid, 'entries', entry.id);
      await updateDoc(entryRef, { favorite: !entry.favorite });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const confirmDelete = async () => {
    if (!auth.currentUser || !entryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'entries', entryToDelete));
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert(error instanceof Error ? `Failed to delete entry: ${error.message}` : "Failed to delete entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-24 animate-pulse">
        {/* Stats Section Skeleton */}
        <div className="flex justify-around bg-md-sys-color-surface rounded-2xl p-4 mb-2 border border-md-sys-color-surface-variant/30">
          {[1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              {i > 1 && <div className="w-px bg-md-sys-color-surface-variant/30"></div>}
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-12 bg-md-sys-color-surface-variant/50 rounded-lg"></div>
                <div className="h-3 w-16 bg-md-sys-color-surface-variant/30 rounded"></div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Filters Section Skeleton */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-6 w-16 bg-md-sys-color-surface-variant/30 rounded-full"></div>
          <div className="h-8 w-24 bg-md-sys-color-surface-variant/40 rounded-full"></div>
          <div className="h-8 w-28 bg-md-sys-color-surface-variant/40 rounded-full"></div>
          <div className="h-8 w-24 bg-md-sys-color-surface-variant/40 rounded-full flex-1 sm:flex-initial"></div>
        </div>

        {/* Post Cards Skeleton */}
        {[1, 2].map((i) => (
          <div 
            key={i} 
            className="bg-md-sys-color-surface p-5 rounded-[24px] border border-md-sys-color-surface-variant/30 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Mood Badge Skeleton */}
                <div className="h-7 w-20 bg-md-sys-color-primary-container/40 rounded-full"></div>
                {/* Date Skeleton */}
                <div className="h-4 w-28 bg-md-sys-color-surface-variant/30 rounded"></div>
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-md-sys-color-surface-variant/20 rounded-full"></div>
                <div className="h-8 w-8 bg-md-sys-color-surface-variant/20 rounded-full"></div>
                <div className="h-8 w-8 bg-md-sys-color-surface-variant/20 rounded-full"></div>
              </div>
            </div>
            
            {/* Content Text Skeleton */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="h-5 w-[90%] bg-md-sys-color-surface-variant/40 rounded"></div>
              <div className="h-5 w-[75%] bg-md-sys-color-surface-variant/40 rounded"></div>
              {i === 1 && <div className="h-5 w-[60%] bg-md-sys-color-surface-variant/40 rounded"></div>}
            </div>

            {/* Optional Image Skeleton for the first card */}
            {i === 1 && (
              <div className="mt-2 w-full h-48 bg-md-sys-color-surface-variant/20 rounded-2xl border border-md-sys-color-surface-variant/10"></div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-md-sys-color-on-surface-variant mt-12">
        <div className="w-24 h-24 bg-md-sys-color-surface-variant rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">💭</span>
        </div>
        <h3 className="text-2xl font-display font-medium mb-2 text-md-sys-color-on-background">No thoughts yet</h3>
        <p className="max-w-xs text-md-sys-color-on-surface-variant">Tap the + button to capture your first thought or emotion.</p>
      </div>
    );
  }

  const totalPosts = allFilteredEntries.length;
  const totalPhotos = allFilteredEntries.filter(e => e.image).length;
  const totalMoods = allFilteredEntries.filter(e => e.mood).length;

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Stats Section */}
      <div className="flex justify-around bg-md-sys-color-surface rounded-2xl p-4 mb-2 shadow-sm border border-md-sys-color-surface-variant/50">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-display text-md-sys-color-primary">{totalPosts}</span>
          <span className="text-xs font-bold text-md-sys-color-on-surface-variant uppercase tracking-widest">Posts</span>
        </div>
        <div className="w-px bg-md-sys-color-surface-variant/50"></div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-display text-md-sys-color-primary">{totalPhotos}</span>
          <span className="text-xs font-bold text-md-sys-color-on-surface-variant uppercase tracking-widest">Photos</span>
        </div>
        <div className="w-px bg-md-sys-color-surface-variant/50"></div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-display text-md-sys-color-primary">{totalMoods}</span>
          <span className="text-xs font-bold text-md-sys-color-on-surface-variant uppercase tracking-widest">Moods</span>
        </div>
      </div>

      {/* Filters Button & Active Chips Section */}
      <div className="flex flex-col gap-2.5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterPanelOpen(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all shadow-3xs outline-none select-none active:scale-95 cursor-pointer",
                activeFiltersCount > 0
                  ? "bg-md-sys-color-primary text-md-sys-color-on-primary hover:opacity-95"
                  : "bg-md-sys-color-surface border border-md-sys-color-surface-variant/60 text-md-sys-color-on-surface hover:bg-md-sys-color-surface-variant/20"
              )}
              style={{ minHeight: '40px' }}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-md-sys-color-primary-container text-md-sys-color-on-primary-container text-[11px] font-black min-w-[18px] h-[18px] px-1 rounded-full border border-md-sys-color-primary shadow-3xs ml-1 animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Quick Clear All Button if filters are active */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-md-sys-color-on-surface-variant/70 hover:text-md-sys-color-error uppercase tracking-wider px-2 py-1.5 rounded-lg hover:bg-md-sys-color-surface-variant/20 transition-all select-none active:scale-95 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          
          <div className="text-xs font-bold text-md-sys-color-on-surface-variant/65 uppercase tracking-wider">
            {activeFiltersCount === 0 ? (
              (allEntries && entries.length < allEntries.length) ? `Showing ${entries.length} of ${allEntries.length}` : 'Showing All'
            ) : (
              `Found ${allFilteredEntries.length}`
            )}
          </div>
        </div>

        {/* Active Filters Horizontal Scroll Area */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar -mx-1 px-1">
            {filterMonth !== 'all' && (
              <div className="flex items-center gap-1 bg-md-sys-color-primary-container/15 border border-md-sys-color-primary/35 text-md-sys-color-primary px-3 py-1 rounded-full text-xs font-semibold shrink-0">
                <Calendar size={12} className="opacity-80" />
                <span>{availableMonths.find(m => m.value === filterMonth)?.label || filterMonth}</span>
                <button
                  onClick={() => setFilterMonth('all')}
                  className="hover:bg-md-sys-color-primary-container/20 rounded-full p-0.5 ml-1 transition-colors cursor-pointer text-md-sys-color-primary"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {filterMood !== 'all' && (
              <div className="flex items-center gap-1 bg-md-sys-color-primary-container/15 border border-md-sys-color-primary/35 text-md-sys-color-primary px-3 py-1 rounded-full text-xs font-semibold shrink-0 capitalize">
                <span>{MOOD_MAP[filterMood as Mood]?.emoji || '✨'}</span>
                <span>{filterMood}</span>
                <button
                  onClick={() => setFilterMood('all')}
                  className="hover:bg-md-sys-color-primary-container/20 rounded-full p-0.5 ml-1 transition-colors cursor-pointer text-md-sys-color-primary"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {filterPhoto !== 'all' && (
              <div className="flex items-center gap-1 bg-md-sys-color-primary-container/15 border border-md-sys-color-primary/35 text-md-sys-color-primary px-3 py-1 rounded-full text-xs font-semibold shrink-0">
                <Image size={10} className="opacity-80" />
                <span>{filterPhoto === 'photos' ? 'With Photos' : 'Text Only'}</span>
                <button
                  onClick={() => setFilterPhoto('all')}
                  className="hover:bg-md-sys-color-primary-container/20 rounded-full p-0.5 ml-1 transition-colors cursor-pointer text-md-sys-color-primary"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {filterFavorite && (
              <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/35 text-red-500 px-3 py-1 rounded-full text-xs font-semibold shrink-0">
                <Heart size={10} className="fill-red-500 text-red-500" />
                <span>Favorites</span>
                <button
                  onClick={() => setFilterFavorite(false)}
                  className="hover:bg-red-500/20 rounded-full p-0.5 ml-1 transition-colors cursor-pointer text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Combined Filter Drawer Overlay */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isFilterPanelOpen && (
            <div className="fixed inset-0 z-50 flex justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setIsFilterPanelOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />

              {/* Sidebar / Sheet container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative w-full max-w-md h-full bg-md-sys-color-background shadow-2xl flex flex-col z-50 border-l border-md-sys-color-surface-variant/30 font-sans"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-md-sys-color-surface-variant/40 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal size={18} className="text-md-sys-color-primary" />
                    <h3 className="text-xl font-display font-medium text-md-sys-color-on-background">Filter Logbook</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs font-bold text-md-sys-color-error uppercase tracking-wider px-3 py-2 rounded-full hover:bg-md-sys-color-error/10 transition-all cursor-pointer mr-1"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => setIsFilterPanelOpen(false)}
                      className="p-2 rounded-full text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant/50 transition-colors cursor-pointer"
                      aria-label="Close filters"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Scrollable Filter Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 no-scrollbar pb-32">
                  
                  {/* 1. Emotion/Mood Grid */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-md-sys-color-on-surface-variant/65 uppercase tracking-wider">
                        Select Emotion {filterMood !== 'all' ? `(1)` : ''}
                      </span>
                      {filterMood !== 'all' && (
                        <button 
                          onClick={() => setFilterMood('all')}
                          className="text-xs font-bold text-md-sys-color-primary hover:underline cursor-pointer"
                        >
                          Reset Mood
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {/* All Moods option */}
                      <button
                        onClick={() => setFilterMood('all')}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer hover:bg-md-sys-color-surface-variant/10",
                          filterMood === 'all'
                            ? "border-md-sys-color-primary bg-md-sys-color-primary-container/20 text-md-sys-color-primary shadow-3xs"
                            : "border-md-sys-color-surface-variant/40 bg-md-sys-color-surface text-md-sys-color-on-surface"
                        )}
                      >
                        <span className="text-xl select-none">✨</span>
                        <span>All Moods</span>
                      </button>
                      {/* Mood Maps */}
                      {Object.entries(MOOD_MAP).map(([key, data]) => {
                        const isSelected = filterMood === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setFilterMood(key)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all select-none active:scale-95 cursor-pointer capitalize hover:bg-md-sys-color-surface-variant/10",
                              isSelected
                                ? "border-md-sys-color-primary bg-md-sys-color-primary-container/20 text-md-sys-color-primary shadow-3xs font-bold"
                                : "border-md-sys-color-surface-variant/40 bg-md-sys-color-surface text-md-sys-color-on-surface"
                            )}
                          >
                            <span className="text-xl">{data.emoji}</span>
                            <span className="truncate w-full text-center">{key}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Content Type */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-md-sys-color-on-surface-variant/65 uppercase tracking-wider">
                        Media Attachments
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'all', label: 'All Posts', emoji: '📝' },
                        { value: 'photos', label: 'With Photos', emoji: '📸' },
                        { value: 'no-photos', label: 'Text Only', emoji: '✍️' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFilterPhoto(opt.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer hover:bg-md-sys-color-surface-variant/10",
                            filterPhoto === opt.value
                              ? "border-md-sys-color-primary bg-md-sys-color-primary-container/20 text-md-sys-color-primary shadow-3xs font-bold"
                              : "border-md-sys-color-surface-variant/40 bg-md-sys-color-surface text-md-sys-color-on-surface"
                          )}
                        >
                          <span className="text-lg select-none">{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Time Period */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-md-sys-color-on-surface-variant/65 uppercase tracking-wider">
                        Time Range
                      </span>
                      {filterMonth !== 'all' && (
                        <button 
                          onClick={() => setFilterMonth('all')}
                          className="text-xs font-bold text-md-sys-color-primary hover:underline cursor-pointer"
                        >
                          Reset Time
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col border border-md-sys-color-surface-variant/40 rounded-2xl bg-md-sys-color-surface overflow-hidden">
                      <button
                        onClick={() => setFilterMonth('all')}
                        className={cn(
                          "w-full px-5 py-3 text-sm font-medium flex items-center justify-between transition-colors border-b border-md-sys-color-surface-variant/20 hover:bg-md-sys-color-surface-variant/5 cursor-pointer",
                          filterMonth === 'all' ? "text-md-sys-color-primary bg-md-sys-color-primary-container/10 font-bold" : "text-md-sys-color-on-surface"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar size={15} className="text-md-sys-color-on-surface-variant" />
                          <span>All Time</span>
                        </div>
                        {filterMonth === 'all' && <Check size={16} className="text-md-sys-color-primary" />}
                      </button>
                      <div className="max-h-48 overflow-y-auto no-scrollbar">
                        {availableMonths.map((m, idx) => (
                          <button
                            key={m.value}
                            onClick={() => setFilterMonth(m.value)}
                            className={cn(
                              "w-full px-5 py-3 text-sm font-medium flex items-center justify-between transition-colors hover:bg-md-sys-color-surface-variant/5 cursor-pointer",
                              idx < availableMonths.length - 1 ? "border-b border-md-sys-color-surface-variant/20" : "",
                              filterMonth === m.value ? "text-md-sys-color-primary bg-md-sys-color-primary-container/10 font-bold" : "text-md-sys-color-on-surface"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Calendar size={15} className="text-md-sys-color-on-surface-variant/60" />
                              <span>{m.label}</span>
                            </div>
                            {filterMonth === m.value && <Check size={16} className="text-md-sys-color-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Favorites Toggle */}
                  <div className="flex items-center justify-between p-4 bg-md-sys-color-surface rounded-2xl border border-md-sys-color-surface-variant/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                        <Heart size={16} className={cn(filterFavorite ? "fill-red-500 text-red-500" : "text-red-500/80")} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-md-sys-color-on-background">Favorites Only</h4>
                        <p className="text-[11px] text-md-sys-color-on-surface-variant/80">Limit list to your pinned entries</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFilterFavorite(!filterFavorite)}
                      className={cn(
                        "w-12 h-7 rounded-full p-1 transition-all duration-300 outline-none cursor-pointer flex items-center",
                        filterFavorite ? "bg-red-500" : "bg-md-sys-color-surface-variant/50"
                      )}
                    >
                      <div className={cn(
                        "bg-white w-5 h-5 rounded-full transition-all shadow-3xs",
                        filterFavorite ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                </div>

                {/* Floating Bottom Apply Button Container */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-md-sys-color-background via-md-sys-color-background to-md-sys-color-background/10 pt-7 shrink-0 flex gap-3 z-10">
                  <button
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="w-full bg-md-sys-color-primary text-md-sys-color-on-primary py-3.5 rounded-full text-sm font-bold select-none active:scale-98 hover:opacity-95 transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    Apply Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-md-sys-color-on-surface-variant bg-md-sys-color-surface rounded-[24px] border border-md-sys-color-surface-variant/50">
          <p className="text-lg">No entries match your filters.</p>
          <button 
            onClick={() => { setFilterMonth('all'); setFilterMood('all'); setFilterPhoto('all'); setFilterFavorite(false); }}
            className="mt-4 px-4 py-2 bg-md-sys-color-primary-container text-md-sys-color-on-primary-container rounded-full font-medium transition-colors hover:opacity-90"
          >
            Clear filters
          </button>
        </div>
      ) : (
        filteredEntries.map((entry) => (
          <div 
            key={entry.id} 
          className="bg-md-sys-color-surface p-5 rounded-[24px] shadow-sm border border-md-sys-color-surface-variant/50 flex flex-col gap-3 transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {entry.mood && MOOD_MAP[entry.mood] && (
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                  MOOD_MAP[entry.mood].color
                )}>
                  <span>{MOOD_MAP[entry.mood].emoji}</span>
                  <span className="capitalize">{entry.mood}</span>
                </span>
              )}
              <span className="text-sm text-md-sys-color-on-surface-variant">
                {entry.createdAt ? formatDistanceToNow(entry.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
              </span>
            </div>
            
            <div className="flex items-center gap-1 font-sans select-none">
              <button 
                onClick={() => toggleFavorite(entry)}
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-full transition-colors active:scale-90 cursor-pointer min-w-[44px] min-h-[44px]", 
                  entry.favorite 
                    ? "text-red-500 hover:bg-red-500/10" 
                    : "text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant/70 hover:text-md-sys-color-on-surface"
                )}
                title={entry.favorite ? "Unfavorite" : "Favorite"}
              >
                <Heart size={18} className={cn(entry.favorite && "fill-current")} />
              </button>
              <button 
                onClick={() => setEntryToDelete(entry.id)}
                className="w-11 h-11 flex items-center justify-center text-md-sys-color-on-surface-variant hover:bg-md-sys-color-error-container hover:text-md-sys-color-error rounded-full transition-colors active:scale-90 cursor-pointer min-w-[44px] min-h-[44px]"
                title="Delete entry"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          
          {entry.content && (
            <p className="text-lg text-md-sys-color-on-surface whitespace-pre-wrap font-sans leading-relaxed">
              {entry.content}
            </p>
          )}

          {entry.image && (
            <div 
              className="mt-2 rounded-2xl overflow-hidden border border-md-sys-color-surface-variant/50 cursor-pointer group"
              onClick={() => setExpandedImage(entry.image!)}
            >
              <img 
                src={entry.image} 
                alt="Entry attachment" 
                loading="lazy"
                className="w-full h-auto object-cover max-h-[500px] transition-all duration-500 group-hover:scale-105 group-hover:opacity-95" 
              />
            </div>
          )}
        </div>
      )))}

      {/* Infinite Scroll Trigger element */}
      {hasMore && (
        <div 
          ref={loaderRef} 
          className="w-full py-6 flex items-center justify-center text-md-sys-color-primary"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold opacity-85">
            <span className="w-2-px h-2-px p-1 bg-md-sys-color-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2-px h-2-px p-1 bg-md-sys-color-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2-px h-2-px p-1 bg-md-sys-color-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-1.5 text-md-sys-color-on-surface-variant font-medium">Catching up on memories...</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {entryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setEntryToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
            />
            {/* Dialog Card */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative bg-md-sys-color-surface w-full max-w-sm rounded-[28px] shadow-xl p-6 flex flex-col gap-4 border border-md-sys-color-surface-variant/30 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-display font-semibold text-md-sys-color-on-surface">Delete entry?</h3>
              <p className="text-md-sys-color-on-surface-variant">
                This will permanently delete this entry. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4 animate-none">
                <button
                  onClick={() => setEntryToDelete(null)}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-full font-medium text-md-sys-color-on-surface hover:bg-md-sys-color-surface-variant transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-full font-medium bg-md-sys-color-error text-md-sys-color-on-error hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expanded Image Modal */}
      {expandedImage && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors z-[70]"
          >
            <X size={24} />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200 cursor-auto shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
