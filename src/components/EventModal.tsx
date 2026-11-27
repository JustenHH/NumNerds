import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { FOREVER_INSTANCES } from '../data/foreverData';
import {
  DungeonEvent,
  EventCategory,
  FIELD_LIMITS,
  RequirementType,
} from '../types/wow';

interface EventModalProps {
  existing?: DungeonEvent | null;
  onClose: () => void;
  onSave: (
    payload: Omit<DungeonEvent, 'id' | 'guildId' | 'creatorId' | 'creatorName' | 'status' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
}

function getDefaultDateTimeLocal(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setHours(20, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const EventModal: React.FC<EventModalProps> = ({
  existing,
  onClose,
  onSave,
}) => {
  const defaultDungeon =
    FOREVER_INSTANCES.find((i) => i.id === 'the-deadmines') || FOREVER_INSTANCES[0];
  const initialInstance =
    FOREVER_INSTANCES.find((i) => i.id === existing?.dungeonId) ||
    (existing?.dungeonId === 'custom' ? null : defaultDungeon);

  const [category, setCategory] = useState<EventCategory>(
    existing?.category || initialInstance?.category || 'Dungeon'
  );
  const [dungeonId, setDungeonId] = useState(
    existing?.dungeonId === 'custom' ? 'custom' : initialInstance?.id || defaultDungeon.id
  );
  const [customDungeonName, setCustomDungeonName] = useState(
    existing?.dungeonId === 'custom' ? existing.dungeonName : ''
  );
  const [title, setTitle] = useState(existing?.title || '');
  const [requirementType, setRequirementType] = useState<RequirementType>(
    existing?.requirementType || 'level'
  );
  const [requiredLevel, setRequiredLevel] = useState<number>(
    existing?.requiredLevel ?? initialInstance?.recommendedLevel ?? defaultDungeon.recommendedLevel
  );
  const [partySize, setPartySize] = useState<number>(
    existing?.partySize ?? initialInstance?.partySize ?? defaultDungeon.partySize
  );
  const [scheduledAt, setScheduledAt] = useState(
    existing?.scheduledAt || getDefaultDateTimeLocal()
  );
  const [timeNotes, setTimeNotes] = useState(existing?.timeNotes || '');
  const [description, setDescription] = useState(existing?.description || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredInstances = useMemo(
    () => FOREVER_INSTANCES.filter((inst) => inst.category === category),
    [category]
  );

  const selectedInstance = useMemo(
    () =>
      dungeonId === 'custom'
        ? null
        : FOREVER_INSTANCES.find((inst) => inst.id === dungeonId) || filteredInstances[0],
    [dungeonId, filteredInstances]
  );

  const handleCategoryChange = (nextCategory: EventCategory) => {
    setCategory(nextCategory);
    const first = FOREVER_INSTANCES.find((i) => i.category === nextCategory);
    if (first) {
      setDungeonId(first.id);
      setPartySize(first.partySize);
      if (requirementType === 'level') {
        setRequiredLevel(first.recommendedLevel);
      }
    }
  };

  const handleInstanceChange = (nextId: string) => {
    setDungeonId(nextId);
    if (nextId === 'custom') return;
    const found = FOREVER_INSTANCES.find((i) => i.id === nextId);
    if (found) {
      setPartySize(found.partySize);
      if (requirementType === 'level') {
        setRequiredLevel(found.recommendedLevel);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCustom = dungeonId === 'custom';
    const resolvedDungeonName = isCustom
      ? customDungeonName.trim()
      : selectedInstance?.name || '';
    if (!resolvedDungeonName) {
      setError('Please enter a dungeon or instance name.');
      return;
    }
    if (!scheduledAt) {
      setError('Please pick a proposed date and time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim() || resolvedDungeonName,
          dungeonId: isCustom ? 'custom' : selectedInstance!.id,
          dungeonName: resolvedDungeonName,
          category,
          partySize,
          requirementType,
          requiredLevel,
          scheduledAt,
          timeNotes,
          description,
        },
        existing?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {existing ? 'Edit Scheduled Run' : 'Propose Dungeon or Group Event'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Select a WoW: Forever instance, set minimum level or iLvl, and propose a time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close event modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5">
          {/* Category Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Activity Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#0b0e14] p-1 border border-slate-800">
              {(['Dungeon', 'Raid', 'Quest', 'World'] as EventCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition ${
                    category === cat
                      ? 'bg-[#d4a843] text-[#0b0e14]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Forever Dungeon / Raid Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              WoW: Forever {category}
            </label>
            <select
              value={dungeonId === 'custom' ? 'custom' : selectedInstance?.id || ''}
              onChange={(e) => handleInstanceChange(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
            >
              {filteredInstances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.isForeverNew ? '★ ' : ''}
                  {inst.name} — Lvl {inst.minLevel === inst.maxLevel ? inst.minLevel : `${inst.minLevel}–${inst.maxLevel}`} ({inst.zone} · {inst.partySize}p{inst.isForeverNew ? ' · Forever' : ''})
                </option>
              ))}
              <option value="custom">Custom / Other Instance...</option>
            </select>
            {dungeonId === 'custom' ? (
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.dungeonNameMax}
                value={customDungeonName}
                onChange={(e) => setCustomDungeonName(e.target.value)}
                placeholder="Enter custom dungeon, raid, or zone name..."
                className="mt-2.5 w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
              />
            ) : selectedInstance ? (
              <p className="mt-1.5 text-xs text-slate-400">
                {selectedInstance.zone} · Typical level {selectedInstance.minLevel}–{selectedInstance.maxLevel} · {selectedInstance.notes}
              </p>
            ) : null}
          </div>

          {/* Custom Event Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Run Title (optional — defaults to dungeon name)
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.eventTitleMax}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedInstance ? `e.g. ${selectedInstance.name} Quest Run` : 'Event title'}
              className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
            />
          </div>

          {/* Requirement Type, Required Level / iLvl, Party Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Requirement Mode
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#0b0e14] p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRequirementType('level');
                    if (selectedInstance) setRequiredLevel(selectedInstance.recommendedLevel);
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-medium transition ${
                    requirementType === 'level'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Char Lvl
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequirementType('ilvl');
                    setRequiredLevel(55);
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-medium transition ${
                    requirementType === 'ilvl'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Item Lvl
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Required {requirementType === 'level' ? 'Character Level' : 'Item Level'}
              </label>
              <input
                type="number"
                min={1}
                max={requirementType === 'level' ? 60 : 100}
                required
                value={requiredLevel}
                onChange={(e) => setRequiredLevel(Number(e.target.value))}
                className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Party Size
              </label>
              <input
                type="number"
                min={2}
                max={40}
                required
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              />
            </div>
          </div>

          {/* Eligibility Rule Preview */}
          {requirementType === 'level' && (
            <div className="rounded-xl border border-slate-800 bg-[#0b0e14]/70 px-4 py-3 text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-emerald-400">
                Green (Eligible): Lvl {Math.max(1, requiredLevel - 1)}–{Math.min(60, requiredLevel + 10)}
              </span>
              <span className="text-slate-400">
                Grey (Over-leveled): Lvl {requiredLevel + 13}+
              </span>
              <span className="text-red-400">
                Red (Too Low): Below Lvl {Math.max(1, requiredLevel - 1)}
              </span>
            </div>
          )}

          {/* Proposed Time & Flexible Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Proposed Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Time Flexibility Note (optional)
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.timeNotesMax}
                value={timeNotes}
                onChange={(e) => setTimeNotes(e.target.value)}
                placeholder="e.g. Flexible ±30m · Server time"
                className="w-full min-h-[44px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Group Notes & Prep
            </label>
            <textarea
              rows={2}
              maxLength={FIELD_LIMITS.eventDescMax}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grab all Westfall quests beforehand. Bringing spare potions."
              className="w-full rounded-xl border border-slate-700/80 bg-[#0b0e14] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
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
              {saving ? 'Saving...' : existing ? 'Save Event' : 'Post Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
