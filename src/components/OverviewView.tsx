import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronUp,
  Edit3,
  Link2,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { CLASS_META, evaluateEligibility, getLevelBracketName } from '../data/foreverData';
import {
  DungeonEvent,
  EventSignup,
  GuildMaterial,
  GuildMember,
  WowCharacter,
} from '../types/wow';

interface OverviewViewProps {
  currentUserId: string;
  currentUserName: string;
  members: GuildMember[];
  characters: WowCharacter[];
  events: DungeonEvent[];
  signupsByEvent: Record<string, EventSignup[]>;
  materials: GuildMaterial[];
  blizzardConfigured: boolean;
  blizzardConnected: boolean;
  connectingBlizzard: boolean;
  syncingBlizzard: boolean;
  syncError: string | null;
  syncMessage: string | null;
  onConnectBlizzard: () => Promise<void>;
  onSyncBlizzard: () => Promise<void>;
  onNavigate: (tab: 'overview' | 'characters' | 'leaderboard' | 'dungeons' | 'ledger') => void;
  onAddCharacter: () => void;
  onEditCharacter: (char: WowCharacter) => void;
  onDeleteCharacter: (charId: string) => Promise<void>;
  onCreateEvent: () => void;
  onOpenSignup: (event: DungeonEvent) => void;
  onQuickLevelChange: (char: WowCharacter, deltaLevel: number) => Promise<void>;
}

