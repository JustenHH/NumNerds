import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FIELD_LIMITS, GuildMember } from '../types/wow';

interface ProfileModalProps {
  member: GuildMember | null;
  fallbackName: string;
  onClose: () => void;
  onSave: (displayName: string, battleTag: string) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  member,
  fallbackName,
  onClose,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(member?.displayName || fallbackName);
  const [battleTag, setBattleTag] = useState(member?.battleTag || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(displayName, battleTag);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Guildmate Profile</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              How friends in Numlock Nerds see you as a character owner.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              maxLength={FIELD_LIMITS.displayNameMax}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Justen"
              className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              BattleTag (optional)
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.battleTagMax}
              value={battleTag}
              onChange={(e) => setBattleTag(e.target.value)}
              placeholder="e.g. Player#2140"
              className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-[#d4a843] px-5 py-2 text-sm font-semibold text-[#0b0e14] hover:bg-[#e5b95c] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
