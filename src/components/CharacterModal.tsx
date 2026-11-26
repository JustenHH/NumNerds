import React, { useMemo, useState } from 'react';
import { Link2, RefreshCw, Trash2, X } from 'lucide-react';
import {
  CLASSIC_PROFESSIONS,
  CLASSIC_RACES,
  CLASS_META,
  getAvailableClassesForFaction,
} from '../data/foreverData';
import type { BlizzardRegion } from '../hooks/useBlizzardSync';
import {
  FIELD_LIMITS,
  Faction,
  Role,
  SecondaryRole,
  WowCharacter,
  WowClass,
} from '../types/wow';

interface CharacterModalProps {
  existing?: WowCharacter | null;
  blizzardRegion?: BlizzardRegion;
  onChangeRegion?: (r: BlizzardRegion) => void;
  blizzardConfigured?: boolean;
  blizzardConnected?: boolean;
  blizzardBattleTag?: string | null;
  connectingBlizzard?: boolean;
  syncingBlizzard?: boolean;
  syncError?: string | null;
  syncMessage?: string | null;
  onConnectBlizzard?: () => Promise<void>;
  onSyncBlizzard?: () => Promise<void>;
  onClose: () => void;
  onSave: (
    payload: Omit<WowCharacter, 'id' | 'guildId' | 'ownerId' | 'ownerName' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onDelete?: (charId: string) => Promise<void>;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  existing,
  blizzardRegion = 'eu',
  onChangeRegion,
  blizzardConfigured = false,
  blizzardConnected = false,
  blizzardBattleTag = null,
  connectingBlizzard = false,
  syncingBlizzard = false,
  syncError = null,
  syncMessage = null,
  onConnectBlizzard,
  onSyncBlizzard,
  onClose,
  onSave,
  onDelete,
}) => {
  const initialParts = useMemo(() => {
    const trimmed = (existing?.name || '').trim().replace(/\s+/g, ' ');
    if (!trimmed) return { first: '', last: '' };
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) return { first: trimmed, last: '' };
    return {
      first: trimmed.slice(0, spaceIdx),
      last: trimmed.slice(spaceIdx + 1),
    };
  }, [existing?.name]);

  const [firstName, setFirstName] = useState(initialParts.first);
  const [lastName, setLastName] = useState(initialParts.last);
  const [faction, setFaction] = useState<Faction>(existing?.faction || 'Alliance');
  const [wowClass, setWowClass] = useState<WowClass>(existing?.wowClass || 'Warrior');
  const [race, setRace] = useState(existing?.race || 'Human');
  const [level, setLevel] = useState<number>(existing?.level ?? 1);
  const [xpPercent, setXpPercent] = useState<number>(existing?.xpPercent ?? 0);
  const [itemLevel, setItemLevel] = useState<number>(existing?.itemLevel ?? 1);
  const [primaryRole, setPrimaryRole] = useState<Role>(existing?.primaryRole || 'Tank');
  const [secondaryRole, setSecondaryRole] = useState<SecondaryRole>(existing?.secondaryRole || 'DPS');
  const [prof1Name, setProf1Name] = useState(existing?.prof1Name || 'None');
  const [prof1Skill, setProf1Skill] = useState<number>(existing?.prof1Skill ?? 0);
  const [prof2Name, setProf2Name] = useState(existing?.prof2Name || 'None');
  const [prof2Skill, setProf2Skill] = useState<number>(existing?.prof2Skill ?? 0);
  const [specNotes, setSpecNotes] = useState(existing?.specNotes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableClasses = useMemo(() => getAvailableClassesForFaction(faction), [faction]);
  const availableRaces = useMemo(
    () => CLASSIC_RACES[faction][wowClass] || [],
    [faction, wowClass]
  );

  const handleFactionChange = (nextFaction: Faction) => {
    setFaction(nextFaction);
    const nextClasses = getAvailableClassesForFaction(nextFaction);
    const nextClass = nextClasses.includes(wowClass) ? wowClass : nextClasses[0];
    setWowClass(nextClass);
    const nextRaces = CLASSIC_RACES[nextFaction][nextClass];
    if (!nextRaces.includes(race)) {
      setRace(nextRaces[0] || '');
    }
  };

  const handleClassChange = (nextClass: WowClass) => {
    setWowClass(nextClass);
    const nextRaces = CLASSIC_RACES[faction][nextClass];
    if (!nextRaces.includes(race)) {
      setRace(nextRaces[0] || '');
    }
    setPrimaryRole(CLASS_META[nextClass].defaultRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const combinedName = [cleanFirst, cleanLast].filter(Boolean).join(' ');
    if (cleanFirst.length < FIELD_LIMITS.characterNameMin) {
      setError('First name must be at least 2 characters.');
      return;
    }
    if (combinedName.length > FIELD_LIMITS.characterNameMax) {
      setError(`Combined name cannot exceed ${FIELD_LIMITS.characterNameMax} characters.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          name: combinedName,
          realm: existing?.realm || 'Forever',
          faction,
          race: race || availableRaces[0] || 'Human',
          wowClass,
          level,
          xpPercent,
          itemLevel,
          primaryRole,
          secondaryRole,
          prof1Name,
          prof1Skill: prof1Name === 'None' ? 0 : Math.max(1, prof1Skill),
          prof2Name,
          prof2Skill: prof2Name === 'None' ? 0 : Math.max(1, prof2Skill),
          specNotes,
        },
        existing?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save character.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing || !onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(existing.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete character.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {existing ? `Edit ${existing.name}` : 'Add Character'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              World of Warcraft: Forever (Level 1–60 · Primary Professions max 300)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close character modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5">
          {/* Battle.net Connection Bar */}
          {(onConnectBlizzard || onSyncBlizzard) && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-[#0b0e14]/70 px-3.5 py-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">
                    {blizzardConnected
                      ? `Battle.net Connected${blizzardBattleTag ? ` (${blizzardBattleTag})` : ''}`
                      : 'Battle.net Auto-Sync'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {blizzardConnected
                      ? 'Sync your WoW: Forever characters automatically or edit fields below.'
                      : blizzardConfigured
                        ? 'Connect Battle.net to import WoW: Forever characters automatically.'
                        : 'Add Battle.net secrets on the Roster page to enable auto-sync.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onChangeRegion && (
                    <select
                      aria-label="Battle.net Region"
                      value={blizzardRegion}
                      onChange={(e) => onChangeRegion(e.target.value as BlizzardRegion)}
                      className="min-h-[38px] rounded-lg border border-slate-700 bg-[#121722] px-2.5 text-xs font-semibold text-slate-200 focus:border-[#d4a843] focus:outline-none"
                    >
                      <option value="eu">EU</option>
                      <option value="us">US</option>
                      <option value="kr">KR</option>
                      <option value="tw">TW</option>
                    </select>
                  )}
                  {blizzardConnected && onSyncBlizzard ? (
                    <button
                      type="button"
                      disabled={syncingBlizzard}
                      onClick={() => void onSyncBlizzard()}
                      className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d4a843]/40 bg-[#d4a843]/15 px-3 py-1.5 text-xs font-semibold text-[#f3d999] hover:bg-[#d4a843]/25 whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingBlizzard ? 'animate-spin' : ''}`} />
                      <span>{syncingBlizzard ? 'Syncing...' : 'Sync Characters'}</span>
                    </button>
                  ) : onConnectBlizzard ? (
                    <button
                      type="button"
                      disabled={connectingBlizzard || !blizzardConfigured}
                      onClick={() => void onConnectBlizzard()}
                      className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d4a843]/40 bg-[#d4a843]/15 px-3 py-1.5 text-xs font-semibold text-[#f3d999] hover:bg-[#d4a843]/25 whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      <span>{connectingBlizzard ? 'Connecting...' : 'Connect Battle.net'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
              {syncError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 break-words">
                  {syncError}
                </p>
              )}
              {syncMessage && (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-200 break-words">
                  {syncMessage}
                </p>
              )}
            </div>
          )}

          {/* Character First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={20}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ada"
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Last Name (Surname)
              </label>
              <input
                type="text"
                maxLength={20}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Brightwood"
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
              />
            </div>
          </div>

          {/* Faction, Class, Race */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Faction
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#0b0e14] p-1 border border-slate-800">
                {(['Alliance', 'Horde'] as Faction[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleFactionChange(f)}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold transition ${
                      faction === f
                        ? f === 'Alliance'
                          ? 'bg-sky-600/30 text-sky-200 border border-sky-500/40'
                          : 'bg-red-600/30 text-red-200 border border-red-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Class
              </label>
              <select
                value={wowClass}
                onChange={(e) => handleClassChange(e.target.value as WowClass)}
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              >
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Race
              </label>
              <select
                value={race}
                onChange={(e) => setRace(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              >
                {availableRaces.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Level, XP%, Item Level */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Level (1–60)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                XP % (0–99)
              </label>
              <input
                type="number"
                min={0}
                max={99}
                value={xpPercent}
                onChange={(e) => setXpPercent(Number(e.target.value))}
                className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Avg Item Lvl
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={itemLevel}
                onChange={(e) => setItemLevel(Number(e.target.value))}
                className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              />
            </div>
          </div>

          {/* Roles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Primary Role
              </label>
              <select
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value as Role)}
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              >
                <option value="Tank">Tank</option>
                <option value="Healer">Healer</option>
                <option value="DPS">DPS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Off-Spec / Alt Role
              </label>
              <select
                value={secondaryRole}
                onChange={(e) => setSecondaryRole(e.target.value as SecondaryRole)}
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              >
                <option value="None">None</option>
                <option value="Tank">Tank</option>
                <option value="Healer">Healer</option>
                <option value="DPS">DPS</option>
              </select>
            </div>
          </div>

          {/* Professions (Add / Edit / Remove) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Profession 1</label>
                {prof1Name && prof1Name !== 'None' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProf1Name('None');
                      setProf1Skill(0);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={prof1Name || 'None'}
                  onChange={(e) => {
                    const next = e.target.value;
                    setProf1Name(next);
                    if (next === 'None') setProf1Skill(0);
                    else if (prof1Skill === 0) setProf1Skill(1);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                >
                  {CLASSIC_PROFESSIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={300}
                  aria-label="Profession 1 skill"
                  disabled={!prof1Name || prof1Name === 'None'}
                  value={prof1Name === 'None' ? 0 : prof1Skill}
                  onChange={(e) => setProf1Skill(Number(e.target.value))}
                  className="font-mono-num w-20 min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white disabled:opacity-40 focus:border-[#d4a843] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Profession 2</label>
                {prof2Name && prof2Name !== 'None' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProf2Name('None');
                      setProf2Skill(0);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={prof2Name || 'None'}
                  onChange={(e) => {
                    const next = e.target.value;
                    setProf2Name(next);
                    if (next === 'None') setProf2Skill(0);
                    else if (prof2Skill === 0) setProf2Skill(1);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                >
                  {CLASSIC_PROFESSIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={300}
                  aria-label="Profession 2 skill"
                  disabled={!prof2Name || prof2Name === 'None'}
                  value={prof2Name === 'None' ? 0 : prof2Skill}
                  onChange={(e) => setProf2Skill(Number(e.target.value))}
                  className="font-mono-num w-20 min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-sm text-white disabled:opacity-40 focus:border-[#d4a843] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Talent Spec &amp; Notes
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.specNotesMax}
              value={specNotes}
              onChange={(e) => setSpecNotes(e.target.value)}
              placeholder="e.g. Arms/Prot dungeon tank · Has Scarlet Key"
              className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 break-words">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
            <div>
              {existing && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void handleDelete()}
                      className="min-h-[44px] rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-60"
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-[44px] rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Character</span>
                  </button>
                )
              )}
            </div>

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
                disabled={saving || deleting}
                className="min-h-[44px] rounded-xl bg-[#d4a843] px-5 py-2 text-sm font-semibold text-[#0b0e14] hover:bg-[#e5b95c] disabled:opacity-60"
              >
                {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Character'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
