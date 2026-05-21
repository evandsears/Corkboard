import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Mood, Entry } from '../types';

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 'happy', emoji: '✨', label: 'Happy', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'calm', emoji: '🍃', label: 'Calm', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'neutral', emoji: '☁️', label: 'Neutral', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'sad', emoji: '🌧️', label: 'Sad', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'anxious', emoji: '⚡', label: 'Anxious', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'angry', emoji: '🔥', label: 'Angry', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'excited', emoji: '🌟', label: 'Excited', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'tired', emoji: '🥱', label: 'Tired', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'focused', emoji: '🎯', label: 'Focused', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'confused', emoji: '🤔', label: 'Confused', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'horny', emoji: '😈', label: 'Horny', color: 'bg-pink-100 text-pink-800 border-pink-200' },
];

interface ComposeProps {
  onClose: () => void;
  entryToEdit?: Entry;
}

export function Compose({ onClose, entryToEdit }: ComposeProps) {
  const [content, setContent] = useState(entryToEdit?.content || '');
  const [mood, setMood] = useState<Mood | undefined>(entryToEdit?.mood);
  const [image, setImage] = useState<string | null>(entryToEdit?.image || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const MAX_CHARS = 280;
  const charsLeft = MAX_CHARS - content.length;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.6 quality to keep it well under 1MB
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !image) || charsLeft < 0 || !auth.currentUser) return;
    
    setIsSubmitting(true);
    try {
      const entryData: any = {};
      
      if (content.trim()) {
        entryData.content = content.trim();
      } else if (entryToEdit) {
        entryData.content = deleteField();
      }
      
      if (mood) {
        entryData.mood = mood;
      } else if (entryToEdit) {
        entryData.mood = deleteField();
      }
      
      if (image) {
        entryData.image = image;
      } else if (entryToEdit) {
        entryData.image = deleteField();
      }

      if (entryToEdit) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'entries', entryToEdit.id), entryData);
      } else {
        entryData.createdAt = serverTimestamp();
        entryData.uid = auth.currentUser.uid;
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'entries'), entryData);
      }
      
      import('../lib/notifications').then((m) => m.scheduleDailyReminder());
      
      onClose();
    } catch (error) {
      console.error("Error adding entry: ", error);
      alert("Failed to save entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-md-sys-color-surface w-full max-w-lg rounded-t-[24px] sm:rounded-[32px] shadow-xl overflow-hidden flex flex-col h-[calc(100dvh-20px)] sm:h-auto max-h-[100dvh] sm:max-h-[800px] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-md-sys-color-surface-variant">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-md-sys-color-surface-variant text-md-sys-color-on-surface transition-colors"
          >
            <X size={24} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && !image) || charsLeft < 0 || isSubmitting}
            className="bg-md-sys-color-primary text-md-sys-color-on-primary px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm sm:text-base"
          >
            {isSubmitting ? (entryToEdit ? 'Updating...' : 'Saving...') : (entryToEdit ? 'Update' : 'Save')}
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pin a new thought..."
            className="w-full flex-1 min-h-[60px] sm:min-h-[150px] text-lg sm:text-xl resize-none bg-transparent outline-none placeholder:text-md-sys-color-outline text-md-sys-color-on-surface font-sans leading-relaxed"
          />
          
          {image && (
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-md-sys-color-surface-variant">
              <img src={image} alt="Preview" className="w-full h-auto object-cover max-h-[300px]" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="flex flex-col gap-4 mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 -ml-2 text-md-sys-color-primary hover:bg-md-sys-color-primary-container rounded-full transition-colors"
                  title="Add photo"
                >
                  <ImageIcon size={24} />
                </button>
              </div>
              <span className={cn(
                "text-sm font-medium",
                charsLeft < 0 ? "text-md-sys-color-error" : 
                charsLeft < 20 ? "text-orange-500" : "text-md-sys-color-outline"
              )}>
                {charsLeft}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(mood === m.value ? undefined : m.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 border",
                    mood === m.value 
                      ? m.color + " scale-105 shadow-sm" 
                      : "bg-transparent border-md-sys-color-outline/30 text-md-sys-color-on-surface hover:bg-md-sys-color-surface-variant"
                  )}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
