import { EventCategory, Faction, LootQuality, MaterialCategory, Role, WowClass } from '../types/wow';

export interface ForeverInstance {
  id: string;
  name: string;
  zone: string;
  category: EventCategory;
  minLevel: number;
  maxLevel: number;
  recommendedLevel: number;
  partySize: number;
  notes: string;
}

export const FOREVER_INSTANCES: ForeverInstance[] = [
  // Classic Era Dungeons (Ordered by level progression)
  {
    id: 'ragefire-chasm',
    name: 'Ragefire Chasm',
    zone: 'Orgrimmar',
    category: 'Dungeon',
    minLevel: 13,
    maxLevel: 18,
    recommendedLevel: 13,
    partySize: 5,
    notes: 'Entry-level Horde dungeon beneath Orgrimmar.',
  },
  {
    id: 'the-deadmines',
    name: 'The Deadmines',
    zone: 'Westfall',
    category: 'Dungeon',
    minLevel: 17,
    maxLevel: 26,
    recommendedLevel: 18,
    partySize: 5,
    notes: 'Defias Brotherhood stronghold in Moonbrook.',
  },
  {
    id: 'wailing-caverns',
    name: 'Wailing Caverns',
    zone: 'The Barrens',
    category: 'Dungeon',
    minLevel: 17,
    maxLevel: 24,
    recommendedLevel: 18,
    partySize: 5,
    notes: 'Druids of the Fang caverns in the Barrens.',
  },
  {
    id: 'shadowfang-keep',
    name: 'Shadowfang Keep',
    zone: 'Silverpine Forest',
    category: 'Dungeon',
    minLevel: 22,
    maxLevel: 30,
    recommendedLevel: 22,
    partySize: 5,
    notes: 'Archmage Arugal’s worgen-infested fortress.',
  },
  {
    id: 'blackfathom-deeps',
    name: 'Blackfathom Deeps',
    zone: 'Ashenvale',
    category: 'Dungeon',
    minLevel: 24,
    maxLevel: 32,
    recommendedLevel: 24,
    partySize: 5,
    notes: 'Sunken temple on the Zoram Strand.',
  },
  {
    id: 'the-stockade',
    name: 'The Stockade',
    zone: 'Stormwind City',
    category: 'Dungeon',
    minLevel: 24,
    maxLevel: 32,
    recommendedLevel: 24,
    partySize: 5,
    notes: 'Stormwind prison riot inside the city.',
  },
  {
    id: 'sm-graveyard',
    name: 'Scarlet Monastery: Graveyard',
    zone: 'Tirisfal Glades',
    category: 'Dungeon',
    minLevel: 26,
    maxLevel: 36,
    recommendedLevel: 28,
    partySize: 5,
    notes: 'First wing of Scarlet Monastery.',
  },
  {
    id: 'gnomeregan',
    name: 'Gnomeregan',
    zone: 'Dun Morogh',
    category: 'Dungeon',
    minLevel: 29,
    maxLevel: 38,
    recommendedLevel: 29,
    partySize: 5,
    notes: 'Irradiated gnomish capital city.',
  },
  {
    id: 'razorfen-kraul',
    name: 'Razorfen Kraul',
    zone: 'The Barrens',
    category: 'Dungeon',
    minLevel: 29,
    maxLevel: 38,
    recommendedLevel: 29,
    partySize: 5,
    notes: 'Quilboar thorny labyrinth.',
  },
  {
    id: 'sm-library',
    name: 'Scarlet Monastery: Library',
    zone: 'Tirisfal Glades',
    category: 'Dungeon',
    minLevel: 29,
    maxLevel: 39,
    recommendedLevel: 32,
    partySize: 5,
    notes: 'Drops the Scarlet Key for Armory & Cathedral.',
  },
  {
    id: 'sm-armory',
    name: 'Scarlet Monastery: Armory',
    zone: 'Tirisfal Glades',
    category: 'Dungeon',
    minLevel: 32,
    maxLevel: 42,
    recommendedLevel: 35,
    partySize: 5,
    notes: 'Requires Scarlet Key. Herod’s shoulder & Ravager.',
  },
  {
    id: 'sm-cathedral',
    name: 'Scarlet Monastery: Cathedral',
    zone: 'Tirisfal Glades',
    category: 'Dungeon',
    minLevel: 35,
    maxLevel: 45,
    recommendedLevel: 38,
    partySize: 5,
    notes: 'Requires Scarlet Key. Mograine & Whitemane.',
  },
  {
    id: 'razorfen-downs',
    name: 'Razorfen Downs',
    zone: 'The Barrens',
    category: 'Dungeon',
    minLevel: 37,
    maxLevel: 46,
    recommendedLevel: 38,
    partySize: 5,
    notes: 'Scourge-held quilboar mounds.',
  },
  {
    id: 'uldaman',
    name: 'Uldaman',
    zone: 'Badlands',
    category: 'Dungeon',
    minLevel: 41,
    maxLevel: 51,
    recommendedLevel: 42,
    partySize: 5,
    notes: 'Ancient Titan vault; Enchanting trainer inside.',
  },
  {
    id: 'zulfarrak',
    name: "Zul'Farrak",
    zone: 'Tanaris',
    category: 'Dungeon',
    minLevel: 44,
    maxLevel: 54,
    recommendedLevel: 45,
    partySize: 5,
    notes: 'Sandfury troll city; Carrot on a Stick quest.',
  },
  {
    id: 'maraudon',
    name: 'Maraudon',
    zone: 'Desolace',
    category: 'Dungeon',
    minLevel: 46,
    maxLevel: 55,
    recommendedLevel: 47,
    partySize: 5,
    notes: 'Orange, Purple, and Princess runs.',
  },
  {
    id: 'sunken-temple',
    name: "Temple of Atal'Hakkar (Sunken Temple)",
    zone: 'Swamp of Sorrows',
    category: 'Dungeon',
    minLevel: 50,
    maxLevel: 60,
    recommendedLevel: 51,
    partySize: 5,
    notes: 'Class quests and Eranikus.',
  },
  {
    id: 'blackrock-depths',
    name: 'Blackrock Depths',
    zone: 'Blackrock Mountain',
    category: 'Dungeon',
    minLevel: 52,
    maxLevel: 60,
    recommendedLevel: 53,
    partySize: 5,
    notes: 'Arena, Vault, Grim Guzzler, Molten Core attunement.',
  },
  {
    id: 'lbrs',
    name: 'Lower Blackrock Spire',
    zone: 'Blackrock Mountain',
    category: 'Dungeon',
    minLevel: 55,
    maxLevel: 60,
    recommendedLevel: 56,
    partySize: 5,
    notes: 'Seal of Ascension quest gems & Onyxia questline.',
  },
  {
    id: 'dire-maul-east',
    name: 'Dire Maul: East',
    zone: 'Feralas',
    category: 'Dungeon',
    minLevel: 55,
    maxLevel: 60,
    recommendedLevel: 56,
    partySize: 5,
    notes: 'Drops Crescent Key for West & North.',
  },
  {
    id: 'ubrs',
    name: 'Upper Blackrock Spire',
    zone: 'Blackrock Mountain',
    category: 'Dungeon',
    minLevel: 55,
    maxLevel: 60,
    recommendedLevel: 58,
    partySize: 10,
    notes: '10-player raid/dungeon; requires Seal of Ascension.',
  },
  {
    id: 'dire-maul-west',
    name: 'Dire Maul: West',
    zone: 'Feralas',
    category: 'Dungeon',
    minLevel: 57,
    maxLevel: 60,
    recommendedLevel: 58,
    partySize: 5,
    notes: 'Prince Tortheldrin & Shen’dralar quests.',
  },
  {
    id: 'dire-maul-north',
    name: 'Dire Maul: North (Tribute)',
    zone: 'Feralas',
    category: 'Dungeon',
    minLevel: 57,
    maxLevel: 60,
    recommendedLevel: 58,
    partySize: 5,
    notes: 'King Gordok Tribute buff & pre-raid BiS.',
  },
  {
    id: 'stratholme',
    name: 'Stratholme (Live / Undead)',
    zone: 'Eastern Plaguelands',
    category: 'Dungeon',
    minLevel: 58,
    maxLevel: 60,
    recommendedLevel: 58,
    partySize: 5,
    notes: 'Righteous Orbs, Baron mount, Naxx attunement.',
  },
  {
    id: 'scholomance',
    name: 'Scholomance',
    zone: 'Western Plaguelands',
    category: 'Dungeon',
    minLevel: 58,
    maxLevel: 60,
    recommendedLevel: 58,
    partySize: 5,
    notes: 'Darkmaster Gandling & Alchemy Lab.',
  },

  // Classic Era Raids
  {
    id: 'zulgurub',
    name: "Zul'Gurub",
    zone: 'Stranglethorn Vale',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 20,
    notes: '20-player catch-up raid; 3-day reset.',
  },
  {
    id: 'aq20',
    name: "Ruins of Ahn'Qiraj (AQ20)",
    zone: 'Silithus',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 20,
    notes: '20-player raid; skill rank books & Ossirian.',
  },
  {
    id: 'onyxia',
    name: "Onyxia's Lair",
    zone: 'Dustwallow Marsh',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 40,
    notes: 'Requires Drakefire Amulet attunement.',
  },
  {
    id: 'molten-core',
    name: 'Molten Core',
    zone: 'Blackrock Mountain',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 40,
    notes: 'Tier 1 raid; Aqual Quintessence for Majordomo.',
  },
  {
    id: 'blackwing-lair',
    name: 'Blackwing Lair',
    zone: 'Blackrock Mountain',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 40,
    notes: 'Tier 2 raid; Onyxia Scale Cloak required for Nefarian.',
  },
  {
    id: 'aq40',
    name: "Temple of Ahn'Qiraj (AQ40)",
    zone: 'Silithus',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 40,
    notes: 'Nature resistance required for Princess Huhuran.',
  },
  {
    id: 'naxxramas',
    name: 'Naxxramas',
    zone: 'Eastern Plaguelands',
    category: 'Raid',
    minLevel: 60,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 40,
    notes: 'Tier 3 citadel; Argent Dawn attunement.',
  },

  // World / Group Quest options
  {
    id: 'elite-quest-group',
    name: 'Elite Quest / Zone Group',
    zone: 'Azeroth',
    category: 'Quest',
    minLevel: 10,
    maxLevel: 60,
    recommendedLevel: 25,
    partySize: 5,
    notes: 'Custom group questing (e.g., Jintha’alor, Whirlwind Axe, Darrowshire).',
  },
  {
    id: 'world-boss-or-farm',
    name: 'World Boss / Mat Farm',
    zone: 'Azeroth',
    category: 'World',
    minLevel: 50,
    maxLevel: 60,
    recommendedLevel: 60,
    partySize: 20,
    notes: 'Open-world farming, Devilsaur, Azuregos, or Kazzak.',
  },
];

