import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';
import { CLASS_META, WOW_CLASSES } from '../data/foreverData';
import type { BlizzardRegion } from '../hooks/useBlizzardSync';
import { GuildMember, Role, WowCharacter, WowClass } from '../types/wow';

interface CharactersViewProps {
  currentUserId: string;
  isAdmin: boolean;
  characters: WowCharacter[];
  members: GuildMember[];
  blizzardRegion: BlizzardRegion;
  onChangeRegion: (r: BlizzardRegion) => void;
  blizzardConfigured: boolean;
  blizzardConnected: boolean;
  blizzardBattleTag: string | null;
  blizzardCallbackUrl: string;
  connectingBlizzard: boolean;
  syncingBlizzard: boolean;
  syncError: string | null;
  syncMessage: string | null;
  onConnectBlizzard: () => Promise<void>;
  onSyncBlizzard: () => Promise<void>;
  onDisconnectBlizzard: () => Promise<void>;
  onAddCharacter: () => void;
  onEditCharacter: (char: WowCharacter) => void;
  onDeleteCharacter: (charId: string) => Promise<void>;
}

export const CharactersView: React.FC<CharactersViewProps> = ({
  currentUserId,
  isAdmin,
  characters,
  members,
  blizzardRegion,
  onChangeRegion,
  blizzardConfigured,
  blizzardConnected,
  blizzardBattleTag,
  blizzardCallbackUrl,
  connectingBlizzard,
  syncingBlizzard,
  syncError,
  syncMessage,
  onConnectBlizzard,
  onSyncBlizzard,
  onDisconnectBlizzard,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
}) => {
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<WowClass | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [inspected, setInspected] = useState<WowCharacter | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const handleCopyCallback = async () => {
    try {
      await navigator.clipboard.writeText(blizzardCallbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const memberByUid = useMemo(() => {
    const map = new Map<string, GuildMember>();
    members.forEach((m) => map.set(m.uid, m));
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter((c) => {
      if (scope === 'mine' && c.ownerId !== currentUserId) return false;
      if (classFilter !== 'All' && c.wowClass !== classFilter) return false;
      if (roleFilter !== 'All' && c.primaryRole !== roleFilter && c.secondaryRole !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.wowClass.toLowerCase().includes(q) ||
        c.prof1Name.toLowerCase().includes(q) ||
        c.prof2Name.toLowerCase().includes(q)
      );
    });
  }, [characters, scope, classFilter, roleFilter, search, currentUserId]);

  const inspectedOwner = inspected ? memberByUid.get(inspected.ownerId) : null;
  const canManageChar = (char: WowCharacter) => char.ownerId === currentUserId || isAdmin;

  const handleConfirmDelete = async (charId: string) => {
    setDeletingId(charId);
    setActionError(null);
    try {
      await onDeleteCharacter(charId);
      setConfirmDeleteId(null);
      if (inspected?.id === charId) {
        setInspected(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete character.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Character Directory</h2>
          <p className="text-xs text-slate-400">
            Sync levels &amp; gear via Battle.net OAuth, and manage professions per character.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddCharacter}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Character</span>
        </button>
      </div>

      {/* Battle.net OAuth Auto-Sync Strip */}
      <section className="rounded-2xl border border-slate-800 bg-[#121722] p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Battle.net Auto-Sync</h3>
              {blizzardConnected && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Connected{blizzardBattleTag ? ` (${blizzardBattleTag})` : ''}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Automatically imports WoW: Forever characters, levels, classes, and item levels while keeping your manual professions intact.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Battle.net Region"
              value={blizzardRegion}
              onChange={(e) => onChangeRegion(e.target.value as BlizzardRegion)}
              className="min-h-[40px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3 text-xs font-semibold text-slate-200 focus:border-[#d4a843] focus:outline-none"
            >
              <option value="eu">EU Region</option>
              <option value="us">US Region</option>
              <option value="kr">KR Region</option>
              <option value="tw">TW Region</option>
            </select>

            {blizzardConnected ? (
              <>
                <button
                  type="button"
                  disabled={syncingBlizzard}
                  onClick={() => void onSyncBlizzard()}
                  className="min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c] disabled:opacity-60 whitespace-nowrap"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingBlizzard ? 'animate-spin' : ''}`} />
                  <span>{syncingBlizzard ? 'Syncing...' : 'Sync Characters Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onDisconnectBlizzard()}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0b0e14] px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-500/40 hover:text-red-300 whitespace-nowrap"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={connectingBlizzard || !blizzardConfigured}
                onClick={() => void onConnectBlizzard()}
                className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-[#d4a843]/40 bg-[#d4a843]/15 px-4 py-2 text-xs font-semibold text-[#f3d999] hover:bg-[#d4a843]/25 disabled:opacity-50 whitespace-nowrap"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>{connectingBlizzard ? 'Waiting for Battle.net...' : 'Connect Battle.net'}</span>
              </button>
            )}
          </div>
        </div>

        {!blizzardConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200 space-y-1">
            <p className="font-semibold">Battle.net Developer credentials needed</p>
            <p className="text-amber-200/80">
              Add <code className="font-mono-num">BLIZZARD_CLIENT_ID</code> and <code className="font-mono-num">BLIZZARD_CLIENT_SECRET</code> in Secrets, and register <code className="font-mono-num break-all">{blizzardCallbackUrl}</code> as a Redirect URI on develop.battle.net.
            </p>
          </div>
        )}

        {blizzardConfigured && (!blizzardConnected || syncError) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0b0e14]/70 px-3.5 py-2 text-[11px] text-slate-400">
            <span className="break-all">
              Redirect URI for this URL:{' '}
              <code className="font-mono-num text-slate-200">{blizzardCallbackUrl}</code>
            </span>
            <button
              type="button"
              onClick={() => void handleCopyCallback()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#121722] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-slate-500 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              {copiedCallback ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy URI</span>
                </>
              )}
            </button>
          </div>
        )}

        {syncError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-300">
            {syncError}
          </p>
        )}

        {syncMessage && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
            {syncMessage}
          </p>
        )}
      </section>

      {actionError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300 break-words">
          {actionError}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#121722] p-1 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`min-h-[38px] rounded-lg px-4 text-xs font-semibold transition whitespace-nowrap ${
              scope === 'all' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Guild ({characters.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('mine')}
            className={`min-h-[38px] rounded-lg px-4 text-xs font-semibold transition whitespace-nowrap ${
              scope === 'mine' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Characters ({characters.filter((c) => c.ownerId === currentUserId).length})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by character, owner, class, or profession..."
            className="w-full min-h-[44px] rounded-xl border border-slate-800 bg-[#121722] pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as WowClass | 'All')}
            className="min-h-[44px] rounded-xl border border-slate-800 bg-[#121722] px-3 text-xs font-medium text-slate-200 focus:border-[#d4a843] focus:outline-none"
          >
            <option value="All">All Classes</option>
            {WOW_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | 'All')}
            className="min-h-[44px] rounded-xl border border-slate-800 bg-[#121722] px-3 text-xs font-medium text-slate-200 focus:border-[#d4a843] focus:outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Tank">Tank</option>
            <option value="Healer">Healer</option>
            <option value="DPS">DPS</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] py-12 px-6 text-center space-y-3">
          <p className="text-sm text-slate-300">
            {characters.length === 0
              ? 'No characters added to Numlock Nerds yet.'
              : 'No characters match your current search or filters.'}
          </p>
          {characters.length === 0 && (
            <button
              type="button"
              onClick={onAddCharacter}
              className="min-h-[42px] rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
            >
              Add First Character
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-[#121722]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                  <th className="py-3.5 px-4">Character</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4 text-right">Level</th>
                  <th className="py-3.5 px-4">Class &amp; Spec</th>
                  <th className="py-3.5 px-4">Roles</th>
                  <th className="py-3.5 px-4">Professions</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filtered.map((char) => {
                  const editable = canManageChar(char);
                  return (
                    <tr
                      key={char.id}
                      onClick={() => setInspected(char)}
                      className="cursor-pointer transition hover:bg-slate-800/35"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold" style={{ color: CLASS_META[char.wowClass].color }}>
                          {char.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {char.faction}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{char.ownerName}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono-num font-semibold text-white">
                          {char.level}
                        </span>
                        {char.level < 60 && (
                          <span className="ml-1.5 font-mono-num text-xs text-slate-400">
                            ({char.xpPercent}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200">
                          {char.race} {char.wowClass}
                        </div>
                        {char.specNotes && (
                          <div className="text-xs text-slate-400 truncate max-w-[200px]">
                            {char.specNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {char.primaryRole}
                        {char.secondaryRole !== 'None' ? ` / ${char.secondaryRole}` : ''}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {[
                          char.prof1Name ? `${char.prof1Name} (${char.prof1Skill})` : '',
                          char.prof2Name ? `${char.prof2Name} (${char.prof2Skill})` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'None'}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editable ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditCharacter(char)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                              aria-label={`Edit ${char.name}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {confirmDeleteId === char.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingId === char.id}
                                  onClick={() => void handleConfirmDelete(char.id)}
                                  className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                                >
                                  {deletingId === char.id ? '...' : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(char.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                                aria-label={`Delete ${char.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">View</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map((char) => {
              const editable = canManageChar(char);
              return (
                <div
                  key={char.id}
                  onClick={() => setInspected(char)}
                  className="rounded-2xl border border-slate-800 bg-[#121722] p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-base font-semibold"
                          style={{ color: CLASS_META[char.wowClass].color }}
                        >
                          {char.name}
                        </span>
                        <span className="font-mono-num text-xs font-semibold text-white">
                          Lvl {char.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Owner: {char.ownerName} · {char.race} {char.wowClass}
                      </p>
                    </div>

                    {editable && (
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onEditCharacter(char)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0b0e14] text-slate-300"
                          aria-label={`Edit ${char.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {confirmDeleteId === char.id ? (
                          <button
                            type="button"
                            disabled={deletingId === char.id}
                            onClick={() => void handleConfirmDelete(char.id)}
                            className="min-h-[40px] rounded-xl bg-red-500/20 border border-red-500/40 px-3 text-xs font-semibold text-red-300"
                          >
                            {deletingId === char.id ? '...' : 'Confirm'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(char.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0b0e14] text-slate-400 hover:text-red-400"
                            aria-label={`Delete ${char.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 border-t border-slate-800/80 pt-2.5">
                    <span>
                      {char.primaryRole}
                      {char.secondaryRole !== 'None' ? ` / ${char.secondaryRole}` : ''}
                    </span>
                    {(char.prof1Name || char.prof2Name) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {[
                            char.prof1Name ? `${char.prof1Name} ${char.prof1Skill}` : '',
                            char.prof2Name ? `${char.prof2Name} ${char.prof2Skill}` : '',
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Inspect Character Modal */}
      {inspected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3
                  className="text-xl font-bold"
                  style={{ color: CLASS_META[inspected.wowClass].color }}
                >
                  {inspected.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Level {inspected.level} {inspected.race} {inspected.wowClass} · {inspected.faction}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close character details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Owner</p>
                <p className="mt-0.5 font-medium text-white">{inspected.ownerName}</p>
                {inspectedOwner?.battleTag && (
                  <p className="font-mono-num text-xs text-slate-400">
                    {inspectedOwner.battleTag}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">Roles</p>
                <p className="mt-0.5 font-medium text-white">
                  {inspected.primaryRole}
                  {inspected.secondaryRole !== 'None' ? ` (Alt: ${inspected.secondaryRole})` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Progression</p>
                <p className="mt-0.5 font-mono-num text-white">
                  Lvl {inspected.level} · {inspected.xpPercent}% XP · iLvl {inspected.itemLevel}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Professions</p>
                <p className="mt-0.5 text-slate-200">
                  {[
                    inspected.prof1Name ? `${inspected.prof1Name} (${inspected.prof1Skill}/300)` : '',
                    inspected.prof2Name ? `${inspected.prof2Name} (${inspected.prof2Skill}/300)` : '',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'None set'}
                </p>
              </div>
            </div>

            {inspected.specNotes && (
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-400">Spec &amp; Notes</p>
                <p className="mt-1 text-sm text-slate-200">{inspected.specNotes}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {canManageChar(inspected) && (
                <div className="flex items-center gap-2">
                  {confirmDeleteId === inspected.id ? (
                    <button
                      type="button"
                      disabled={deletingId === inspected.id}
                      onClick={() => void handleConfirmDelete(inspected.id)}
                      className="min-h-[44px] rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30"
                    >
                      {deletingId === inspected.id ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(inspected.id)}
                      className="min-h-[44px] rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspected;
                      setInspected(null);
                      onEditCharacter(target);
                    }}
                    className="min-h-[44px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Edit Character
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="min-h-[44px] ml-auto rounded-xl bg-[#d4a843] px-5 py-2 text-sm font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
