import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Entry, Mood } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Pencil, X, Heart, Shuffle } from 'lucide-react';
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

interface RandomViewProps {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  loading?: boolean;
}

export function RandomView({ entries, onEdit, loading }: RandomViewProps) {
  const [shuffledIds, setShuffledIds] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const shuffleEntries = () => {
    const ids = entries.map(e => e.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffledIds(ids);
  };

  useEffect(() => {
    if (entries.length > 0 && shuffledIds.length === 0) {
      shuffleEntries();
    }
  }, [entries]);

  const confirmDelete = async () => {
    if (!entryToDelete || !auth.currentUser) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'entries', entryToDelete));
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFavorite = async (entry: Entry) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'entries', entry.id), {
        favorite: !entry.favorite
      });
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
  };

  const displayEntries = shuffledIds
    .map(id => entries.find(e => e.id === id))
    .filter((e): e is Entry => e !== undefined);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex items-center justify-between px-2">
          <div className="h-8 w-44 bg-md-sys-color-surface-variant/40 rounded-lg"></div>
          <div className="h-9 w-28 bg-md-sys-color-surface-variant/30 rounded-full"></div>
        </div>

        <div className="bg-md-sys-color-surface p-5 rounded-[24px] border border-md-sys-color-surface-variant/30 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-20 bg-md-sys-color-primary-container/40 rounded-full"></div>
              <div className="h-4 w-28 bg-md-sys-color-surface-variant/30 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-md-sys-color-surface-variant/20 rounded-full"></div>
              <div className="h-8 w-8 bg-md-sys-color-surface-variant/20 rounded-full"></div>
              <div className="h-8 w-8 bg-md-sys-color-surface-variant/20 rounded-full"></div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="h-5 w-[90%] bg-md-sys-color-surface-variant/40 rounded"></div>
            <div className="h-5 w-[80%] bg-md-sys-color-surface-variant/40 rounded"></div>
            <div className="h-5 w-[65%] bg-md-sys-color-surface-variant/40 rounded"></div>
          </div>

          <div className="mt-2 w-full h-56 bg-md-sys-color-surface-variant/20 rounded-2xl border border-md-sys-color-surface-variant/10"></div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-md-sys-color-on-surface-variant mt-12">
        <div className="w-24 h-24 bg-md-sys-color-surface-variant rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">🔀</span>
        </div>
        <h3 className="text-2xl font-display font-medium mb-2 text-md-sys-color-on-background">No entries yet</h3>
        <p className="max-w-xs text-md-sys-color-on-surface-variant">Write some entries to see them shuffled here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-display font-semibold text-md-sys-color-on-background">Random Memory</h2>
        <button 
          onClick={shuffleEntries}
          className="flex items-center gap-2 px-4 py-2 bg-md-sys-color-surface border border-md-sys-color-surface-variant rounded-full text-sm font-medium text-md-sys-color-on-surface hover:bg-md-sys-color-surface-variant transition-colors"
        >
          <Shuffle size={16} />
          Reshuffle
        </button>
      </div>

      {displayEntries.map((entry) => (
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
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => toggleFavorite(entry)}
                className={cn("p-1.5 rounded-full transition-colors", entry.favorite ? "text-red-500 hover:bg-red-50" : "text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant hover:text-md-sys-color-on-surface")}
                title={entry.favorite ? "Unfavorite" : "Favorite"}
              >
                <Heart size={16} className={cn(entry.favorite && "fill-current")} />
              </button>
              <button 
                onClick={() => onEdit(entry)}
                className="p-1.5 text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant hover:text-md-sys-color-on-surface rounded-full transition-colors"
                title="Edit entry"
              >
                <Pencil size={16} />
              </button>
              <button 
                onClick={() => setEntryToDelete(entry.id)}
                className="p-1.5 text-md-sys-color-on-surface-variant hover:bg-md-sys-color-error-container hover:text-md-sys-color-error rounded-full transition-colors"
                title="Delete entry"
              >
                <Trash2 size={16} />
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
      ))}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {entryToDelete && createPortal(
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="bg-md-sys-color-surface w-full max-w-sm rounded-[28px] shadow-xl p-6 flex flex-col gap-4 border border-md-sys-color-surface-variant/30"
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
          </motion.div>,
          document.body
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
