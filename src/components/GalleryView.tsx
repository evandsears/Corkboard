import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Entry } from '../types';
import { X } from 'lucide-react';

interface GalleryViewProps {
  entries: Entry[];
  loading?: boolean;
}

export function GalleryView({ entries, loading }: GalleryViewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const photoEntries = entries.filter(e => e.image);

  if (loading) {
    return (
      <div className="pb-24 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className="aspect-square rounded-xl bg-md-sys-color-surface-variant/30 border border-md-sys-color-surface-variant/10"
            />
          ))}
        </div>
      </div>
    );
  }

  if (photoEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-md-sys-color-on-surface-variant mt-12">
        <div className="w-24 h-24 bg-md-sys-color-surface-variant rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">📸</span>
        </div>
        <h3 className="text-2xl font-display font-medium mb-2 text-md-sys-color-on-background">No photos yet</h3>
        <p className="max-w-xs text-md-sys-color-on-surface-variant">Add some photos to your entries to see them here.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
        {photoEntries.map(entry => (
          <div 
            key={entry.id} 
            className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-md-sys-color-surface-variant/50 hover:opacity-90 transition-opacity"
            onClick={() => setExpandedImage(entry.image!)}
          >
            <img src={entry.image} alt="Gallery item" loading="lazy" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

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
