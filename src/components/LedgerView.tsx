import React, { useMemo, useState } from 'react';
import { Minus, Package, Plus, ScrollText, Trash2, X } from 'lucide-react';
import { LOOT_QUALITY_META, MATERIAL_CATEGORIES } from '../data/foreverData';
import {
  FIELD_LIMITS,
  GuildMaterial,
  LootQuality,
  LootRecord,
  LootRule,
  MaterialCategory,
} from '../types/wow';

interface LedgerViewProps {
  currentUserId: string;
  currentUserName: string;
  materials: GuildMaterial[];
  lootRecords: LootRecord[];
  onSaveMaterial: (
    payload: Omit<GuildMaterial, 'id' | 'guildId' | 'creatorId' | 'updatedByName' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onAdjustStock: (material: GuildMaterial, delta: number) => Promise<void>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
  onAddLoot: (
    payload: Omit<LootRecord, 'id' | 'guildId' | 'loggerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onDeleteLoot: (lootId: string) => Promise<void>;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  currentUserId,
  currentUserName,
  materials,
  lootRecords,
  onSaveMaterial,
  onAdjustStock,
  onDeleteMaterial,
  onAddLoot,
  onDeleteLoot,
}) => {
  const [subTab, setSubTab] = useState<'materials' | 'loot'>('materials');
  const [catFilter, setCatFilter] = useState<MaterialCategory | 'All'>('All');

  // Add Material Modal state
  const [showMatModal, setShowMatModal] = useState(false);
  const [matName, setMatName] = useState('');
  const [matCat, setMatCat] = useState<MaterialCategory>('Ore & Bars');
  const [matHave, setMatHave] = useState(0);
  const [matNeed, setMatNeed] = useState(20);
  const [matHolder, setMatHolder] = useState(currentUserName);
  const [matNotes, setMatNotes] = useState('');

  // Add Loot Modal state
  const [showLootModal, setShowLootModal] = useState(false);
  const [lootItem, setLootItem] = useState('');
  const [lootQuality, setLootQuality] = useState<LootQuality>('Rare');
  const [lootSource, setLootSource] = useState('');
  const [lootChar, setLootChar] = useState('');
  const [lootOwner, setLootOwner] = useState(currentUserName);
  const [lootRule, setLootRule] = useState<LootRule>('Main Spec');
  const [lootDate, setLootDate] = useState(new Date().toISOString().slice(0, 10));
  const [lootNotes, setLootNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredMaterials = useMemo(() => {
    if (catFilter === 'All') return materials;
    return materials.filter((m) => m.category === catFilter);
  }, [materials, catFilter]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    setSaving(true);
    try {
      await onSaveMaterial({
        itemName: matName,
        category: matCat,
        quantityHave: matHave,
        quantityNeeded: matNeed,
        holderName: matHolder,
        notes: matNotes,
      });
      setMatName('');
      setMatNotes('');
      setShowMatModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lootItem.trim() || !lootSource.trim() || !lootChar.trim()) return;
    setSaving(true);
    try {
      await onAddLoot({
        itemName: lootItem,
        itemQuality: lootQuality,
        sourceName: lootSource,
        recipientCharacter: lootChar,
        recipientOwner: lootOwner || currentUserName,
        ruleMethod: lootRule,
        notes: lootNotes,
        awardedDate: lootDate,
      });
      setLootItem('');
      setLootSource('');
      setLootChar('');
      setLootNotes('');
      setShowLootModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Guild Bank & Loot Ledger</h2>
          <p className="text-xs text-slate-400">
            Track shared profession materials, attunement keys, and transparent loot distribution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (subTab === 'materials' ? setShowMatModal(true) : setShowLootModal(true))}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{subTab === 'materials' ? 'Track Material' : 'Log Loot Drop'}</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#121722] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('materials')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition whitespace-nowrap ${
              subTab === 'materials'
                ? 'bg-[#d4a843] text-[#0b0e14]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Profession Mats ({materials.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('loot')}
            className={`min-h-[38px] inline-flex items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition whitespace-nowrap ${
              subTab === 'loot'
                ? 'bg-[#d4a843] text-[#0b0e14]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ScrollText className="h-3.5 w-3.5" />
            <span>Loot Log ({lootRecords.length})</span>
          </button>
        </div>

        {subTab === 'materials' && (
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as MaterialCategory | 'All')}
            className="min-h-[40px] rounded-xl border border-slate-800 bg-[#121722] px-3 text-xs font-medium text-slate-200 focus:border-[#d4a843] focus:outline-none"
          >
            <option value="All">All Categories</option>
            {MATERIAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {subTab === 'materials' ? (
        filteredMaterials.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#121722] py-12 px-6 text-center space-y-3">
            <p className="text-sm text-slate-300">
              No profession materials or bank items tracked yet.
            </p>
            <button
              type="button"
              onClick={() => setShowMatModal(true)}
              className="min-h-[42px] rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
            >
              Add First Material
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-[#121722] divide-y divide-slate-800/80">
            {filteredMaterials.map((mat) => {
              const met = mat.quantityHave >= mat.quantityNeeded;
              return (
                <div
                  key={mat.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{mat.itemName}</span>
                      <span className="text-xs text-slate-400">· {mat.category}</span>
                      <span
                        className={`text-xs font-medium ${
                          met ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        · {met ? 'Stocked' : `Need ${mat.quantityNeeded - mat.quantityHave} more`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Held by {mat.holderName || 'Unassigned'} · Updated by {mat.updatedByName}
                      {mat.notes ? ` · ${mat.notes}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0b0e14] p-1">
                      <button
                        type="button"
                        onClick={() => void onAdjustStock(mat, -1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                        aria-label={`Decrease ${mat.itemName}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono-num min-w-[68px] text-center text-xs font-semibold text-white">
                        {mat.quantityHave} / {mat.quantityNeeded}
                      </span>
                      <button
                        type="button"
                        onClick={() => void onAdjustStock(mat, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                        aria-label={`Increase ${mat.itemName}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {mat.creatorId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => void onDeleteMaterial(mat.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                        aria-label={`Delete ${mat.itemName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : lootRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] py-12 px-6 text-center space-y-3">
          <p className="text-sm text-slate-300">
            No loot awards logged yet. Record notable drops or BoE items here.
          </p>
          <button
            type="button"
            onClick={() => setShowLootModal(true)}
            className="min-h-[42px] rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c]"
          >
            Log First Drop
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#121722] divide-y divide-slate-800/80">
          {lootRecords.map((item) => {
            const qMeta = LOOT_QUALITY_META[item.itemQuality];
            return (
              <div
                key={item.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: qMeta.color }}>
                      {item.itemName}
                    </span>
                    <span className="text-xs text-slate-400">({qMeta.label})</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-300">{item.sourceName}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Awarded to <strong className="text-slate-200">{item.recipientCharacter}</strong> ({item.recipientOwner}) · {item.ruleMethod} ·{' '}
                    <span className="font-mono-num">{item.awardedDate}</span>
                    {item.notes ? ` · ${item.notes}` : ''}
                  </p>
                </div>

                {item.loggerId === currentUserId && (
                  <button
                    type="button"
                    onClick={() => void onDeleteLoot(item.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400 shrink-0 self-end sm:self-center"
                    aria-label={`Delete ${item.itemName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Material Modal */}
      {showMatModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">Track Shared Material</h3>
              <button
                type="button"
                onClick={() => setShowMatModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateMaterial(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.materialNameMax}
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="e.g. Mithril Bar, Righteous Orb, Mountain Silversage"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={matCat}
                  onChange={(e) => setMatCat(e.target.value as MaterialCategory)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                >
                  {MATERIAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Have</label>
                  <input
                    type="number"
                    min={0}
                    max={99999}
                    value={matHave}
                    onChange={(e) => setMatHave(Number(e.target.value))}
                    className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Needed</label>
                  <input
                    type="number"
                    min={0}
                    max={99999}
                    value={matNeed}
                    onChange={(e) => setMatNeed(Number(e.target.value))}
                    className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Held By (Bank Alt / Player)</label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.holderNameMax}
                  value={matHolder}
                  onChange={(e) => setMatHolder(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.materialNotesMax}
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  placeholder="e.g. For Lionheart Helm craft"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMatModal(false)}
                  className="min-h-[44px] rounded-xl border border-slate-700 px-4 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] rounded-xl bg-[#d4a843] px-5 text-sm font-semibold text-[#0b0e14]"
                >
                  {saving ? 'Saving...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Loot Modal */}
      {showLootModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">Log Loot Distribution</h3>
              <button
                type="button"
                onClick={() => setShowLootModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateLoot(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.lootItemMax}
                  value={lootItem}
                  onChange={(e) => setLootItem(e.target.value)}
                  placeholder="e.g. Cruel Barb, Hand of Justice, Crusader Formula"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quality</label>
                  <select
                    value={lootQuality}
                    onChange={(e) => setLootQuality(e.target.value as LootQuality)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                  >
                    <option value="Uncommon">Uncommon (Green)</option>
                    <option value="Rare">Rare (Blue)</option>
                    <option value="Epic">Epic (Purple)</option>
                    <option value="Legendary">Legendary (Orange)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Distribution Rule</label>
                  <select
                    value={lootRule}
                    onChange={(e) => setLootRule(e.target.value as LootRule)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                  >
                    <option value="Main Spec">Main Spec</option>
                    <option value="Off Spec">Off Spec</option>
                    <option value="Need / Greed">Need / Greed</option>
                    <option value="Round Robin">Round Robin</option>
                    <option value="Guild Bank">Guild Bank</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dungeon / Source</label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.lootSourceMax}
                  value={lootSource}
                  onChange={(e) => setLootSource(e.target.value)}
                  placeholder="e.g. The Deadmines · Edwin VanCleef"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Character</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.characterNameMax}
                    value={lootChar}
                    onChange={(e) => setLootChar(e.target.value)}
                    placeholder="Character name"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.displayNameMax}
                    value={lootOwner}
                    onChange={(e) => setLootOwner(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={lootDate}
                  onChange={(e) => setLootDate(e.target.value)}
                  className="font-mono-num w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.lootNotesMax}
                  value={lootNotes}
                  onChange={(e) => setLootNotes(e.target.value)}
                  placeholder="Optional context"
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#0b0e14] px-3.5 text-sm text-white focus:border-[#d4a843] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLootModal(false)}
                  className="min-h-[44px] rounded-xl border border-slate-700 px-4 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] rounded-xl bg-[#d4a843] px-5 text-sm font-semibold text-[#0b0e14]"
                >
                  {saving ? 'Logging...' : 'Log Loot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
