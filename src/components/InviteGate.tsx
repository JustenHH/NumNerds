import React, { useEffect, useState } from 'react';
import { KeyRound, LogOut, MailCheck, Shield } from 'lucide-react';
import { EmailInvite, FIELD_LIMITS } from '../types/wow';

interface InviteGateProps {
  userEmail: string;
  defaultDisplayName: string;
  pendingEmailInvite: EmailInvite | null;
  onRedeemCode: (code: string, displayName: string) => Promise<void>;
  onRedeemEmailInvite: (displayName: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const InviteGate: React.FC<InviteGateProps> = ({
  userEmail,
  defaultDisplayName,
  pendingEmailInvite,
  onRedeemCode,
  onRedeemEmailInvite,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crestError, setCrestError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('invite');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.trim().toUpperCase());
    }
  }, []);

  const handleAcceptEmailInvite = async () => {
    if (!displayName.trim()) {
      setError('Enter the display name your guildmates know you by.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onRedeemEmailInvite(displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Enter the display name your guildmates know you by.');
      return;
    }
    if (!inviteCode.trim()) {
      setError('Enter an invite code from your guild admin.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onRedeemCode(inviteCode, displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invite code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#d4a843]/40 bg-[#121722] shrink-0 flex items-center justify-center">
              {!crestError ? (
                <img
                  src="/src/assets/images/guild_crest_1795682995375.jpg"
                  alt="Numlock Nerds crest"
                  referrerPolicy="no-referrer"
                  onError={() => setCrestError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Shield className="h-6 w-6 text-[#d4a843]" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-white truncate">Numlock Nerds</h1>
              <p className="text-xs text-slate-400 truncate">
                Signed in as {userEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#121722] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#121722] p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Invitation Required</h2>
            <p className="mt-1 text-sm text-slate-400">
              Numlock Nerds is a private guild workspace. Redeem an invite code or accept a pending email invitation to view rosters, events, and guild stock.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Guildmate Display Name
            </label>
            <input
              type="text"
              required
              maxLength={FIELD_LIMITS.displayNameMax}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How friends know you"
              className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
            />
          </div>

          {pendingEmailInvite && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <MailCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">
                    Invitation Found for {pendingEmailInvite.email}
                  </p>
                  {pendingEmailInvite.note && (
                    <p className="mt-0.5 text-xs text-emerald-300/80">
                      Note: {pendingEmailInvite.note}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleAcceptEmailInvite()}
                className="w-full min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0b0e14] transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {submitting ? 'Joining Guild...' : 'Accept Invitation & Join Guild'}
              </button>
            </div>
          )}

          <form onSubmit={(e) => void handleRedeemCode(e)} className="space-y-3 border-t border-slate-800/80 pt-4">
            <label className="block text-xs font-medium text-slate-300">
              {pendingEmailInvite ? 'Or Redeem an Invite Code Instead' : 'Guild Invite Code'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.inviteCodeMax}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NLN-A7K9P2"
                  className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] pl-10 pr-3.5 text-sm uppercase tracking-wider text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] rounded-xl bg-[#d4a843] px-5 py-2 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {submitting ? 'Checking...' : 'Join Guild'}
              </button>
            </div>
          </form>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Need access? Ask the Numlock Nerds guild admin to invite your Google email or send an invite link.
        </p>
      </div>
    </div>
  );
};