function formatEventDate(isoLocal: string): string {
  const date = new Date(isoLocal);
  if (Number.isNaN(date.getTime())) return isoLocal;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  currentUserId,
  currentUserName,
  members,
  characters,
  events,
  signupsByEvent,
  materials,
  blizzardConfigured,
  blizzardConnected,
  connectingBlizzard,
  syncingBlizzard,
  syncError,
  syncMessage,
  onConnectBlizzard,
  onSyncBlizzard,
  onNavigate,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onCreateEvent,
  onOpenSignup,
  onQuickLevelChange,
}) => {
  const [bannerError, setBannerError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [charActionError, setCharActionError] = useState<string | null>(null);

  const myCharacters = characters.filter((c) => c.ownerId === currentUserId);
  const openEvents = events.filter((e) => e.status === 'open' || e.status === 'locked');
  const neededMaterials = materials.filter((m) => m.quantityHave < m.quantityNeeded);
  const topCharacters = characters.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Compact Guild Header Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#121722]">
        <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
          {!bannerError && (
            <img
              src="/src/assets/images/warroom_banner_1795682996433.jpg"
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121722] via-[#121722]/90 to-[#121722]/75" />

          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-medium text-[#d4a843]">
              Welcome back, {currentUserName}
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
              Numlock Nerds War Room
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Coordinate Classic Forever dungeon groups, check level eligibility across alts, and keep shared profession mats stocked.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAddCharacter}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0b0e14]/90 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 text-[#d4a843]" />
              <span>Add Character</span>
            </button>
            <button
              type="button"
              onClick={onCreateEvent}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2.5 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] whitespace-nowrap shrink-0"
            >
              <Calendar className="h-4 w-4" />
              <span>Propose Run</span>
            </button>
          </div>
        </div>

        {/* 4-Column Summary Strip */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 border-t border-slate-800/90 bg-[#0d1119]/90 divide-y lg:divide-y-0 divide-x divide-slate-800/80">
          <button
            type="button"
            onClick={() => onNavigate('characters')}
            className="flex items-center justify-between p-4 sm:px-6 text-left hover:bg-slate-800/30 transition"
          >
            <div>
              <p className="text-xs text-slate-400">Guild Roster</p>
              <p className="mt-1 font-mono-num text-xl font-semibold text-white">
                {characters.length}
              </p>
            </div>
            <Users className="h-4 w-4 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('leaderboard')}
            className="flex items-center justify-between p-4 sm:px-6 text-left hover:bg-slate-800/30 transition"
          >
            <div>
              <p className="text-xs text-slate-400">Active Friends</p>
              <p className="mt-1 font-mono-num text-xl font-semibold text-white">
                {members.length}
              </p>
            </div>
            <Trophy className="h-4 w-4 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dungeons')}
            className="flex items-center justify-between p-4 sm:px-6 text-left hover:bg-slate-800/30 transition"
          >
            <div>
              <p className="text-xs text-slate-400">Proposed Runs</p>
              <p className="mt-1 font-mono-num text-xl font-semibold text-white">
                {openEvents.length}
              </p>
            </div>
            <Calendar className="h-4 w-4 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ledger')}
            className="flex items-center justify-between p-4 sm:px-6 text-left hover:bg-slate-800/30 transition"
          >
            <div>
              <p className="text-xs text-slate-400">Mats Needed</p>
              <p className="mt-1 font-mono-num text-xl font-semibold text-white">
                {neededMaterials.length}
              </p>
            </div>
            <Package className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </section>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Upcoming Runs */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#121722] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Upcoming Dungeon Proposals</h3>
              <p className="text-xs text-slate-400">
                Sign up with an eligible character and pick your role.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dungeons')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#d4a843] hover:text-[#e5b95c] whitespace-nowrap shrink-0"
            >
              <span>All Events</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {openEvents.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-400">No dungeon runs proposed yet.</p>
              <button
                type="button"
                onClick={onCreateEvent}
                className="min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Propose First Run</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {openEvents.slice(0, 4).map((ev) => {
                const signups = signupsByEvent[ev.id] || [];
                const mySignup = signups.find((s) => s.userId === currentUserId);
                const tanks = signups.filter((s) => s.preferredRole === 'Tank').length;
                const healers = signups.filter((s) => s.preferredRole === 'Healer').length;
                const dps = signups.filter((s) => s.preferredRole === 'DPS').length;

                const mySignupChar = mySignup
                  ? characters.find((c) => c.id === mySignup.characterId)
                  : undefined;

                // Best matching alt preview if user has not signed up yet
                const bestChar = myCharacters[0];
                const bestElig = bestChar
                  ? evaluateEligibility(
                      bestChar.level,
                      bestChar.itemLevel,
                      ev.requirementType,
                      ev.requiredLevel
                    )
                  : null;

                return (
                  <div
                    key={ev.id}
                    className="py-4 first:pt-4 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-medium text-[#d4a843]">{ev.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{formatEventDate(ev.scheduledAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">
                          Req {ev.requirementType === 'level' ? `Lvl ${ev.requiredLevel}` : `iLvl ${ev.requiredLevel}`}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-semibold text-white truncate">
                        {ev.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        {ev.dungeonName} ·{' '}
                        <span className="font-mono-num text-slate-300">
                          {signups.length}/{ev.partySize}
                        </span>{' '}
                        signed ({tanks}T / {healers}H / {dps}D)
                      </p>
                      {mySignup ? (
                        <p className="mt-1 text-xs text-emerald-400">
                          Signed as {mySignupChar?.name || mySignup.characterName} ({mySignup.preferredRole})
                        </p>
                      ) : bestElig ? (
                        <p className={`mt-1 text-xs ${bestElig.textClass}`}>
                          {bestChar.name} (Lvl {bestChar.level}): {bestElig.label}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSignup(ev)}
                      className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                        mySignup
                          ? 'border border-slate-700 bg-[#0b0e14] text-slate-200 hover:border-slate-500'
                          : 'bg-[#d4a843] text-[#0b0e14] hover:bg-[#e5b95c]'
                      }`}
                    >
                      {mySignup ? 'Edit Signup' : 'Sign Up'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right 5 cols: My Progress & Leaderboard Snapshot */}
        <div className="lg:col-span-5 space-y-6">
          {/* My Characters Quick Leveling */}
          <section className="rounded-2xl border border-slate-800 bg-[#121722] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Your Characters</h3>
                <p className="text-xs text-slate-400">Edit, delete, or bump level as you grind.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {blizzardConnected ? (
                  <button
                    type="button"
                    disabled={syncingBlizzard}
                    onClick={() => void onSyncBlizzard()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 whitespace-nowrap disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingBlizzard ? 'animate-spin' : ''}`} />
                    <span>{syncingBlizzard ? 'Syncing...' : 'Sync B.net'}</span>
                  </button>
                ) : blizzardConfigured ? (
                  <button
                    type="button"
                    disabled={connectingBlizzard}
                    onClick={() => void onConnectBlizzard()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap disabled:opacity-50"
                  >
                    <Link2 className="h-3.5 w-3.5 text-[#d4a843]" />
                    <span>{connectingBlizzard ? 'Connecting...' : 'Battle.net'}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onAddCharacter}
                  className="text-xs font-medium text-[#d4a843] hover:text-[#e5b95c] whitespace-nowrap shrink-0"
                >
                  + New Alt
                </button>
              </div>
            </div>

            {syncError && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 break-words">
                {syncError}
              </p>
            )}

            {syncMessage && (
              <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 break-words">
                {syncMessage}
              </p>
            )}

            {charActionError && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 break-words">
                {charActionError}
              </p>
            )}

            {myCharacters.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-400">
                  Add your first World of Warcraft: Forever character to appear on the guild roster.
                </p>
                <button
                  type="button"
                  onClick={onAddCharacter}
                  className="min-h-[40px] rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
                >
                  Create Character
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {myCharacters.map((char) => (
                  <div
                    key={char.id}
                    className="py-3 first:pt-3 last:pb-0 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => onEditCharacter(char)}
                      className="min-w-0 flex-1 text-left hover:opacity-85 transition"
                      title={`Edit ${char.name}`}
                    >
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
                        {char.level < 60 && (
                          <span className="font-mono-num text-xs text-slate-500">
                            {char.xpPercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {char.wowClass} · {char.primaryRole}
                        {char.prof1Name ? ` · ${char.prof1Name} ${char.prof1Skill}` : ''}
                      </p>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {char.level < 60 && (
                        <button
                          type="button"
                          onClick={() => void onQuickLevelChange(char, 1)}
                          className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0b0e14] px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-[#d4a843]/60 hover:text-[#f3d999] whitespace-nowrap"
                          title="Ding +1 Level"
                        >
                          <ChevronUp className="h-3.5 w-3.5 text-[#d4a843]" />
                          <span>+1</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditCharacter(char)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0b0e14] text-slate-400 hover:text-white"
                        aria-label={`Edit ${char.name}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {confirmDeleteId === char.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            setCharActionError(null);
                            try {
                              await onDeleteCharacter(char.id);
                              setConfirmDeleteId(null);
                            } catch (err) {
                              setCharActionError(
                                err instanceof Error ? err.message : 'Could not delete character.'
                              );
                            }
                          }}
                          className="min-h-[36px] rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(char.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0b0e14] text-slate-400 hover:text-red-400"
                          aria-label={`Delete ${char.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Mild Social Leaderboard Snapshot */}
          <section className="rounded-2xl border border-slate-800 bg-[#121722] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Leveling Leaderboard</h3>
                <p className="text-xs text-slate-400">Friendly guild progression pace.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('leaderboard')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#d4a843] hover:text-[#e5b95c] whitespace-nowrap shrink-0"
              >
                <span>Full Board</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {topCharacters.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No characters ranked yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {topCharacters.map((char, idx) => (
                  <div
                    key={char.id}
                    className="py-3 first:pt-3 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-num text-xs font-semibold text-slate-500 w-5">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-sm font-semibold truncate"
                            style={{ color: CLASS_META[char.wowClass].color }}
                          >
                            {char.name}
                          </span>
                          <span className="text-xs text-slate-500 shrink-0">·</span>
                          <span
                            className="text-xs font-medium shrink-0"
                            style={{ color: CLASS_META[char.wowClass].color }}
                          >
                            {char.wowClass}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {char.ownerName} · {getLevelBracketName(char.level)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono-num text-sm font-semibold text-white">
                        Lvl {char.level}
                      </p>
                      <p className="font-mono-num text-[11px] text-slate-400">
                        {char.level < 60 ? `${char.xpPercent}% XP` : `iLvl ${char.itemLevel}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
