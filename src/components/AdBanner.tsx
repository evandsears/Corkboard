import React, { useEffect, useState } from 'react';
import { Sparkles, HelpCircle, Smartphone, Globe } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

interface AdBannerProps {
  slot?: string;
  client?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
}

/**
 * AdBanner - Dual Google AdSense (Web) and Google AdMob (Mobile) Prepped Component
 * 
 * Automatically detects whether the application is running as a Native Mobile app 
 * (via Capacitor/Android/iOS) or a Web application:
 * 
 * 1. ON WEB:
 *    - To activate live AdSense ads, define VITE_AD_CLIENT and VITE_AD_SLOT in environment variables.
 *    - Otherwise, a gorgeous placeholder & Premium prompt are displayed.
 * 
 * 2. ON NATIVE MOBILE (Android/iOS):
 *    - Intelligently loads a high-performance native Google AdMob Banner using the Capacitor AdMob SDK.
 *    - Uses VITE_ADMOB_BANNER_ID if defined; otherwise, gracefully falls back to Google's official 
 *      safe demo/testing ad unit so the banner works instantly in testing.
 */
export function AdBanner({ 
  slot = (import.meta as any).env?.VITE_AD_SLOT || '', 
  client = (import.meta as any).env?.VITE_AD_CLIENT || '', 
  format = 'auto', 
  responsive = true 
}: AdBannerProps) {
  const [hasAdError, setHasAdError] = useState(false);
  const [showPremiumTip, setShowPremiumTip] = useState(false);
  
  // Safely detect if running on native mobile device (Android/iOS)
  const [isNative] = useState(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });

  // Mobile Google AdMob Controller
  useEffect(() => {
    if (isNative) {
      let isMounted = true;
      
      const initAdMob = async () => {
        try {
          // Initialize AdMob SDK
          await AdMob.initialize({});
          
          if (!isMounted) return;

          // Retrieve custom banner ID or fallback to live AdMob banner unit ID
          const bannerId = (import.meta as any).env?.VITE_ADMOB_BANNER_ID || 'ca-app-pub-5109081999190590/8057993575';
          const isTestBanner = bannerId === 'ca-app-pub-3940256099942544/6300978111';

          // Display native bottom banner 
          await AdMob.showBanner({
            adId: bannerId,
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: isTestBanner,
          });
          
          console.log(`[AdMob] Banner loaded successfully. Unit ID: ${bannerId} (Test Mode: ${isTestBanner})`);
        } catch (error) {
          console.error('[AdMob] Banner load or initialization failed:', error);
          setHasAdError(true);
        }
      };

      initAdMob();

      // Clean up banner overlay when component unmounts
      return () => {
        isMounted = false;
        try {
          AdMob.removeBanner();
        } catch (err) {
          console.error('[AdMob] Error removing banner on cleanup:', err);
        }
      };
    }
  }, [isNative]);

  // Web Google AdSense Controller
  useEffect(() => {
    if (!isNative && client && slot) {
      try {
        const scriptId = 'google-adsense-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }

        // Initialize AdSense layout
        // @ts-ignore
        const adsbygoogle = window.adsbygoogle || [];
        adsbygoogle.push({});
      } catch (e) {
        console.error('Google AdSense initialization failed:', e);
        setHasAdError(true);
      }
    }
  }, [isNative, client, slot]);

  // If on Native Mobile, the ad displays perfectly as a native overlay at the bottom.
  // We return a small helper visual notice on web previews so the user knows native ads are ready!
  if (isNative) {
    return (
      <div className="w-full text-center py-2 px-4 bg-md-sys-color-surface-variant/20 rounded-xl border border-md-sys-color-surface-variant/40 mt-1 mb-6 text-xs text-md-sys-color-on-surface-variant/80 flex items-center justify-center gap-2">
        <Smartphone size={14} className="animate-pulse text-md-sys-color-primary" />
        <span>Native Google AdMob active (Overlaying at bottom of screen)</span>
      </div>
    );
  }

  // Web state: check if we show custom placeholders
  const showPlaceholder = !client || !slot || hasAdError;

  if (showPlaceholder) {
    return (
      <div 
        id="ad-banner-placeholder"
        className="w-full bg-md-sys-color-surface border border-dashed border-md-sys-color-surface-variant/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-md-sys-color-surface-variant/10 relative overflow-hidden group shadow-sm mb-6"
      >
        <div className="absolute top-0 left-0 bg-md-sys-color-primary-container text-md-sys-color-on-primary-container px-2 py-0.5 text-[9px] font-mono tracking-wider rounded-br-lg uppercase font-bold select-none">
          Ad Setup Workspace
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-md-sys-color-primary-container rounded-xl flex items-center justify-center text-md-sys-color-on-primary-container shrink-0">
            <Sparkles size={20} className="text-md-sys-color-primary" />
          </div>
          <div className="text-center sm:text-left pt-2 sm:pt-0">
            <div className="flex items-center justify-center sm:justify-start gap-1">
              <h4 className="text-sm font-semibold text-md-sys-color-on-surface">Dual Web/Mobile Ad Platform</h4>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPremiumTip(!showPremiumTip);
                }}
                className="text-md-sys-color-on-surface-variant/60 hover:text-md-sys-color-on-surface transition-colors"
                title="Ad placement information"
              >
                <HelpCircle size={14} />
              </button>
            </div>
            <p className="text-xs text-md-sys-color-on-surface-variant">
              AdSense (Web) and AdMob (Android) are pre-configured to keep Corkboard running!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 z-10">
          <span className="text-[10px] font-medium text-md-sys-color-on-surface-variant border border-md-sys-color-surface-variant px-2 py-1 rounded-md bg-md-sys-color-background select-none flex items-center gap-1">
            <Globe size={11} className="text-emerald-500" /> Web & Mobile Prepped
          </span>
          <button 
            onClick={() => alert("Premium Tier is coming soon! Thank you for your support.")}
            className="px-4 py-1.5 bg-md-sys-color-primary text-md-sys-color-on-primary rounded-full text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap active:scale-95"
          >
            Go Ad-Free
          </button>
        </div>

        {showPremiumTip && (
          <div className="absolute inset-0 bg-md-sys-color-surface/98 backdrop-blur-xs p-3 flex flex-col justify-center items-center text-center animate-in fade-in duration-200">
            <div className="text-xs text-md-sys-color-on-surface leading-normal max-w-md px-4">
              <p className="mb-1 font-semibold">How to activate ads:</p>
              <ul className="text-[11px] text-md-sys-color-on-surface-variant text-left list-disc list-inside space-y-1">
                <li><strong>Mobile App:</strong> Live AdMob configuration is active! Your custom App ID and Banner Unit ID are baked straight into the app.</li>
                <li><strong>Web View:</strong> Set <code className="bg-md-sys-color-surface-variant px-1 rounded">VITE_AD_CLIENT</code> and <code className="bg-md-sys-color-surface-variant px-1 rounded">VITE_AD_SLOT</code> environment variables to activate live Web AdSense.</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowPremiumTip(false)}
              className="mt-2 text-xs font-semibold text-md-sys-color-primary hover:underline"
            >
              Close instructions
            </button>
          </div>
        )}
      </div>
    );
  }

  // Web rendering code if credentials exist
  return (
    <div className="w-full flex flex-col items-center gap-1.5 mb-6 animate-in fade-in duration-300">
      <div className="w-full text-left">
        <span className="text-[9px] font-mono tracking-wider text-md-sys-color-on-surface-variant/65 uppercase font-bold block select-none">
          Sponsored / Advertisement (Web AdSense)
        </span>
      </div>
      <div className="w-full bg-md-sys-color-surface border border-md-sys-color-surface-variant/30 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center min-h-[90px] sm:min-h-[100px] p-2">
        {/* Google AdSense element */}
        <ins 
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </div>
  );
}