export const WOW_CLASSES: WowClass[] = [
  'Warrior',
  'Paladin',
  'Hunter',
  'Rogue',
  'Priest',
  'Shaman',
  'Mage',
  'Warlock',
  'Druid',
];

export const CLASS_META: Record<WowClass, { color: string; bgTint: string; defaultRole: Role }> = {
  Warrior: { color: '#C69B6D', bgTint: 'rgba(198,155,109,0.14)', defaultRole: 'Tank' },
  Paladin: { color: '#F48CBA', bgTint: 'rgba(244,140,186,0.14)', defaultRole: 'Healer' },
  Hunter: { color: '#AAD372', bgTint: 'rgba(170,211,114,0.14)', defaultRole: 'DPS' },
  Rogue: { color: '#FFF468', bgTint: 'rgba(255,244,104,0.14)', defaultRole: 'DPS' },
  Priest: { color: '#F8FAFC', bgTint: 'rgba(248,250,252,0.14)', defaultRole: 'Healer' },
  Shaman: { color: '#38BDF8', bgTint: 'rgba(56,189,248,0.14)', defaultRole: 'Healer' },
  Mage: { color: '#3FC7EB', bgTint: 'rgba(63,199,235,0.14)', defaultRole: 'DPS' },
  Warlock: { color: '#A78BFA', bgTint: 'rgba(167,139,250,0.14)', defaultRole: 'DPS' },
  Druid: { color: '#FF7C0A', bgTint: 'rgba(255,124,10,0.14)', defaultRole: 'Healer' },
};

