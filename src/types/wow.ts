export const GUILD_ID = 'numlock-nerds' as const;
export const ADMIN_EMAIL = 'justen.huiting@gmail.com' as const;

export const FIELD_LIMITS = {
  displayNameMax: 40,
  battleTagMax: 32,
  inviteCodeMin: 4,
  inviteCodeMax: 32,
  inviteNoteMax: 60,
  emailMax: 160,
  characterNameMin: 2,
  characterNameMax: 24,
  realmMax: 40,
  raceMax: 24,
  profNameMax: 32,
  specNotesMax: 120,
  eventTitleMax: 80,
  dungeonIdMax: 48,
  dungeonNameMax: 64,
  timeNotesMax: 120,
  eventDescMax: 300,
  signupNoteMax: 160,
  materialNameMax: 60,
  holderNameMax: 40,
  materialNotesMax: 160,
  lootItemMax: 64,
  lootSourceMax: 64,
  lootNotesMax: 160,
} as const;

export type WowClass =
  | 'Warrior'
  | 'Paladin'
  | 'Hunter'
  | 'Rogue'
  | 'Priest'
  | 'Shaman'
  | 'Mage'
  | 'Warlock'
  | 'Druid';

export type Faction = 'Alliance' | 'Horde';
export type Role = 'Tank' | 'Healer' | 'DPS';
export type SecondaryRole = Role | 'None';

export type EventCategory = 'Dungeon' | 'Raid' | 'World' | 'Quest';
export type RequirementType = 'level' | 'ilvl';
export type EventStatus = 'open' | 'locked' | 'completed' | 'cancelled';
export type CommitmentStatus = 'Committed' | 'Tentative';

export type MaterialCategory =
  | 'Ore & Bars'
  | 'Herbs & Alchemy'
  | 'Cloth & Leather'
  | 'Enchanting'
  | 'Keys & Attunement'
  | 'Consumables';

export type LootQuality = 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type LootRule =
  | 'Main Spec'
  | 'Off Spec'
  | 'Need / Greed'
  | 'Round Robin'
  | 'Guild Bank';

export interface GuildMember {
  uid: string;
  guildId: typeof GUILD_ID;
  displayName: string;
  battleTag: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InviteCode {
  code: string;
  guildId: typeof GUILD_ID;
  note: string;
  maxUses: number;
  usesCount: number;
  active: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmailInvite {
  id: string;
  guildId: typeof GUILD_ID;
  email: string;
  note: string;
  active: boolean;
  redeemed: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WowCharacter {
  id: string;
  guildId: typeof GUILD_ID;
  ownerId: string;
  ownerName: string;
  name: string;
  realm: string;
  faction: Faction;
  race: string;
  wowClass: WowClass;
  level: number;
  xpPercent: number;
  itemLevel: number;
  primaryRole: Role;
  secondaryRole: SecondaryRole;
  prof1Name: string;
  prof1Skill: number;
  prof2Name: string;
  prof2Skill: number;
  specNotes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DungeonEvent {
  id: string;
  guildId: typeof GUILD_ID;
  creatorId: string;
  creatorName: string;
  title: string;
  dungeonId: string;
  dungeonName: string;
  category: EventCategory;
  partySize: number;
  requirementType: RequirementType;
  requiredLevel: number;
  scheduledAt: string;
  timeNotes: string;
  description: string;
  status: EventStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EventSignup {
  id: string;
  eventId: string;
  guildId: typeof GUILD_ID;
  userId: string;
  userName: string;
  characterId: string;
  characterName: string;
  wowClass: WowClass;
  characterLevel: number;
  characterItemLevel: number;
  preferredRole: Role;
  altRoles: Role[];
  commitment: CommitmentStatus;
  note: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GuildMaterial {
  id: string;
  guildId: typeof GUILD_ID;
  creatorId: string;
  itemName: string;
  category: MaterialCategory;
  quantityHave: number;
  quantityNeeded: number;
  holderName: string;
  notes: string;
  updatedByName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LootRecord {
  id: string;
  guildId: typeof GUILD_ID;
  loggerId: string;
  itemName: string;
  itemQuality: LootQuality;
  sourceName: string;
  recipientCharacter: string;
  recipientOwner: string;
  ruleMethod: LootRule;
  notes: string;
  awardedDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
