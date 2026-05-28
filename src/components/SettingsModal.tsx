import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, writeBatch, collection, getDocs, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import { X, LogOut, Trash2, Loader2, Sparkles, User, AlertTriangle, ShieldAlert, Upload, ShieldCheck, ChevronDown, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  onClose: () => void;
  onUserUpdate: (updatedUser: any) => void;
}

const PRESET_EMOJIS = [
  '🤠', '🧙‍♂️', '👩‍🚀', '🐻', '🐱', '🦊',
  '🐨', '🐼', '🦁', '🐯', '🤖', '👽',
  '🦖', '🍕', '🌟', '🎨', '💼', '🏡',
  '🍷', '☕', '🧠', '🚲', '⚽', '🎯'
];

export function SettingsModal({ onClose, onUserUpdate }: SettingsModalProps) {
  const user = auth.currentUser;
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'none' | 'step1' | 'step2'>('none');
  const [deleteInputText, setDeleteInputText] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ imported: number; total: number } | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!user) return null;

  const handleExportData = async () => {
    setIsExporting(true);
    setImportSuccess(false);
    setErrorStatus(null);
    try {
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      const querySnapshot = await getDocs(entriesRef);
      
      const entriesData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          content: data.content || '',
          mood: data.mood || null,
          image: data.image || null,
          favorite: data.favorite || false,
          createdAt: {
            seconds: data.createdAt?.seconds || Math.floor(Date.now() / 1000),
            nanoseconds: data.createdAt?.nanoseconds || 0
          }
        };
      });

      const exportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: {
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
        },
        entries: entriesData
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `corkboard_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setErrorStatus('Failed to export your journal data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(null);
    setImportSuccess(false);
    setErrorStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const parsedData = JSON.parse(jsonText);

        if (!parsedData || typeof parsedData !== 'object') {
          throw new Error('Invalid JSON format.');
        }

        const entriesToImport = parsedData.entries;
        if (!entriesToImport || !Array.isArray(entriesToImport)) {
          throw new Error('Invalid backup file. Could not find entries.');
        }

        // 1. Restore profile details if available and not set
        if (parsedData.profile) {
          const userUpdatePayload: any = {};
          const docUpdatePayload: any = {};
          
          if (parsedData.profile.displayName && !user.displayName) {
            userUpdatePayload.displayName = parsedData.profile.displayName;
            docUpdatePayload.displayName = parsedData.profile.displayName;
          }
          if (parsedData.profile.photoURL && !user.photoURL) {
            userUpdatePayload.photoURL = parsedData.profile.photoURL;
            docUpdatePayload.photoURL = parsedData.profile.photoURL;
          }
          
          if (Object.keys(userUpdatePayload).length > 0) {
            await updateProfile(user, userUpdatePayload);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, docUpdatePayload);
            onUserUpdate({ ...user, ...userUpdatePayload });
          }
        }

        // 2. Import entries in chunks
        const totalEntries = entriesToImport.length;
        if (totalEntries === 0) {
          setImportProgress({ imported: 0, total: 0 });
          setImportSuccess(true);
          setIsImporting(false);
          return;
        }

        setImportProgress({ imported: 0, total: totalEntries });

        let successCount = 0;
        const allowedMoods = ['happy', 'calm', 'neutral', 'sad', 'anxious', 'angry', 'excited', 'tired', 'focused', 'confused', 'horny'];
        const chunkSize = 500;

        for (let i = 0; i < totalEntries; i += chunkSize) {
          const chunk = entriesToImport.slice(i, i + chunkSize);
          const batch = writeBatch(db);

          chunk.forEach((entry: any) => {
            const entryId = entry.id || doc(collection(db, 'placeholder')).id;
            const entryRef = doc(db, 'users', user.uid, 'entries', entryId);

            const seconds = entry.createdAt?.seconds || Math.floor(Date.now() / 1000);
            const nanoseconds = entry.createdAt?.nanoseconds || 0;
            const createdAtTimestamp = new Timestamp(seconds, nanoseconds);

            const entryData: any = {
              uid: user.uid,
              createdAt: createdAtTimestamp,
            };

            let contentStr = entry.content || '';
            let imageStr = entry.image || '';

            // Handle security rules constraint: must have either non-empty content or image
            if (!contentStr.trim() && !imageStr.trim()) {
              contentStr = ' ';
            }

            if (contentStr) {
              entryData.content = contentStr.slice(0, 280);
            }
            if (imageStr) {
              if (imageStr.length <= 800000) {
                entryData.image = imageStr;
              } else {
                entryData.content = (entryData.content ? entryData.content.slice(0, 250) + ' ' : '') + '[Image too large to import]';
              }
            }

            if (entry.mood && allowedMoods.includes(entry.mood)) {
              entryData.mood = entry.mood;
            }
            if (typeof entry.favorite === 'boolean') {
              entryData.favorite = entry.favorite;
            }

            batch.set(entryRef, entryData, { merge: true });
          });

          try {
            await batch.commit();
            successCount += chunk.length;
            // Update progress incrementally after batch success
            setImportProgress({ imported: Math.min(i + chunk.length, totalEntries), total: totalEntries });
          } catch (batchErr) {
            console.error(`Failed to commit batch for chunk starting at index ${i}:`, batchErr);
            // Fallback: write individually if the batch commit fails (e.g., due to individual item size, invalid format, etc.)
            for (let j = 0; j < chunk.length; j++) {
              const entry = chunk[j];
              try {
                const entryId = entry.id || doc(collection(db, 'placeholder')).id;
                const entryRef = doc(db, 'users', user.uid, 'entries', entryId);

                const seconds = entry.createdAt?.seconds || Math.floor(Date.now() / 1000);
                const nanoseconds = entry.createdAt?.nanoseconds || 0;
                const createdAtTimestamp = new Timestamp(seconds, nanoseconds);

                const entryData: any = {
                  uid: user.uid,
                  createdAt: createdAtTimestamp,
                };

                let contentStr = entry.content || '';
                let imageStr = entry.image || '';

                if (!contentStr.trim() && !imageStr.trim()) {
                  contentStr = ' ';
                }

                if (contentStr) {
                  entryData.content = contentStr.slice(0, 280);
                }
                if (imageStr) {
                  if (imageStr.length <= 800000) {
                    entryData.image = imageStr;
                  } else {
                    entryData.content = (entryData.content ? entryData.content.slice(0, 250) + ' ' : '') + '[Image too large to import]';
                  }
                }

                if (entry.mood && allowedMoods.includes(entry.mood)) {
                  entryData.mood = entry.mood;
                }
                if (typeof entry.favorite === 'boolean') {
                  entryData.favorite = entry.favorite;
                }

                await setDoc(entryRef, entryData, { merge: true });
                successCount++;
              } catch (itemErr) {
                console.error(`Fallback failed for entry in chunk at index ${i + j}:`, itemErr);
              }
            }
            // Update progress after fallback completes
            setImportProgress({ imported: Math.min(i + chunk.length, totalEntries), total: totalEntries });
          }
        }

        try {
          const m = await import('../lib/notifications');
          m.scheduleDailyReminder();
        } catch (_) {}

        setImportSuccess(true);
      } catch (err: any) {
        console.error(err);
        setErrorStatus(`Failed to import backup: ${err.message || 'Unknown error. Check file format.'}`);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setErrorStatus('Failed to read backup file.');
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const handleSelectEmoji = async (emoji: string) => {
    try {
      setIsSaving(true);
      setErrorStatus(null);
      await updateProfile(user, { photoURL: emoji });
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL: emoji });
      
      onUserUpdate({ ...user, photoURL: emoji });
    } catch (err: any) {
      console.error(err);
      setErrorStatus('Failed to update profile icon.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorStatus('Please select a valid image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorStatus('Image is too large. Please select an image under 10MB.');
      return;
    }

    setIsSaving(true);
    setErrorStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 160;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context not supported');
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          await updateProfile(user, { photoURL: dataUrl });
          
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { photoURL: dataUrl });
          
          onUserUpdate({ ...user, photoURL: dataUrl });
        } catch (err: any) {
          console.error(err);
          setErrorStatus('Failed to process and update profile image.');
        } finally {
          setIsSaving(false);
        }
      };
      img.onerror = () => {
        setErrorStatus('Failed to load selected image.');
        setIsSaving(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorStatus('Failed to read selected file.');
      setIsSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleLogOut = async () => {
    try {
      await auth.signOut();
      onClose();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteInputText.trim().toUpperCase() !== 'DELETE') {
      setErrorStatus('Confirmation text must match exactly.');
      return;
    }

    try {
      setIsDeleting(true);
      setErrorStatus(null);
      
      const batch = writeBatch(db);
      
      // Get all entries for the user
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      const querySnapshot = await getDocs(entriesRef);
      querySnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      // Also delete user profile document
      const userRef = doc(db, 'users', user.uid);
      batch.delete(userRef);
      
      await batch.commit();
      
      // Attempt to delete user auth account (if supported out of the box, or fall back to log out)
      try {
        await user.delete();
      } catch (authErr) {
        console.log('Account deletion requires recent authentication. Logging out user instead:', authErr);
        await auth.signOut();
      }
      
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorStatus('An error occurred while deleting your profile data. Please try logging in again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCurrentAvatarBig = () => {
    const photoURL = user.photoURL;
    if (!photoURL) {
      return (
        <div className="w-16 h-16 rounded-full bg-md-sys-color-primary-container text-md-sys-color-on-primary-container flex items-center justify-center font-bold text-3xl shadow-sm">
          👤
        </div>
      );
    }

    const isEmoji = !photoURL.startsWith('http') && !photoURL.startsWith('data:') && !photoURL.includes('/');
    if (isEmoji) {
      return (
        <div className="w-16 h-16 rounded-full bg-md-sys-color-primary-container/70 border border-md-sys-color-surface-variant flex items-center justify-center select-none shadow-sm">
          <span className="text-4xl leading-none">{photoURL}</span>
        </div>
      );
    }

    return (
      <img 
        src={photoURL} 
        alt="Profile" 
        className="w-16 h-16 rounded-full object-cover border border-md-sys-color-surface-variant shadow-sm"
        referrerPolicy="no-referrer"
      />
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-md-sys-color-surface w-full max-w-lg rounded-t-[24px] sm:rounded-[32px] shadow-xl overflow-hidden flex flex-col h-[calc(100dvh-20px)] sm:h-auto max-h-[100dvh] sm:max-h-[850px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-md-sys-color-surface-variant">
          <div className="flex items-center gap-2">
            <User size={20} className="text-md-sys-color-primary" />
            <span className="text-lg font-bold text-md-sys-color-on-surface">Corkboard Settings</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-md-sys-color-surface-variant text-md-sys-color-on-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
          {errorStatus && (
            <div className="bg-md-sys-color-error-container text-md-sys-color-on-error-container p-3 sm:p-4 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorStatus}</span>
            </div>
          )}

          {/* User profile avatar section */}
          <div className="flex flex-col items-center justify-center gap-3 p-4 bg-md-sys-color-surface-variant/20 rounded-3xl border border-md-sys-color-surface-variant/30">
            {renderCurrentAvatarBig()}
            <div className="text-center font-sans">
              <p className="font-bold text-md-sys-color-on-surface text-base">{user.displayName || 'Journalist'}</p>
              <p className="text-xs text-md-sys-color-on-surface-variant">{user.email}</p>
            </div>
          </div>

          {/* Update icon/avatar picker container */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold tracking-wider text-md-sys-color-primary uppercase flex items-center gap-1.5 px-0.5">
              <Sparkles size={14} />
              Set Personal Profile Icon
            </h3>

            {/* Emoji grid picker */}
            <div className="grid grid-cols-6 gap-2 bg-md-sys-color-surface-variant/10 p-3 sm:p-4 rounded-2xl border border-md-sys-color-surface-variant/20">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  disabled={isSaving}
                  onClick={() => handleSelectEmoji(emoji)}
                  className={`aspect-square rounded-xl text-2xl flex items-center justify-center hover:bg-md-sys-color-surface-variant/60 active:scale-90 transition-all ${user.photoURL === emoji ? 'bg-md-sys-color-primary/20 border-2 border-md-sys-color-primary' : 'bg-transparent border border-transparent'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Custom Photo Upload design */}
            <div className="flex flex-col gap-2">
              <label className="relative flex flex-col items-center justify-center gap-2.5 p-4 border-2 border-dashed border-md-sys-color-surface-variant hover:border-md-sys-color-primary hover:bg-md-sys-color-primary/5 rounded-2xl cursor-pointer transition-all active:scale-[0.99] overflow-hidden group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isSaving}
                  className="hidden"
                />
                {isSaving ? (
                  <Loader2 size={24} className="animate-spin text-md-sys-color-primary" />
                ) : (
                  <Upload size={24} className="text-md-sys-color-on-surface-variant group-hover:text-md-sys-color-primary transition-colors" />
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-md-sys-color-on-surface">
                    {isSaving ? 'Processing Image...' : 'Upload custom photo'}
                  </p>
                  <p className="text-xs text-md-sys-color-on-surface-variant">
                    PNG, JPG, or WebP (auto-resized)
                  </p>
                </div>
              </label>
            </div>
          </div>

          <hr className="border-md-sys-color-surface-variant/50" />

          {/* Log Out button */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold tracking-wider text-md-sys-color-on-surface-variant uppercase px-0.5">
              Session
            </h3>
            <button
              onClick={handleLogOut}
              className="w-full flex items-center justify-between p-4 bg-md-sys-color-surface border border-md-sys-color-outline/30 rounded-2xl hover:bg-md-sys-color-surface-variant/20 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="text-md-sys-color-primary" />
                <span className="text-sm font-semibold text-md-sys-color-on-surface">Sign Out of Account</span>
              </div>
            </button>
          </div>

          <hr className="border-md-sys-color-surface-variant/50" />

          {/* Backup & Migration Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold tracking-wider text-md-sys-color-on-surface-variant uppercase px-0.5">
              Backup & Migration
            </h3>
            
            <div className="flex flex-col gap-3 bg-md-sys-color-surface-variant/10 p-4 rounded-2xl border border-md-sys-color-surface-variant/20">
              <p className="text-xs text-md-sys-color-on-surface-variant leading-relaxed">
                Export your entire micro-journal logbook, mood states, and profile details to a JSON data file, or import a backup file to seamlessly restore your history on this account.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
                {/* Export button */}
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting || isImporting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-md-sys-color-surface border border-md-sys-color-primary/30 hover:bg-md-sys-color-primary/5 text-md-sys-color-primary rounded-2xl text-xs sm:text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer"
                >
                  {isExporting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Export Data (JSON)
                </button>

                {/* Import button / label trigger */}
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    disabled={isExporting || isImporting}
                    className="hidden"
                  />
                  <div className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-md-sys-color-primary hover:bg-md-sys-color-primary-container text-md-sys-color-on-primary hover:text-md-sys-color-on-primary-container rounded-2xl text-xs sm:text-sm font-bold active:scale-[0.98] transition-all cursor-pointer select-none text-center ${isExporting || isImporting ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                    {isImporting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    Import Data (JSON)
                  </div>
                </label>
              </div>

              {/* Progress Bar Display */}
              {importProgress !== null && (
                <div className="mt-2 p-3 bg-md-sys-color-primary-container/20 border border-md-sys-color-primary/20 rounded-xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-md-sys-color-primary">
                    <span>Restoring journal entries...</span>
                    <span>{importProgress.imported} / {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-md-sys-color-surface-variant/30 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-md-sys-color-primary h-full transition-all duration-300"
                      style={{ width: `${(importProgress.imported / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {importSuccess && importProgress && (
                <div className="mt-1 p-2.5 bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <span className="text-base select-none font-bold">✓</span>
                  <span>Successfully restored {importProgress.imported} of {importProgress.total} entries! Close settings to view your imported journal.</span>
                </div>
              )}
            </div>
          </div>

          <hr className="border-md-sys-color-surface-variant/50" />

          {/* Legal & Privacy Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold tracking-wider text-md-sys-color-on-surface-variant uppercase px-0.5">
              About & Legal
            </h3>
            
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="w-full flex items-center justify-between p-4 bg-md-sys-color-surface border border-md-sys-color-outline/30 rounded-2xl hover:bg-md-sys-color-surface-variant/20 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-md-sys-color-primary" />
                <span className="text-sm font-semibold text-md-sys-color-on-surface">Privacy Policy</span>
              </div>
              <motion.span
                animate={{ rotate: showPrivacy ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-md-sys-color-on-surface-variant/60"
              >
                <ChevronDown size={18} />
              </motion.span>
            </button>

            <AnimatePresence>
              {showPrivacy && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-md-sys-color-surface-variant/15 border border-md-sys-color-surface-variant/30 rounded-2xl p-4 text-xs text-md-sys-color-on-surface-variant leading-relaxed flex flex-col gap-3.5">
                    <p className="font-semibold text-md-sys-color-on-surface">Privacy Policy for Corkboard</p>
                    <p>
                      This Privacy Policy describes how Corkboard ("we", "our", or "us") collects, uses, and shares your data when you use the app.
                    </p>
                    <div>
                      <h4 className="font-bold text-md-sys-color-on-surface mb-1">1. Information We Collect</h4>
                      <p>
                        We collect information that you explicitly provide, including your email address, profile avatar, and entries (including texts, moods, and photos) which are securely stored on your device and synchronized to your personal database using Google Firestore.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-md-sys-color-on-surface mb-1">2. Offline Persistence</h4>
                      <p>
                        Your micro-journal entries are cached locally using IndexedDB. This ensures that you can read, search, and edit your entries offline at any time without an active internet connection.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-md-sys-color-on-surface mb-1">3. Advertising Partnerships</h4>
                      <p>
                        Corkboard integrates with Google AdMob to display bottom-banner advertisements. While we do not share your direct entry data, Google may use identifiers (such as mobile advertising IDs) or cookies to serve personalized advertisements. You can manage your preferences or request ad personalization opt-outs directly in your mobile settings or browser controls.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-md-sys-color-on-surface mb-1">4. Data Ownership & Deletion</h4>
                      <p>
                        <strong>You own 100% of your data.</strong> At any time, you can permanently delete your entire profile and journal history using the <em>Danger Zone</em> section in settings. This action is absolute and deletes all synchronized documents directly from Firestore.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-md-sys-color-on-surface mb-1">5. Contact & Support</h4>
                      <p>
                        If you have any questions about this policy or your account, please feel free to contact us at evan.sears@atomicmail.io.
                      </p>
                    </div>
                    <div className="text-[10px] text-md-sys-color-on-surface-variant/60 border-t border-md-sys-color-surface-variant/40 pt-2 text-center">
                      Last Updated: May 21, 2026
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <hr className="border-md-sys-color-surface-variant/50" />

          {/* Danger zone delete all data section */}
          <div className="bg-red-500/5 hover:bg-red-500/10 border-2 border-dashed border-red-500/20 rounded-[28px] p-4 sm:p-5 flex flex-col gap-4 transition-all">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle size={20} className="shrink-0" />
              <h3 className="font-bold text-sm tracking-wide uppercase">Danger Zone</h3>
            </div>
            
            <p className="text-xs text-md-sys-color-on-surface-variant leading-relaxed">
              Permanently wipe your complete micro-journal entries, mood data, linked files, and secure profile credentials. This action is atomic, absolute, and **cannot be undone**.
            </p>

            {showDeleteConfirm === 'none' && (
              <button
                onClick={() => setShowDeleteConfirm('step1')}
                className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete All Data
              </button>
            )}

            {/* Stepped Confirmations */}
            {showDeleteConfirm === 'step1' && (
              <div className="flex flex-col gap-3 bg-red-600/10 p-4 rounded-2xl border border-red-500/30">
                <p className="text-xs font-bold text-red-600">
                  ⚠️ ARE YOU ABSOLUTELY SURE? All your saved thoughts and emotional statistics will be gone forever.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm('none')}
                    className="flex-1 bg-md-sys-color-surface border border-md-sys-color-outline/30 hover:bg-md-sys-color-surface-variant text-md-sys-color-on-surface py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm('step2')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    I Understand, Proceed
                  </button>
                </div>
              </div>
            )}

            {showDeleteConfirm === 'step2' && (
              <div className="flex flex-col gap-3 bg-red-600/10 p-4 rounded-2xl border border-red-500/40">
                <p className="text-xs font-bold text-red-600">
                  Please type <span className="font-mono bg-red-600 text-white px-1.5 py-0.5 rounded">DELETE</span> below to authorize the immediate wipeout:
                </p>
                <input
                  type="text"
                  disabled={isDeleting}
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-red-500 bg-transparent text-sm font-bold uppercase focus:outline-none placeholder:text-red-500/40 text-red-700 focus:bg-red-500/5"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDeleteConfirm('none');
                      setDeleteInputText('');
                    }}
                    className="flex-1 bg-md-sys-color-surface border border-md-sys-color-outline/30 text-md-sys-color-on-surface py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting || deleteInputText.trim().toUpperCase() !== 'DELETE'}
                    onClick={handleDeleteAllData}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-500/40 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Permanently Delete Everything
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
