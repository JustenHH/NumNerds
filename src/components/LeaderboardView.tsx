import React, { useMemo, useState } from 'react';
import { Hammer, Trophy, Users } from 'lucide-react';
import { CLASS_META, getLevelBracketName } from '../data/foreverData';
import { WowCharacter } from '../types/wow';

interface LeaderboardViewProps {
  currentUserId: string;
  characters: WowCharacter[];
}

type BoardMode = 'level' | 'professions' | 'players';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUserId,
  characters,
}) => {
  const [mode, setMode] = useState<BoardMode>('level');

  const levelRanked = useMemo(() => {
    return [...characters].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.xpPercent !== a.xpPercent) return b.xpPercent - a.xpPercent;
      return b.itemLevel - a.itemLevel;
    });
  }, [characters]);

  const professionRanked = useMemo(() => {
    return [...characters]
      .map((c) => ({
        char: c,
        totalSkill: (c.prof1Name ? c.prof1Skill : 0) + (c.prof2Name ? c.prof2Skill : 0),
      }))
      .sort((a, b) => b.totalSkill - a.totalSkill);
  }, [characters]);

  const playerGrouped = useMemo(() => {
    const groups = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        chars: WowCharacter[];
        highestLevel: number;
        totalLevels: number;
      }
    >();

    characters.forEach((c) => {
      const existing = groups.get(c.ownerId);
      if (!existing) {
        groups.set(c.ownerId, {
          ownerId: c.ownerId,
          ownerName: c.ownerName,
          chars: [c],
          highestLevel: c.level,
          totalLevels: c.level,
        });
      } else {
        existing.chars.push(c);
        existing.highestLevel = Math.max(existing.highestLevel, c.level);
        existing.totalLevels += c.level;
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (b.highestLevel !== a.highestLevel) return b.highestLevel - a.highestLevel;
      return b.totalLevels - a.totalLevels;
    });
  }, [characters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Progression Leaderboard</h2>
          <p className="text-xs text-slate-400">
            Leveling in Forever is a marathon — track who&apos;s pushing levels and mastering tradeskills.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#121722] p-1 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setMode('level')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap ${
              mode === 'level' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Levels</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('professions')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap ${
              mode === 'professions' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hammer className="h-3.5 w-3.5" />
            <span>Professions</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('players')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap ${
              mode === 'players' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Guildmates</span>
          </button>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] py-12 text-center text-sm text-slate-400">
          Add characters to start populating the Numlock Nerds progression board.
        </div>
      ) : mode === 'level' ? (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] divide-y divide-slate-800/80">
          {levelRanked.map((char, idx) => {
            const pctToSixty = Math.min(
              100,
              Math.round((((char.level - 1) + char.xpPercent / 100) / 59) * 100)
            );
            const isMine = char.ownerId === currentUserId;
            return (
              <div
                key={char.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className={`font-mono-num text-sm font-bold w-7 shrink-0 ${
                      idx === 0
                        ? 'text-[#f3d999]'
                        : idx === 1
                          ? 'text-slate-200'
                          : idx === 2
                            ? 'text-amber-600'
                            : 'text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: CLASS_META[char.wowClass].color }}
                      >
                        {char.name}
                      </span>
                      {isMine && (
                        <span className="text-[11px] font-medium text-[#d4a843]">· You</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {char.ownerName} · {char.race} {char.wowClass} · {getLevelBracketName(char.level)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:w-72 shrink-0">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono-num font-semibold text-white">
                        Level {char.level}
                      </span>
                      <span className="font-mono-num text-slate-400">
                        {char.level < 60 ? `${char.xpPercent}% XP` : 'Max 60'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pctToSixty}%`,
                          backgroundColor: CLASS_META[char.wowClass].color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : mode === 'professions' ? (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] divide-y divide-slate-800/80">
          {professionRanked.map(({ char, totalSkill }, idx) => (
            <div
              key={char.id}
              className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono-num text-sm font-bold text-slate-500 w-7 shrink-0">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: CLASS_META[char.wowClass].color }}
                  >
                    {char.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {char.ownerName} · Lvl {char.level} {char.wowClass}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 text-xs">
                <div className="text-slate-300">
                  {[
                    char.prof1Name ? `${char.prof1Name} ${char.prof1Skill}/300` : '',
                    char.prof2Name ? `${char.prof2Name} ${char.prof2Skill}/300` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No primary professions'}
                </div>
                <span className="font-mono-num font-semibold text-[#f3d999]">
                  {totalSkill} / 600
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playerGrouped.map((group) => (
            <div
              key={group.ownerId}
              className="rounded-2xl border border-slate-800 bg-[#121722] p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{group.ownerName}</h3>
                  <p className="text-xs text-slate-400">
                    {group.chars.length} character{group.chars.length === 1 ? '' : 's'} · Highest Lvl {group.highestLevel}
                  </p>
                </div>
                <span className="font-mono-num text-xs font-semibold text-[#d4a843]">
                  {group.totalLevels} total lvls
                </span>
              </div>

              <div className="space-y-2">
                {group.chars.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span
                      className="font-medium"
                      style={{ color: CLASS_META[c.wowClass].color }}
                    >
                      {c.name} ({c.wowClass})
                    </span>
                    <span className="font-mono-num text-slate-300">
                      Lvl {c.level} · {c.primaryRole}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
