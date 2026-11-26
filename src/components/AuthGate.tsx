import React, { useState } from 'react';
import { Calendar, Shield, Trophy, Users } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSignIn, authError }) => {
  const [signingIn, setSigningIn] = useState(false);
  const [crestError, setCrestError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await onSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col lg:grid lg:grid-cols-12">
      {/* Left: Atmospheric Guild War-Room Showcase */}
      <div className="relative lg:col-span-7 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#0f131c]">
        <div className="relative h-56 sm:h-72 lg:h-full w-full">
          {!bannerError ? (
            <img
              src="/src/assets/images/warroom_banner_1795682996433.jpg"
              alt="Numlock Nerds Azeroth dungeon planning table"
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="h-full w-full object-cover opacity-55"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#131926] via-[#0b0e14] to-[#1a1610]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/65 to-transparent lg:bg-gradient-to-r lg:from-[#0b0e14]/30 lg:via-[#0b0e14]/60 lg:to-[#0b0e14]" />

          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14">
            <p className="text-xs font-medium tracking-wider text-[#d4a843]">
              World of Warcraft: Forever · Guild Companion
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">
              Numlock Nerds
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed">
              Coordinate slow-burn Forever leveling, track professions and shared bank mats, verify dungeon level eligibility, and lock in group schedules from desktop or phone.
            </p>

            <div className="mt-6 hidden sm:grid grid-cols-3 gap-6 border-t border-slate-800/80 pt-6 max-w-xl">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <Users className="h-4 w-4 text-[#d4a843]" />
                  <span>Roster & Lookup</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Levels, specs & professions</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <Calendar className="h-4 w-4 text-[#d4a843]" />
                  <span>Dungeon Eligibility</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Auto green / grey / red checks</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <Trophy className="h-4 w-4 text-[#d4a843]" />
                  <span>Social Progression</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Friendly guild leveling board</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Sign-In & Install Panel */}
      <div className="flex flex-1 lg:col-span-5 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-xl border border-[#d4a843]/40 bg-[#121722] shrink-0 flex items-center justify-center">
              {!crestError ? (
                <img
                  src="/src/assets/images/guild_crest_1795682995375.jpg"
                  alt="Numlock Nerds crest"
                  referrerPolicy="no-referrer"
                  onError={() => setCrestError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Shield className="h-7 w-7 text-[#d4a843]" />
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Enter the Guild Hall</h2>
              <p className="mt-0.5 text-sm text-slate-400">
                Invite-only roster &amp; calendar. Sign in with an invited Google account or redeem a guild invite code.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#121722] p-6 space-y-4">
            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={signingIn}
              className="flex w-full min-h-[48px] items-center justify-center gap-3 rounded-xl bg-[#d4a843] px-5 py-3 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>

            {authError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {authError}
              </div>
            )}

            <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
              <p className="text-xs text-slate-400">
                Playing from your phone? Install Numlock Nerds directly to your home screen for quick event signups.
              </p>
              <PWAInstallButton />
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            Numlock Nerds · World of Warcraft: Forever Roster & Calendar
          </p>
        </div>
      </div>
    </div>
  );
};
