import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Feed } from './components/Feed';
import { CalendarView } from './components/CalendarView';
import { GalleryView } from './components/GalleryView';
import { RandomView } from './components/RandomView';
import { AdBanner } from './components/AdBanner';
import { Compose } from './components/Compose';
import { SettingsModal } from './components/SettingsModal';
import { EmailAuth } from './components/EmailAuth';
import { Plus, Pin, LayoutList, PieChart as PieChartIcon, Image as ImageIcon, Shuffle, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Entry } from './types';
import { cn } from './lib/utils';

const fadeThroughVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.2, 0, 0, 1] // Material design fluid-out deceleration curve
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.16,
      ease: [0.3, 0, 1, 1] // Standard acceleration curve
    }
  }
};

const ONBOARDING_SLIDES = [
  {
    emoji: '✍️',
    title: 'Your Personal Micro-Journal',
    description: 'Capture fleeting thoughts, daily reflections, and immediate emotional states instantly.',
    mockup: (
      <div className="w-full h-32 bg-white rounded-2xl p-4 flex flex-col gap-2 shadow-xs border border-md-sys-color-surface-variant/30 text-left select-none">
        <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-md-sys-color-on-surface-variant/70">
          <span>JUST NOW</span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-bold">✨ Happy</span>
        </div>
        <p className="text-xs font-medium text-md-sys-color-on-surface line-clamp-2 leading-relaxed">
          Completed my daily run! Feeling energized and ready to master the code base today! 🏃‍♂️⚡
        </p>
        <div className="h-1 w-10 bg-md-sys-color-primary/40 rounded-full mt-1" />
      </div>
    )
  },
  {
    emoji: '📸',
    title: 'Express with Context',
    description: 'Structure entries with color-coded emotion labels, attach beautiful visual memories, and pin key updates.',
    mockup: (
      <div className="w-full h-32 bg-white rounded-2xl p-3 flex gap-3 shadow-xs border border-md-sys-color-surface-variant/30 items-center text-left select-none">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-orange-300 to-amber-500 overflow-hidden relative shadow-xs shrink-0 flex items-center justify-center font-bold text-white text-xl">
          🌄
        </div>
        <div className="flex flex-col gap-1 font-sans">
          <div className="flex gap-1">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">🌿 peaceful</span>
            <span className="text-[10px] text-md-sys-color-on-surface-variant/60">10:45 AM</span>
          </div>
          <p className="text-xs font-medium text-md-sys-color-on-surface line-clamp-2 leading-relaxed">
            Beautiful quiet morning reading near the lake. The golden hour reflections were stunning.
          </p>
        </div>
      </div>
    )
  },
  {
    emoji: '📊',
    title: 'Relive Your Journey',
    description: 'Browse entries in a live feed, see your emotional landscape on a calendar, or flip through a photo gallery.',
    mockup: (
      <div className="w-full h-32 bg-white rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-xs border border-md-sys-color-surface-variant/30 text-left select-none">
        <div className="grid grid-cols-7 gap-1.5 justify-items-center">
          {[1, 2, 3, 4, 5, 6, 7].map((val) => {
            const colors = [
              'bg-yellow-100 text-yellow-800',
              'bg-emerald-100 text-emerald-800',
              'bg-blue-100 text-blue-800',
              'bg-purple-100 text-purple-800',
              'bg-pink-100 text-pink-800',
              'bg-orange-100 text-orange-800',
              'bg-yellow-100 text-yellow-800'
            ];
            const ems = ['✨', '🌿', '💧', '💜', '🌸', '🔥', '✨'];
            return (
              <div key={val} className="flex flex-col items-center gap-1">
                <span className="text-[8px] font-bold text-md-sys-color-on-surface-variant/50">DAY {val}</span>
                <div className={`w-5 h-5 rounded-full ${colors[val-1]} flex items-center justify-center text-[10px] shadow-3xs`}>
                  {ems[val-1]}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center text-[10px] font-bold text-md-sys-color-primary tracking-wider uppercase mt-1">
          Secure, Private, and Syncs Instantly
        </div>
      </div>
    )
  }
];

const onboardingVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 26,
    }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
    transition: { opacity: { duration: 0.15 } }
  })
};

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [loadingAllEntries, setLoadingAllEntries] = useState(true);
  const [postsLimit, setPostsLimit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useState<'feed' | 'calendar' | 'gallery' | 'random'>('feed');
  const [activeSlide, setActiveSlide] = useState(0);
  const [onboardingDir, setOnboardingDir] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const handleViewChange = (newView: 'feed' | 'calendar' | 'gallery' | 'random') => {
    if (view !== newView) {
      setView(newView);
    }
  };

  const handleLoadMore = useCallback(() => {
    setPostsLimit((prev) => Math.min(prev + 10, 9990));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        import('./lib/notifications').then((m) => m.scheduleDailyReminder());
        // Reset limit on auth change
        setPostsLimit(10);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'entries'),
      orderBy('createdAt', 'desc'),
      limit(postsLimit + 1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      const possessesMore = docs.length > postsLimit;
      const loadedDocs = possessesMore ? docs.slice(0, postsLimit) : docs;

      const newEntries = loadedDocs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Entry[];

      setEntries(newEntries);
      setHasMore(possessesMore);
      setLoadingEntries(false);
    }, (error) => {
      console.error("Error fetching entries:", error);
      setLoadingEntries(false);
    });
    return () => unsubscribe();
  }, [user, postsLimit]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'entries'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Entry[];
      setAllEntries(newEntries);
      setLoadingAllEntries(false);
    }, (error) => {
      console.error("Error fetching all entries:", error);
      setLoadingAllEntries(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isAutoPlaying || user) return;
    const interval = setInterval(() => {
      setOnboardingDir(1);
      setActiveSlide((prev) => (prev + 1) % ONBOARDING_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, user]);

  const handleNextSlide = () => {
    setIsAutoPlaying(false);
    setOnboardingDir(1);
    setActiveSlide((prev) => (prev + 1) % ONBOARDING_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setIsAutoPlaying(false);
    setOnboardingDir(-1);
    setActiveSlide((prev) => (prev - 1 + ONBOARDING_SLIDES.length) % ONBOARDING_SLIDES.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setOnboardingDir(index > activeSlide ? 1 : -1);
    setActiveSlide(index);
  };

  const handleSignIn = async () => {
    // Detect Capacitor or native mobile environment where standard web popups are restricted
    const isNative = typeof window !== 'undefined' && (
      (window as any).Capacitor?.isNativePlatform?.() || 
      window.location.protocol === 'capacitor:'
    );

    setAuthError(null);

    if (isNative) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        
        try {
          await GoogleAuth.initialize();
        } catch (initErr) {
          console.log("GoogleAuth.initialize internal handler:", initErr);
        }
        
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;
        
        if (!idToken) {
          throw new Error("No Identity Token. Make sure your client configuration matches.");
        }
        
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const userData: any = {
            uid: result.user.uid,
            email: result.user.email,
            createdAt: serverTimestamp(),
          };
          if (result.user.displayName) userData.displayName = result.user.displayName;
          if (result.user.photoURL) userData.photoURL = result.user.photoURL;
          
          await setDoc(userRef, userData);
        }
        return; // Success!
      } catch (nativeError: any) {
        console.error("Native Google login error:", nativeError);
        
        // Check if user dismissed the native dialog
        if (nativeError?.message?.includes('user') && nativeError?.message?.includes('cancel')) {
          setAuthError("Sign-in canceled by user.");
          return;
        }

        setAuthError(
          "Native Google Sign-In is pre-coded! To activate this in your local Android Studio / Google Play build, configure your Google credentials:\n\n" +
          "• Enable 'Google' sign-in in your Firebase Auth Console.\n" +
          "• Register your Android app (com.corkboard.app) in Firebase.\n" +
          "• Use standard 'Email & Password' login choice below to sign in instantly without any setups!"
        );
        setShowEmailAuth(true);
        return;
      }
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const userData: any = {
          uid: result.user.uid,
          email: result.user.email,
          createdAt: serverTimestamp(),
        };
        if (result.user.displayName) userData.displayName = result.user.displayName;
        if (result.user.photoURL) userData.photoURL = result.user.photoURL;
        
        await setDoc(userRef, userData);
      }
    } catch (error: any) {
      console.error("Error signing in", error);
      if (
        error?.code === 'auth/operation-not-allowed' || 
        error?.code === 'auth/invalid-action-code' || 
        error?.code === 'auth/invalid-api-wrapper' || 
        error?.message?.includes('invalid') || 
        error?.message?.includes('action')
      ) {
        setAuthError(
          "This Google action is restricted in mobile WebViews. Please sign up or log in using the secure 'Email & Password' option below!"
        );
        setShowEmailAuth(true);
      } else {
        setAuthError(error?.message || "Failed to log in with Google. Please try the Email & Password option.");
      }
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-md-sys-color-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="w-24 h-24 drop-shadow-md"
          >
            <img src="/favicon.svg" alt="Corkboard Logo" className="w-full h-full" />
          </motion.div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-display font-semibold text-md-sys-color-on-background tracking-tight">Corkboard</h2>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-md-sys-color-primary"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-md-sys-color-background p-4 sm:p-6 overflow-hidden">
        {/* Decorative dynamic background accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-md-sys-color-primary via-md-sys-color-secondary to-md-sys-color-primary/60 opacity-50" />

        <div className="max-w-md w-full flex flex-col items-center gap-6 sm:gap-8">
          
          {/* Header Branding */}
          <div className="flex flex-col items-center text-center gap-2">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 drop-shadow-xs"
            >
              <img src="/favicon.svg" alt="Corkboard Logo" className="w-full h-full" />
            </motion.div>
            <h1 className="text-4xl font-display font-bold text-md-sys-color-on-background tracking-tight">
              Corkboard
            </h1>
            <p className="text-sm font-medium text-md-sys-color-on-surface-variant/80 max-w-xs leading-relaxed">
              Your lightweight, high-contrast emotional micro-journal.
            </p>
          </div>

          {/* Elegant Onboarding Carousel Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-full bg-white/75 backdrop-blur-md rounded-[32px] border border-md-sys-color-surface-variant/60 p-6 flex flex-col gap-5 shadow-sm overflow-hidden relative"
          >
            {/* Slide Area */}
            <div className="relative h-64 flex flex-col items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait" custom={onboardingDir}>
                <motion.div
                  key={activeSlide}
                  custom={onboardingDir}
                  variants={onboardingVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col items-center text-center gap-4 focus:outline-none"
                >
                  {/* Icon/Emoji Badge */}
                  <div className="w-12 h-12 rounded-full bg-md-sys-color-primary-container/40 flex items-center justify-center text-2xl shadow-3xs select-none">
                    {ONBOARDING_SLIDES[activeSlide].emoji}
                  </div>

                  {/* Title & Description */}
                  <div className="flex flex-col gap-1 px-1">
                    <h3 className="text-lg font-bold text-md-sys-color-on-background tracking-tight">
                      {ONBOARDING_SLIDES[activeSlide].title}
                    </h3>
                    <p className="text-xs text-md-sys-color-on-surface-variant leading-relaxed">
                      {ONBOARDING_SLIDES[activeSlide].description}
                    </p>
                  </div>

                  {/* Mockup Preview Area */}
                  <div className="w-full mt-1">
                    {ONBOARDING_SLIDES[activeSlide].mockup}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation & Controls Row */}
            <div className="flex items-center justify-between mt-1 pt-3.5 border-t border-md-sys-color-surface-variant/30 select-none">
              {/* Back Button */}
              <button
                onClick={handlePrevSlide}
                className="p-1.5 rounded-full text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant/40 active:scale-90 transition-all cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Slider Dots */}
              <div className="flex gap-1.5 justify-center">
                {ONBOARDING_SLIDES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 cursor-pointer",
                      activeSlide === index 
                        ? "w-5 bg-md-sys-color-primary" 
                        : "w-2 bg-md-sys-color-surface-variant/80 hover:bg-md-sys-color-on-surface-variant/30"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextSlide}
                className="p-1.5 rounded-full text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-variant/40 active:scale-90 transition-all cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>

          {/* Sign In Trigger Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-full flex flex-col gap-3.5 items-center px-1"
          >
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="w-full bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex flex-col gap-1.5 text-left text-xs text-amber-900"
                >
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <span className="text-sm">⚠️</span>
                    <span>WebView Authentication Tip</span>
                  </div>
                  <p className="leading-relaxed opacity-95">{authError}</p>
                  <button 
                    onClick={() => setAuthError(null)} 
                    className="self-end mt-1 text-[10px] font-bold text-amber-800 hover:underline px-2.5 py-1 rounded bg-amber-100/40 hover:bg-amber-100/80 transition-all select-none"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleSignIn}
              className="w-full bg-md-sys-color-primary text-md-sys-color-on-primary py-3.5 sm:py-4 rounded-[20px] text-base font-semibold hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg cursor-pointer animate-duration-300"
              style={{ minHeight: '52px' }}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-5 h-5 bg-white rounded-full p-0.5 shadow-2xs" 
              />
              Continue with Google
            </button>

            {/* Collapsible Email & Password Section */}
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full flex items-center gap-3 py-1">
                <div className="h-[1px] flex-1 bg-md-sys-color-outline/20" />
                <button
                  type="button"
                  onClick={() => setShowEmailAuth(!showEmailAuth)}
                  className="text-xs font-bold text-md-sys-color-primary hover:underline hover:opacity-90 active:scale-95 transition-all select-none cursor-pointer"
                >
                  {showEmailAuth ? "Hide Email Login" : "Or use Email & Password"}
                </button>
                <div className="h-[1px] flex-1 bg-md-sys-color-outline/20" />
              </div>

              <AnimatePresence initial={false}>
                {showEmailAuth && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full overflow-hidden"
                  >
                    <EmailAuth />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-[11px] text-md-sys-color-on-surface-variant/70 text-center leading-normal max-w-[280px] select-none">
              Your micro-journal is securely protected with premium zero-trust safety and real-time backend synchronization.
            </p>
          </motion.div>

        </div>
      </div>
    );
  }

  const renderHeaderAvatar = (photoURL: string | null | undefined) => {
    if (!photoURL) {
      return (
        <div className="w-8 h-8 rounded-full bg-md-sys-color-primary-container text-md-sys-color-on-primary-container flex items-center justify-center font-bold text-sm">
          👤
        </div>
      );
    }
    
    const isEmoji = !photoURL.startsWith('http') && !photoURL.startsWith('data:') && !photoURL.includes('/');
    if (isEmoji) {
      return (
        <div className="w-8 h-8 rounded-full bg-md-sys-color-primary-container/80 border border-md-sys-color-surface-variant/40 flex items-center justify-center select-none text-[16px] leading-none">
          {photoURL}
        </div>
      );
    }
    
    return (
      <img 
        src={photoURL} 
        alt="Profile" 
        className="w-8 h-8 rounded-full object-cover border border-md-sys-color-surface-variant/60"
        referrerPolicy="no-referrer"
      />
    );
  };

  return (
    <div className="min-h-screen bg-md-sys-color-background text-md-sys-color-on-background font-sans selection:bg-md-sys-color-primary-container selection:text-md-sys-color-on-primary-container">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-md-sys-color-background/80 backdrop-blur-md border-b border-md-sys-color-surface-variant/30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 drop-shadow-sm">
              <img src="/favicon.svg" alt="Corkboard Logo" className="w-full h-full" />
            </div>
            <h1 className="text-xl font-display font-semibold tracking-tight">Corkboard</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 p-1 pr-2.5 sm:pr-3 rounded-full hover:bg-md-sys-color-surface-variant/70 border border-md-sys-color-surface-variant/30 text-md-sys-color-on-surface transition-all active:scale-95"
              title="Journal Settings"
            >
              {renderHeaderAvatar(user.photoURL)}
              <Settings size={18} className="text-md-sys-color-on-surface-variant" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("mx-auto px-4 py-6 transition-all duration-300 pb-24", view === 'calendar' ? "max-w-5xl" : "max-w-2xl")}>
        {/* Responsive Ads Banner Section */}
        <AdBanner />

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={fadeThroughVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="focus:outline-none"
          >
            {view === 'feed' && (
              <Feed 
                entries={entries}
                allEntries={allEntries}
                loading={loadingEntries}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
                onEdit={(entry) => {
                  setEditingEntry(entry);
                  setIsComposeOpen(true);
                }} 
              />
            )}
            {view === 'calendar' && <CalendarView entries={allEntries} loading={loadingAllEntries} />}
            {view === 'gallery' && <GalleryView entries={allEntries} loading={loadingAllEntries} />}
            {view === 'random' && (
              <RandomView 
                entries={allEntries}
                loading={loadingAllEntries}
                onEdit={(entry) => {
                  setEditingEntry(entry);
                  setIsComposeOpen(true);
                }} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 sm:right-8 z-40">
        <button
          onClick={() => {
            setEditingEntry(null);
            setIsComposeOpen(true);
          }}
          className="w-16 h-16 bg-md-sys-color-primary text-md-sys-color-on-primary rounded-[20px] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center active:scale-95"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-md-sys-color-surface/90 backdrop-blur-md border-t border-md-sys-color-surface-variant/50 z-40 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
          <button
            onClick={() => handleViewChange('feed')}
            className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors", view === 'feed' ? "text-md-sys-color-primary" : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface")}
          >
            <LayoutList size={24} className={cn(view === 'feed' && "fill-md-sys-color-primary-container/50")} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button
            onClick={() => handleViewChange('calendar')}
            className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors", view === 'calendar' ? "text-md-sys-color-primary" : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface")}
          >
            <PieChartIcon size={24} className={cn(view === 'calendar' && "fill-md-sys-color-primary-container/50")} />
            <span className="text-[10px] font-medium">Stats</span>
          </button>
          <button
            onClick={() => handleViewChange('gallery')}
            className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors", view === 'gallery' ? "text-md-sys-color-primary" : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface")}
          >
            <ImageIcon size={24} className={cn(view === 'gallery' && "fill-md-sys-color-primary-container/50")} />
            <span className="text-[10px] font-medium">Gallery</span>
          </button>
          <button
            onClick={() => handleViewChange('random')}
            className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors", view === 'random' ? "text-md-sys-color-primary" : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface")}
          >
            <Shuffle size={24} className={cn(view === 'random' && "fill-md-sys-color-primary-container/50")} />
            <span className="text-[10px] font-medium">Random</span>
          </button>
        </div>
      </nav>

      {/* Compose Modal */}
      {isComposeOpen && (
        <Compose 
          entryToEdit={editingEntry || undefined}
          onClose={() => {
            setIsComposeOpen(false);
            setEditingEntry(null);
          }} 
        />
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)}
            onUserUpdate={(updatedUser) => {
              setUser(updatedUser);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