export const CLASSIC_RACES: Record<Faction, Record<WowClass, string[]>> = {
  Alliance: {
    Warrior: ['Human', 'Dwarf', 'Night Elf', 'Gnome'],
    Paladin: ['Human', 'Dwarf'],
    Hunter: ['Dwarf', 'Night Elf'],
    Rogue: ['Human', 'Dwarf', 'Night Elf', 'Gnome'],
    Priest: ['Human', 'Dwarf', 'Night Elf'],
    Shaman: [],
    Mage: ['Human', 'Gnome'],
    Warlock: ['Human', 'Gnome'],
    Druid: ['Night Elf'],
  },
  Horde: {
    Warrior: ['Orc', 'Undead', 'Tauren', 'Troll'],
    Paladin: [],
    Hunter: ['Orc', 'Tauren', 'Troll'],
    Rogue: ['Orc', 'Undead', 'Troll'],
    Priest: ['Undead', 'Troll'],
    Shaman: ['Orc', 'Tauren', 'Troll'],
    Mage: ['Undead', 'Troll'],
    Warlock: ['Orc', 'Undead'],
    Druid: ['Tauren'],
  },
};

export function getAvailableClassesForFaction(faction: Faction): WowClass[] {
  return WOW_CLASSES.filter((c) => CLASSIC_RACES[faction][c].length > 0);
}

