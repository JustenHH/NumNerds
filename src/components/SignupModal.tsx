import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MinusCircle, X } from 'lucide-react';
import { CLASS_META, evaluateEligibility } from '../data/foreverData';
import {
  CommitmentStatus,
  DungeonEvent,
  EventSignup,
  FIELD_LIMITS,
  Role,
  WowCharacter,
} from '../types/wow';

interface SignupModalProps {
  event: DungeonEvent;
  myCharacters: WowCharacter[];
  existingSignup?: EventSignup | null;
  onClose: () => void;
  onCreateCharacterFirst: () => void;
  onSubmit: (
    eventId: string,
    character: WowCharacter,
    preferredRole: Role,
    altRoles: Role[],
    commitment: CommitmentStatus,
    note: string,
    isExisting: boolean
  ) => Promise<void>;
  onWithdraw?: (eventId: string, signupId: string) => Promise<void>;
}

const ROLES: Role[] = ['Tank', 'Healer', 'DPS'];

export const SignupModal: React.FC<SignupModalProps> = ({
  event,
  myCharacters,
  existingSignup,
  onClose,
  onCreateCharacterFirst,
  onSubmit,
  onWithdraw,
}) => {
  const defaultChar = useMemo(() => {
    if (existingSignup) {
      const matched = myCharacters.find((c) => c.id === existingSignup.characterId);
      if (matched) return matched;
    }
    return myCharacters[0] || null;
  }, [existingSignup, myCharacters]);

  const [selectedCharId, setSelectedCharId] = useState<string>(defaultChar?.id || '');
  const selectedChar = myCharacters.find((c) => c.id === selectedCharId) || defaultChar;

  const [preferredRole, setPreferredRole] = useState<Role>(
    existingSignup?.preferredRole || defaultChar?.primaryRole || 'DPS'
  );
  const [altRoles, setAltRoles] = useState<Role[]>(
    existingSignup?.altRoles ||
      (defaultChar?.secondaryRole && defaultChar.secondaryRole !== 'None'
        ? [defaultChar.secondaryRole]
        : [])
  );
  const [commitment, setCommitment] = useState<CommitmentStatus>(
    existingSignup?.commitment || 'Committed'
  );
  const [note, setNote] = useState(existingSignup?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCharacter = (char: WowCharacter) => {
    setSelectedCharId(char.id);
    setPreferredRole(char.primaryRole);
    setAltRoles(
      char.secondaryRole !== 'None' && char.secondaryRole !== char.primaryRole
        ? [char.secondaryRole]
        : []
    );
  };

  const toggleAltRole = (role: Role) => {
    if (role === preferredRole) return;
    setAltRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        event.id,
        selectedChar,
        preferredRole,
        altRoles.filter((r) => r !== preferredRole),
        commitment,
        note,
        !!existingSignup
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signup.');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingSignup || !onWithdraw) return;
    setSaving(true);
    try {
      await onWithdraw(event.id, existingSignup.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedEligibility = selectedChar
    ? evaluateEligibility(
        selectedChar.level,
        selectedChar.itemLevel,
        event.requirementType,
        event.requiredLevel
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Sign Up: {event.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {event.dungeonName} · Required {event.requirementType === 'level' ? `Lvl ${event.requiredLevel}` : `iLvl ${event.requiredLevel}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close signup modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {myCharacters.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm text-slate-300">
              You haven&apos;t added any characters yet. Create one first to check level eligibility and join this group.
            </p>
            <button
              type="button"
              onClick={onCreateCharacterFirst}
              className="min-h-[44px] rounded-xl bg-[#d4a843] px-5 py-2.5 text-sm font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
            >
              Create My First Character
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5">
            {/* Character Selection with Live Eligibility Check */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Select Character (Level Eligibility Checked Automatically)
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myCharacters.map((char) => {
                  const elig = evaluateEligibility(
                    char.level,
                    char.itemLevel,
                    event.requirementType,
                    event.requiredLevel
                  );
                  const isSelected = selectedChar?.id === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => handleSelectCharacter(char)}
                      className={`w-full min-h-[54px] flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-[#d4a843] bg-[#d4a843]/10'
                          : 'border-slate-800 bg-[#0b0e14] hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold truncate"
                            style={{ color: CLASS_META[char.wowClass].color }}
                          >
                            {char.name}
                          </span>
                          <span className="font-mono-num text-xs text-slate-300">
                            Lvl {char.level}
                          </span>
                          {event.requirementType === 'ilvl' && (
                            <span className="font-mono-num text-xs text-slate-400">
                              · iLvl {char.itemLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {char.race} {char.wowClass} · {char.primaryRole}
                        </p>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shrink-0 ${elig.surfaceClass} ${elig.borderClass} ${elig.textClass}`}
                      >
                        {elig.status === 'green' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                        {elig.status === 'red' && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                        {(elig.status === 'grey' || elig.status === 'amber') && (
                          <MinusCircle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{elig.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedEligibility && (
                <div
                  className={`mt-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${selectedEligibility.surfaceClass} ${selectedEligibility.borderClass} ${selectedEligibility.textClass}`}
                >
                  <span className="font-semibold">{selectedEligibility.label}:</span>{' '}
                  {selectedEligibility.detail}
                  {selectedEligibility.status === 'red' &&
                    ' — You can still sign up if the group agrees to carry, or pick an alt closer to the requirement.'}
                  {selectedEligibility.status === 'grey' &&
                    ' — Over 12 levels above requirement; dungeon XP & challenge will be reduced.'}
                </div>
              )}
            </div>

            {/* Preferred Role & Alt Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Preferred Role
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#0b0e14] p-1 border border-slate-800">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setPreferredRole(r);
                        setAltRoles((prev) => prev.filter((a) => a !== r));
                      }}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition ${
                        preferredRole === r
                          ? 'bg-[#d4a843] text-[#0b0e14]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Alternative Roles (Optional)
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#0b0e14] p-1 border border-slate-800">
                  {ROLES.map((r) => {
                    const isPrimary = r === preferredRole;
                    const active = altRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={isPrimary}
                        onClick={() => toggleAltRole(r)}
                        className={`min-h-[38px] rounded-lg text-xs font-medium transition ${
                          isPrimary
                            ? 'text-slate-600 cursor-not-allowed'
                            : active
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Commitment & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Commitment
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#0b0e14] p-1 border border-slate-800">
                  {(['Committed', 'Tentative'] as CommitmentStatus[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCommitment(c)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition ${
                        commitment === c
                          ? c === 'Committed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Note (optional)
                </label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.signupNoteMax}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Can switch to Healer if needed"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
              {existingSignup && onWithdraw ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleWithdraw()}
                  className="min-h-[44px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
                >
                  Withdraw
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3 ml-auto">
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
                  {saving ? 'Saving...' : existingSignup ? 'Update Signup' : 'Confirm Signup'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
