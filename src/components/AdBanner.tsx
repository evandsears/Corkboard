import React, { useEffect, useState } from 'react';
import { Sparkles, HelpCircle } from 'lucide-react';

interface AdBannerProps {
  slot?: string;
  client?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
}

/**
 * AdBanner - Google AdSense Prepped Component
 * 
 * To activate live Google AdSense ads:
 * 1. Define VITE_AD_CLIENT and VITE_AD_SLOT in your environment variables.
 * 2. Example: 
 *    VITE_AD_CLIENT="ca-pub-XXXXXXXXXXXXXXXX"
 *    VITE_AD_SLOT="XXXXXXXXXX"
 * 
 * If variables are not defined, a polished, non-disruptive sponsor placeholder
 * will be shown with a premium option placeholder.
 */
export function AdBanner({ 
  slot = (import.meta as any).env?.VITE_AD_SLOT || '', 
  client = (import.meta as any).env?.VITE_AD_CLIENT || '', 
  format = 'auto', 
  responsive = true 
}: AdBannerProps) {
  const [hasAdError, setHasAdError] = useState(false);
  const [showPremiumTip, setShowPremiumTip] = useState(false);

  useEffect(() => {
    // If client and slot are provided, try loading the AdSense script and initializing the ad
    if (client && slot) {
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

        // Initialize AdSense
        // @ts-ignore
        const adsbygoogle = window.adsbygoogle || [];
        adsbygoogle.push({});
      } catch (e) {
        console.error('Google AdSense initialization failed:', e);
        setHasAdError(true);
      }
    }
  }, [client, slot]);

  const showPlaceholder = !client || !slot || hasAdError;

  if (showPlaceholder) {
    return (
      <div 
        id="ad-banner-placeholder"
        className="w-full bg-md-sys-color-surface border border-dashed border-md-sys-color-surface-variant/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-md-sys-color-surface-variant/10 relative overflow-hidden group shadow-sm mb-6"
      >
        <div className="absolute top-0 left-0 bg-md-sys-color-primary-container text-md-sys-color-on-primary-container px-2 py-0.5 text-[9px] font-mono tracking-wider rounded-br-lg uppercase font-bold select-none">
          Sponsor Space
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-md-sys-color-primary-container rounded-xl flex items-center justify-center text-md-sys-color-on-primary-container shrink-0">
            <Sparkles size={20} className="text-md-sys-color-primary" />
          </div>
          <div className="text-center sm:text-left pt-2 sm:pt-0">
            <div className="flex items-center justify-center sm:justify-start gap-1">
              <h4 className="text-sm font-semibold text-md-sys-color-on-surface">Support Corkboard</h4>
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
              Advertisements help keep Corkboard running! Support development by upgrading or hosting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 z-10">
          <span className="text-[10px] font-medium text-md-sys-color-on-surface-variant border border-md-sys-color-surface-variant px-2 py-1 rounded-md bg-md-sys-color-background select-none">
            Ads Config Ready
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
            <p className="text-xs text-md-sys-color-on-surface leading-normal max-w-md px-4">
              <strong>Ad Space prepped!</strong> To replace this with automated live Google AdSense ads, add your custom <code className="bg-md-sys-color-surface-variant px-1 rounded">VITE_AD_CLIENT</code> and <code className="bg-md-sys-color-surface-variant px-1 rounded">VITE_AD_SLOT</code> credentials to your workspace environment variables.
            </p>
            <button 
              onClick={() => setShowPremiumTip(false)}
              className="mt-2 text-xs font-medium text-md-sys-color-primary underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-1.5 mb-6 animate-in fade-in duration-300">
      <div className="w-full text-left">
        <span className="text-[9px] font-mono tracking-wider text-md-sys-color-on-surface-variant/65 uppercase font-bold block select-none">
          Sponsored / Advertisement
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