export const CLASSIC_PROFESSIONS: string[] = [
  'None',
  'Alchemy',
  'Blacksmithing',
  'Enchanting',
  'Engineering',
  'Herbalism',
  'Leatherworking',
  'Mining',
  'Skinning',
  'Tailoring',
];

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Ore & Bars',
  'Herbs & Alchemy',
  'Cloth & Leather',
  'Enchanting',
  'Keys & Attunement',
  'Consumables',
];

export const LOOT_QUALITY_META: Record<LootQuality, { color: string; border: string; label: string }> = {
  Uncommon: { color: '#1EFF00', border: 'rgba(30,255,0,0.28)', label: 'Uncommon' },
  Rare: { color: '#3B82F6', border: 'rgba(59,130,246,0.35)', label: 'Rare' },
  Epic: { color: '#A855F7', border: 'rgba(168,85,247,0.35)', label: 'Epic' },
  Legendary: { color: '#FF8000', border: 'rgba(255,128,0,0.4)', label: 'Legendary' },
};

export type EligibilityStatus = 'green' | 'amber' | 'grey' | 'red';

export interface EligibilityResult {
  status: EligibilityStatus;
  label: string;
  detail: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
}

/**
 * Evaluates character eligibility for a dungeon/event requirement:
 * - More than 1 level under minimum (char < min - 1) -> RED
 * - Within 10 levels above minimum (min - 1 <= char <= min + 10) -> GREEN
 * - 11 to 12 levels above minimum (min + 10 < char <= min + 12) -> AMBER
 * - More than 12 levels higher (char > min + 12) -> GREY
 */
export function evaluateEligibility(
  characterLevel: number,
  characterItemLevel: number,
  requirementType: 'level' | 'ilvl',
  requiredValue: number
): EligibilityResult {
  if (requirementType === 'ilvl') {
    const delta = characterItemLevel - requiredValue;
    if (characterItemLevel < requiredValue - 4) {
      return {
        status: 'red',
        label: 'Under-geared',
        detail: `${delta} iLvl (${characterItemLevel}/${requiredValue})`,
        textClass: 'text-red-400',
        surfaceClass: 'bg-red-500/10',
        borderClass: 'border-red-500/30',
      };
    }
    if (characterItemLevel > requiredValue + 15) {
      return {
        status: 'grey',
        label: 'Over-geared',
        detail: `+${delta} iLvl (${characterItemLevel}/${requiredValue})`,
        textClass: 'text-slate-400',
        surfaceClass: 'bg-slate-500/10',
        borderClass: 'border-slate-500/30',
      };
    }
    return {
      status: 'green',
      label: 'Eligible',
      detail: `${delta >= 0 ? `+${delta}` : delta} iLvl (${characterItemLevel}/${requiredValue})`,
      textClass: 'text-emerald-400',
      surfaceClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/30',
    };
  }

  const delta = characterLevel - requiredValue;

  if (characterLevel < requiredValue - 1) {
    return {
      status: 'red',
      label: 'Too Low',
      detail: `${delta} lvl (min ${requiredValue})`,
      textClass: 'text-red-400',
      surfaceClass: 'bg-red-500/10',
      borderClass: 'border-red-500/30',
    };
  }

  if (characterLevel > requiredValue + 12) {
    return {
      status: 'grey',
      label: 'Grey · Over-leveled',
      detail: `+${delta} lvl above req`,
      textClass: 'text-slate-400',
      surfaceClass: 'bg-slate-500/10',
      borderClass: 'border-slate-500/30',
    };
  }

  if (characterLevel > requiredValue + 10) {
    return {
      status: 'amber',
      label: 'Near Grey',
      detail: `+${delta} lvl above req`,
      textClass: 'text-amber-300',
      surfaceClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/30',
    };
  }

  return {
    status: 'green',
    label: 'Eligible',
    detail: delta === 0 ? 'On target level' : delta > 0 ? `+${delta} lvl in range` : `${delta} lvl (within grace)`,
    textClass: 'text-emerald-400',
    surfaceClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
  };
}

export function getLevelBracketName(level: number): string {
  if (level >= 60) return 'Level 60 Cap';
  if (level >= 40) return 'Veteran (40–59)';
  if (level >= 20) return 'Journeyman (20–39)';
  return 'Apprentice (1–19)';
}
