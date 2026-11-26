import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[#d4a843]/40 bg-[#d4a843]/15 font-medium text-[#f3d999] transition hover:bg-[#d4a843]/25 whitespace-nowrap shrink-0 min-h-[40px] ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-3.5 py-2 text-xs'
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>Add to Home Screen</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-[#151b27] font-medium text-slate-300 transition hover:border-slate-600 hover:text-white whitespace-nowrap shrink-0 min-h-[40px] ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-3.5 py-2 text-xs'
        }`}
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0 text-[#d4a843]" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Install Numlock Nerds</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Add this web app to your phone home screen for instant full-screen access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close install guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num text-xs font-semibold text-[#d4a843] mt-0.5">1.</span>
                  <span>
                    Tap the <strong className="text-white inline-flex items-center gap-1">Share <Share className="h-3.5 w-3.5 inline" /></strong> button in the Safari browser bar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num text-xs font-semibold text-[#d4a843] mt-0.5">2.</span>
                  <span>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num text-xs font-semibold text-[#d4a843] mt-0.5">3.</span>
                  <span>Tap <strong className="text-white">Add</strong> to place the Numlock Nerds crest on your home screen.</span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num text-xs font-semibold text-[#d4a843] mt-0.5">1.</span>
                  <span>Open your browser menu (three dots or address bar icon).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-num text-xs font-semibold text-[#d4a843] mt-0.5">2.</span>
                  <span>
                    Choose <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#d4a843] px-4 py-2 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c]"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
