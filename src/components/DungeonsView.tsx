import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit3,
  Lock,
  MinusCircle,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  CLASS_META,
  evaluateEligibility,
  FOREVER_INSTANCES,
} from '../data/foreverData';
import { DungeonEvent, EventCategory, EventSignup, WowCharacter } from '../types/wow';

interface DungeonsViewProps {
  currentUserId: string;
  characters: WowCharacter[];
  events: DungeonEvent[];
  signupsByEvent: Record<string, EventSignup[]>;
  onCreateEvent: () => void;
  onEditEvent: (event: DungeonEvent) => void;
  onUpdateStatus: (eventId: string, status: DungeonEvent['status']) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onOpenSignup: (event: DungeonEvent) => void;
  onWithdrawSignup: (eventId: string, signupId: string) => Promise<void>;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DungeonsView: React.FC<DungeonsViewProps> = ({
  currentUserId,
  characters,
  events,
  signupsByEvent,
  onCreateEvent,
  onEditEvent,
  onUpdateStatus,
  onDeleteEvent,
  onOpenSignup,
  onWithdrawSignup,
}) => {
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'All'>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const charactersById = useMemo(() => {
    const map = new Map<string, WowCharacter>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter === 'upcoming' && (ev.status === 'completed' || ev.status === 'cancelled')) {
        return false;
      }
      if (statusFilter === 'past' && (ev.status === 'open' || ev.status === 'locked')) {
        return false;
      }
      if (categoryFilter !== 'All' && ev.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [events, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Dungeon & Group Calendar</h2>
          <p className="text-xs text-slate-400">
            Propose dungeon runs, check green / grey / red level eligibility, and lock in roles.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateEvent}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Propose Event</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#121722] p-1 border border-slate-800">
          {([
            ['upcoming', 'Upcoming'],
            ['past', 'Past / Closed'],
            ['all', 'All'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition whitespace-nowrap ${
                statusFilter === key
                  ? 'bg-[#d4a843] text-[#0b0e14]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EventCategory | 'All')}
          className="min-h-[40px] rounded-xl border border-slate-800 bg-[#121722] px-3 text-xs font-medium text-slate-200 focus:border-[#d4a843] focus:outline-none"
        >
          <option value="All">All Categories</option>
          <option value="Dungeon">Dungeons</option>
          <option value="Raid">Raids</option>
          <option value="Quest">Group Quests</option>
          <option value="World">World / Farming</option>
        </select>
      </div>

      {/* Events List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] py-12 px-6 text-center space-y-3">
          <Calendar className="mx-auto h-7 w-7 text-slate-500" />
          <p className="text-sm text-slate-300">No scheduled events in this view.</p>
          <button
            type="button"
            onClick={onCreateEvent}
            className="min-h-[42px] rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
          >
            Propose a Dungeon Run
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((ev) => {
            const signups = signupsByEvent[ev.id] || [];
            const mySignup = signups.find((s) => s.userId === currentUserId);
            const isCreator = ev.creatorId === currentUserId;
            const isTerminal = ev.status === 'completed' || ev.status === 'cancelled';
            const instance = FOREVER_INSTANCES.find((i) => i.id === ev.dungeonId);

            const tanks = signups.filter((s) => s.preferredRole === 'Tank');
            const healers = signups.filter((s) => s.preferredRole === 'Healer');
            const dps = signups.filter((s) => s.preferredRole === 'DPS');

            return (
              <article
                key={ev.id}
                className="rounded-2xl border border-slate-800 bg-[#121722] overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800/80">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-[#d4a843]">{ev.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-slate-200">
                        {formatDateTime(ev.scheduledAt)}
                      </span>
                      {ev.timeNotes && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{ev.timeNotes}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          ev.status === 'open'
                            ? 'text-emerald-400 font-medium'
                            : ev.status === 'locked'
                              ? 'text-amber-300 font-medium'
                              : 'text-slate-500 font-medium'
                        }
                      >
                        {ev.status === 'open'
                          ? 'Open for Signups'
                          : ev.status === 'locked'
                            ? 'Roster Locked'
                            : ev.status === 'completed'
                              ? 'Completed'
                              : 'Cancelled'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white">{ev.title}</h3>
                    <p className="text-xs text-slate-400">
                      {ev.dungeonName}
                      {instance ? ` (${instance.zone})` : ''} · Organized by {ev.creatorName} ·{' '}
                      <span className="font-mono-num text-slate-200">
                        Req {ev.requirementType === 'level' ? `Lvl ${ev.requiredLevel}` : `iLvl ${ev.requiredLevel}`}
                      </span>{' '}
                      · Party {signups.length}/{ev.partySize}
                    </p>

                    {ev.description && (
                      <p className="pt-1 text-sm text-slate-300">{ev.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => onOpenSignup(ev)}
                        className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap ${
                          mySignup
                            ? 'border border-slate-700 bg-[#0b0e14] text-slate-200 hover:border-slate-500'
                            : 'bg-[#d4a843] text-[#0b0e14] hover:bg-[#e5b95c]'
                        }`}
                      >
                        {mySignup ? 'Change Signup' : 'Sign Up'}
                      </button>
                    )}

                    {isCreator && !isTerminal && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditEvent(ev)}
                          className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-800 bg-[#0b0e14] text-slate-300 hover:text-white"
                          title="Edit event"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdateStatus(ev.id, ev.status === 'open' ? 'locked' : 'open')
                          }
                          className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-800 bg-[#0b0e14] text-slate-300 hover:text-white"
                          title={ev.status === 'open' ? 'Lock roster' : 'Reopen signups'}
                        >
                          {ev.status === 'open' ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onUpdateStatus(ev.id, 'completed')}
                          className="min-h-[42px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap"
                        >
                          Complete
                        </button>
                      </>
                    )}

                    {isCreator && (
                      confirmDeleteId === ev.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            void onDeleteEvent(ev.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[42px] rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(ev.id)}
                          className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-800 bg-[#0b0e14] text-slate-400 hover:border-red-500/30 hover:text-red-400"
                          title="Delete event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Role Summary & Roster */}
                <div className="p-5 sm:p-6 bg-[#0d1119]/60 space-y-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
                    <span>
                      Tank: <strong className="font-mono-num text-white">{tanks.length}</strong>
                    </span>
                    <span>
                      Healer: <strong className="font-mono-num text-white">{healers.length}</strong>
                    </span>
                    <span>
                      DPS: <strong className="font-mono-num text-white">{dps.length}</strong>
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">
                      Eligibility Key: <span className="text-emerald-400">Green</span> (-1 to +10) ·{' '}
                      <span className="text-slate-400">Grey</span> (+13+) ·{' '}
                      <span className="text-red-400">Red</span> (Too Low)
                    </span>
                  </div>

                  {signups.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No guildmates signed up yet. Be the first to claim a role.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/80 bg-[#121722]">
                      {signups.map((s) => {
                        const liveChar = charactersById.get(s.characterId);
                        const charName = liveChar?.name || s.characterName;
                        const charLevel = liveChar?.level ?? s.characterLevel;
                        const charItemLevel = liveChar?.itemLevel ?? s.characterItemLevel;
                        const charClass = liveChar?.wowClass || s.wowClass;
                        const elig = evaluateEligibility(
                          charLevel,
                          charItemLevel,
                          ev.requirementType,
                          ev.requiredLevel
                        );
                        const canRemove =
                          !isTerminal && (s.userId === currentUserId || isCreator);

                        return (
                          <div
                            key={s.id}
                            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <span
                                className="text-sm font-semibold"
                                style={{ color: CLASS_META[charClass].color }}
                              >
                                {charName}
                              </span>
                              <span className="font-mono-num text-slate-300">
                                Lvl {charLevel}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-300">{s.userName}</span>
                              <span className="text-slate-500">·</span>
                              <span className="font-medium text-white">
                                {s.preferredRole}
                                {s.altRoles.length > 0 ? ` (Alt: ${s.altRoles.join(', ')})` : ''}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span
                                className={
                                  s.commitment === 'Committed'
                                    ? 'text-emerald-400'
                                    : 'text-amber-300'
                                }
                              >
                                {s.commitment}
                              </span>
                              {s.note && (
                                <span className="text-slate-400 italic">&ldquo;{s.note}&rdquo;</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${elig.surfaceClass} ${elig.borderClass} ${elig.textClass}`}
                              >
                                {elig.status === 'green' && <CheckCircle2 className="h-3 w-3" />}
                                {elig.status === 'red' && <AlertCircle className="h-3 w-3" />}
                                {(elig.status === 'grey' || elig.status === 'amber') && (
                                  <MinusCircle className="h-3 w-3" />
                                )}
                                <span>{elig.label}</span>
                              </span>

                              {canRemove && (
                                <button
                                  type="button"
                                  onClick={() => void onWithdrawSignup(ev.id, s.id)}
                                  className="text-slate-400 hover:text-red-400 px-1.5 py-1"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
