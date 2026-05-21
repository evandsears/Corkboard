import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Mail, 
  LockKeyhole, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronsUpDown,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_EMOJIS = [
  '🤠', '🧙‍♂️', '👩‍🚀', '🐻', '🐱', '🦊',
  '🐨', '🐼', '🦁', '🐯', '🤖', '👽',
  '🦖', '🍕', '🌟', '🎨', '💼', '🏡',
  '☕', '🧠', '🚲', '⚽', '🎯'
];

export function EmailAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🤠');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);

  const getCleanErrorMessage = (err: any) => {
    console.error("Auth error details:", err);
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Make it at least 6 characters.';
      case 'auth/invalid-credential':
        return 'Invalid email or password combination.';
      case 'auth/too-many-requests':
        return 'Access disabled due to temporary lock. Try again later.';
      default:
        return err?.message || 'An unexpected error occurred during authentication.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorText('Please fill out all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorText('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      setErrorText('Please enter your display name.');
      return;
    }

    setIsLoading(true);
    setErrorText(null);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const firebaseUser = userCredential.user;

        // Set profile info in authentication node
        await updateProfile(firebaseUser, {
          displayName: displayName.trim(),
          photoURL: selectedEmoji
        });

        // Save user details securely in Firestore (conforms to rules & blueprint)
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: email.trim(),
          displayName: displayName.trim(),
          photoURL: selectedEmoji,
          createdAt: serverTimestamp()
        });
      } else {
        // Sign In Flow
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const firebaseUser = userCredential.user;

        // Ensure user document exists in Firestore (useful if Google or legacy user document got lost)
        const userRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || email.trim(),
            displayName: firebaseUser.displayName || 'Journalist',
            photoURL: firebaseUser.photoURL || '📝',
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      setErrorText(getCleanErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-white/40 p-4 rounded-3xl border border-md-sys-color-surface-variant/40 shadow-2xs mt-1">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 p-1 bg-md-sys-color-surface-variant/20 rounded-2xl border border-md-sys-color-surface-variant/30">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false);
            setErrorText(null);
          }}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            !isSignUp 
              ? 'bg-md-sys-color-primary text-md-sys-color-on-primary shadow-3xs' 
              : 'text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant/20'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(true);
            setErrorText(null);
          }}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            isSignUp 
              ? 'bg-md-sys-color-primary text-md-sys-color-on-primary shadow-3xs' 
              : 'text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant/20'
          }`}
        >
          New Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.form
          key={isSignUp ? 'signup' : 'signin'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          {errorText && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-md-sys-color-error-container text-md-sys-color-on-error-container p-3 rounded-2xl text-xs font-medium flex items-start gap-2 border border-md-sys-color-error/20"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-md-sys-color-error" />
              <span>{errorText}</span>
            </motion.div>
          )}

          {/* User Display Name (Only for signup) */}
          {isSignUp && (
            <div className="flex flex-col gap-1.5 animate-duration-200">
              <label className="text-[11px] font-bold text-md-sys-color-on-surface-variant px-1 uppercase tracking-wider">
                Pen Name / Display Name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-md-sys-color-on-surface-variant/60">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Captain Nemo"
                  className="w-full bg-white/70 hover:bg-white focus:bg-white text-sm px-4 pl-10 py-3 rounded-2xl border border-md-sys-color-outline/30 focus:border-md-sys-color-primary outline-none text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/40 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* User Avatar Picker (Only for signup) */}
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-md-sys-color-on-surface-variant px-1 uppercase tracking-wider">
                Select Your Profile Icon
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiGrid(!showEmojiGrid)}
                  className="flex items-center justify-between w-full bg-white/70 hover:bg-white text-sm px-4 py-2.5 rounded-2xl border border-md-sys-color-outline/30 text-md-sys-color-on-surface transition-all font-medium text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl select-none leading-none">{selectedEmoji}</span>
                    <span className="text-xs text-md-sys-color-on-surface-variant/80">Click to choose icon</span>
                  </div>
                  <ChevronsUpDown size={16} className="text-md-sys-color-on-surface-variant/60" />
                </button>

                <AnimatePresence>
                  {showEmojiGrid && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-40 left-0 right-0 mt-1 p-3 bg-white border border-md-sys-color-outline/20 rounded-2xl shadow-lg grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto"
                    >
                      {PRESET_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            setShowEmojiGrid(false);
                          }}
                          className={`aspect-square flex items-center justify-center text-lg rounded-lg hover:bg-md-sys-color-primary-container/30 active:scale-90 transition-all ${
                            selectedEmoji === emoji ? 'bg-md-sys-color-primary-container/60 border border-md-sys-color-primary' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-md-sys-color-on-surface-variant px-1 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-md-sys-color-on-surface-variant/60">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="journalist@example.com"
                className="w-full bg-white/70 hover:bg-white focus:bg-white text-sm px-4 pl-10 py-3 rounded-2xl border border-md-sys-color-outline/30 focus:border-md-sys-color-primary outline-none text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/40 transition-all font-medium"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-md-sys-color-on-surface-variant px-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-md-sys-color-on-surface-variant/60">
                <LockKeyhole size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-white/70 hover:bg-white focus:bg-white text-sm px-4 pl-10 pr-10 py-3 rounded-2xl border border-md-sys-color-outline/30 focus:border-md-sys-color-primary outline-none text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/40 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 rounded-full text-md-sys-color-on-surface-variant/60 hover:bg-md-sys-color-surface-variant/40 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Form Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1.5 bg-md-sys-color-primary text-md-sys-color-on-primary py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {isSignUp ? 'Create My Account' : 'Sign In Now'}
              </>
            )}
          </button>
        </motion.form>
      </AnimatePresence>
    </div>
  );
}
