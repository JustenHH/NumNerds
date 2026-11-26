import { useCallback, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { CLASS_META } from '../data/foreverData';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import type { SyncedCharacterPayload } from './useBlizzardSync';
import {
  ADMIN_EMAIL,
  DungeonEvent,
  EmailInvite,
  EventSignup,
  FIELD_LIMITS,
  GUILD_ID,
  GuildMaterial,
  GuildMember,
  InviteCode,
  LootRecord,
  WowCharacter,
} from '../types/wow';

export type MembershipStatus = 'checking' | 'admitted' | 'invite_required';

function clampString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function clampInt(value: number, min: number, max: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : min);
  return Math.max(min, Math.min(max, rounded));
}

async function hashEmailSha256(rawEmail: string): Promise<string> {
  const normalized = rawEmail.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRandomInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `NLN-${suffix}`;
}

export function useGuildData() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('checking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingEmailInvite, setPendingEmailInvite] = useState<EmailInvite | null>(null);

  const [members, setMembers] = useState<GuildMember[]>([]);
  const [characters, setCharacters] = useState<WowCharacter[]>([]);
  const [events, setEvents] = useState<DungeonEvent[]>([]);
  const [signupsByEvent, setSignupsByEvent] = useState<Record<string, EventSignup[]>>({});
  const [materials, setMaterials] = useState<GuildMaterial[]>([]);
  const [lootRecords, setLootRecords] = useState<LootRecord[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [emailInvites, setEmailInvites] = useState<EmailInvite[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const ensurePrivateUserRecord = useCallback(async (firebaseUser: User) => {
    const uid = firebaseUser.uid;
    const email = clampString(firebaseUser.email || 'guildmate@unknown.local', FIELD_LIMITS.emailMax);
    const userPath = `users/${uid}`;
    let userExists = false;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      userExists = userSnap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }

    if (!userExists) {
      try {
        await setDoc(doc(db, 'users', uid), {
          uid,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, userPath);
      }
    }
  }, []);

  const checkMembershipAndAdmission = useCallback(
    async (firebaseUser: User) => {
      if (!firebaseUser.emailVerified) {
        setMembershipStatus('invite_required');
        setDataLoading(false);
        return;
      }

      setMembershipStatus('checking');
      setPendingEmailInvite(null);

      const uid = firebaseUser.uid;
      const emailLower = (firebaseUser.email || '').trim().toLowerCase();
      let adminFlag = emailLower === ADMIN_EMAIL;

      if (!adminFlag) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', uid));
          adminFlag = adminSnap.exists();
        } catch {
          adminFlag = false;
        }
      }
      setIsAdmin(adminFlag);

      const memberPath = `members/${uid}`;
      let memberExists = false;
      try {
        const memberSnap = await getDoc(doc(db, 'members', uid));
        memberExists = memberSnap.exists();
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, memberPath);
      }

      if (memberExists) {
        await ensurePrivateUserRecord(firebaseUser);
        setMembershipStatus('admitted');
        return;
      }

      if (adminFlag) {
        const defaultName = clampString(
          firebaseUser.displayName || emailLower.split('@')[0] || 'Guildmaster',
          FIELD_LIMITS.displayNameMax
        );
        try {
          const batch = writeBatch(db);
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (!userSnap.exists()) {
            batch.set(doc(db, 'users', uid), {
              uid,
              email: clampString(emailLower || 'admin@unknown.local', FIELD_LIMITS.emailMax),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          batch.set(doc(db, 'members', uid), {
            uid,
            guildId: GUILD_ID,
            displayName: defaultName,
            battleTag: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
          setMembershipStatus('admitted');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, memberPath);
        }
        return;
      }

      // Not admitted yet — check if this email has an active email invitation
      if (emailLower) {
        try {
          const emailHash = await hashEmailSha256(emailLower);
          const inviteSnap = await getDoc(doc(db, 'emailInvites', emailHash));
          if (inviteSnap.exists()) {
            const invite = inviteSnap.data() as EmailInvite;
            if (invite.active && !invite.redeemed) {
              setPendingEmailInvite(invite);
            }
          }
        } catch {
          // Safe to proceed to manual code entry if lookup returns nothing
        }
      }

      setMembershipStatus('invite_required');
      setDataLoading(false);
    },
    [ensurePrivateUserRecord]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void checkMembershipAndAdmission(nextUser);
      } else {
        setMembershipStatus('checking');
        setIsAdmin(false);
        setPendingEmailInvite(null);
        setMembers([]);
        setCharacters([]);
        setEvents([]);
        setSignupsByEvent({});
        setMaterials([]);
        setLootRecords([]);
        setInviteCodes([]);
        setEmailInvites([]);
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, [checkMembershipAndAdmission]);

  // Attach primary guild listeners ONLY once the user is admitted to the guild
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || membershipStatus !== 'admitted') {
      return;
    }

    setDataLoading(true);
    let loadedCollections = 0;
    const markLoaded = () => {
      loadedCollections += 1;
      if (loadedCollections >= 5) {
        setDataLoading(false);
      }
    };

    const unsubMembers = onSnapshot(
      query(collection(db, 'members'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as GuildMember);
        list.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setMembers(list);
        markLoaded();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'members')
    );

    const unsubCharacters = onSnapshot(
      query(collection(db, 'characters'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WowCharacter);
        list.sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          if (b.xpPercent !== a.xpPercent) return b.xpPercent - a.xpPercent;
          return a.name.localeCompare(b.name);
        });
        setCharacters(list);
        markLoaded();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'characters')
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DungeonEvent);
        list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        setEvents(list);
        markLoaded();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'events')
    );

    const unsubMaterials = onSnapshot(
      query(collection(db, 'materials'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as GuildMaterial);
        list.sort((a, b) => a.itemName.localeCompare(b.itemName));
        setMaterials(list);
        markLoaded();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'materials')
    );

    const unsubLoot = onSnapshot(
      query(collection(db, 'loot'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as LootRecord);
        list.sort((a, b) => b.awardedDate.localeCompare(a.awardedDate));
        setLootRecords(list);
        markLoaded();
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'loot')
    );

    return () => {
      unsubMembers();
      unsubCharacters();
      unsubEvents();
      unsubMaterials();
      unsubLoot();
    };
  }, [authReady, user, membershipStatus]);

  // Attach admin-only invite listeners
  useEffect(() => {
    if (!authReady || !user || !isAdmin || membershipStatus !== 'admitted') {
      setInviteCodes([]);
      setEmailInvites([]);
      return;
    }

    const unsubInvites = onSnapshot(
      query(collection(db, 'invites'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as InviteCode);
        list.sort((a, b) => a.code.localeCompare(b.code));
        setInviteCodes(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'invites')
    );

    const unsubEmailInvites = onSnapshot(
      query(collection(db, 'emailInvites'), where('guildId', '==', GUILD_ID)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as EmailInvite);
        list.sort((a, b) => a.email.localeCompare(b.email));
        setEmailInvites(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'emailInvites')
    );

    return () => {
      unsubInvites();
      unsubEmailInvites();
    };
  }, [authReady, user, isAdmin, membershipStatus]);

  // Attach subcollection signup listeners for each event once admitted
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || membershipStatus !== 'admitted') {
      return;
    }
    if (events.length === 0) {
      setSignupsByEvent({});
      return;
    }

    const activeEventIds = new Set(events.map((e) => e.id));
    setSignupsByEvent((prev) => {
      const next: Record<string, EventSignup[]> = {};
      for (const id of activeEventIds) {
        if (prev[id]) next[id] = prev[id];
      }
      return next;
    });

    const unsubs = events.map((ev) => {
      const path = `events/${ev.id}/signups`;
      return onSnapshot(
        query(collection(db, 'events', ev.id, 'signups'), where('guildId', '==', GUILD_ID)),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as EventSignup);
          list.sort((a, b) => a.characterName.localeCompare(b.characterName));
          setSignupsByEvent((prev) => ({ ...prev, [ev.id]: list }));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, path)
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [authReady, user, membershipStatus, events]);

  const currentMember = members.find((m) => m.uid === user?.uid) || null;
  const currentUserName =
    currentMember?.displayName ||
    clampString(user?.displayName || user?.email?.split('@')[0] || 'Guildmate', FIELD_LIMITS.displayNameMax);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed.';
      setAuthError(message);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  // Invite Redemption
  const redeemInviteCode = async (rawCode: string, displayNameInput?: string) => {
    if (!user || !user.emailVerified) {
      throw new Error('Please sign in with a verified Google account first.');
    }
    const cleanCode = rawCode.trim().toUpperCase();
    if (
      cleanCode.length < FIELD_LIMITS.inviteCodeMin ||
      cleanCode.length > FIELD_LIMITS.inviteCodeMax ||
      !/^[A-Z0-9_-]+$/.test(cleanCode)
    ) {
      throw new Error('Invite code must be 4–32 letters, numbers, hyphens, or underscores.');
    }

    const inviteSnap = await getDoc(doc(db, 'invites', cleanCode));
    if (!inviteSnap.exists()) {
      throw new Error('Invite code not found. Double-check the code or ask your guild admin.');
    }

    const invite = inviteSnap.data() as InviteCode;
    if (!invite.active || invite.usesCount >= invite.maxUses) {
      throw new Error('This invite code is disabled or has already reached its usage limit.');
    }

    const uid = user.uid;
    const email = clampString(user.email || 'guildmate@unknown.local', FIELD_LIMITS.emailMax);
    const displayName = clampString(
      displayNameInput || user.displayName || email.split('@')[0] || 'Guildmate',
      FIELD_LIMITS.displayNameMax
    );
    if (!displayName) {
      throw new Error('Display name is required.');
    }

    const batch = writeBatch(db);
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) {
      batch.set(doc(db, 'users', uid), {
        uid,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'members', uid), {
      uid,
      guildId: GUILD_ID,
      displayName,
      battleTag: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'redemptions', uid), {
      uid,
      inviteType: 'code',
      inviteId: cleanCode,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'invites', cleanCode), {
      usesCount: invite.usesCount + 1,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    if (typeof window !== 'undefined' && window.location.search.includes('invite=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setPendingEmailInvite(null);
    setMembershipStatus('admitted');
  };

  const redeemEmailInvite = async (displayNameInput?: string) => {
    if (!user || !user.emailVerified || !user.email) {
      throw new Error('Verified Google email is required.');
    }
    const emailLower = user.email.trim().toLowerCase();
    const emailHash = await hashEmailSha256(emailLower);
    const inviteSnap = await getDoc(doc(db, 'emailInvites', emailHash));
    if (!inviteSnap.exists()) {
      throw new Error('No email invitation found for your account.');
    }
    const invite = inviteSnap.data() as EmailInvite;
    if (!invite.active || invite.redeemed) {
      throw new Error('This email invitation is no longer active.');
    }

    const uid = user.uid;
    const displayName = clampString(
      displayNameInput || user.displayName || emailLower.split('@')[0] || 'Guildmate',
      FIELD_LIMITS.displayNameMax
    );
    if (!displayName) {
      throw new Error('Display name is required.');
    }

    const batch = writeBatch(db);
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) {
      batch.set(doc(db, 'users', uid), {
        uid,
        email: clampString(emailLower, FIELD_LIMITS.emailMax),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'members', uid), {
      uid,
      guildId: GUILD_ID,
      displayName,
      battleTag: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'redemptions', uid), {
      uid,
      inviteType: 'email',
      inviteId: emailHash,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'emailInvites', emailHash), {
      redeemed: true,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    setPendingEmailInvite(null);
    setMembershipStatus('admitted');
  };

  // Admin Invite & Member Controls
  const createInviteCode = async (note: string, maxUses: number, customCode?: string): Promise<string> => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const code = clampString(
      (customCode?.trim() || generateRandomInviteCode()).toUpperCase(),
      FIELD_LIMITS.inviteCodeMax
    );
    if (code.length < FIELD_LIMITS.inviteCodeMin || !/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error('Code must be 4–32 uppercase letters, numbers, hyphens, or underscores.');
    }

    const existing = await getDoc(doc(db, 'invites', code));
    if (existing.exists()) {
      throw new Error(`Invite code "${code}" already exists.`);
    }

    const path = `invites/${code}`;
    try {
      await setDoc(doc(db, 'invites', code), {
        code,
        guildId: GUILD_ID,
        note: clampString(note, FIELD_LIMITS.inviteNoteMax),
        maxUses: clampInt(maxUses, 1, 50),
        usesCount: 0,
        active: true,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    return code;
  };

  const toggleInviteCode = async (code: string, active: boolean) => {
    if (!user || !isAdmin) return;
    const path = `invites/${code}`;
    try {
      await updateDoc(doc(db, 'invites', code), {
        active,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteInviteCode = async (code: string) => {
    if (!user || !isAdmin) return;
    const path = `invites/${code}`;
    try {
      await deleteDoc(doc(db, 'invites', code));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const createEmailInvite = async (rawEmail: string, note: string) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const cleanEmail = clampString(rawEmail.toLowerCase(), FIELD_LIMITS.emailMax);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Enter a valid Google email address.');
    }

    const emailHash = await hashEmailSha256(cleanEmail);
    const path = `emailInvites/${emailHash}`;
    try {
      const existing = await getDoc(doc(db, 'emailInvites', emailHash));
      if (existing.exists()) {
        await updateDoc(doc(db, 'emailInvites', emailHash), {
          note: clampString(note, FIELD_LIMITS.inviteNoteMax),
          active: true,
          redeemed: false,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'emailInvites', emailHash), {
          id: emailHash,
          guildId: GUILD_ID,
          email: cleanEmail,
          note: clampString(note, FIELD_LIMITS.inviteNoteMax),
          active: true,
          redeemed: false,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteEmailInvite = async (emailHash: string) => {
    if (!user || !isAdmin) return;
    const path = `emailInvites/${emailHash}`;
    try {
      await deleteDoc(doc(db, 'emailInvites', emailHash));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const removeGuildMember = async (memberUid: string) => {
    if (!user || !isAdmin) return;
    if (memberUid === user.uid) {
      throw new Error('You cannot remove your own admin membership.');
    }
    const path = `members/${memberUid}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'members', memberUid));
      batch.delete(doc(db, 'redemptions', memberUid));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Profile Mutation
  const updateMemberProfile = async (displayName: string, battleTag: string) => {
    if (!user) return;
    const cleanName = clampString(displayName, FIELD_LIMITS.displayNameMax);
    if (!cleanName) throw new Error('Display name is required.');
    const cleanTag = clampString(battleTag, FIELD_LIMITS.battleTagMax);

    const path = `members/${user.uid}`;
    try {
      await updateDoc(doc(db, 'members', user.uid), {
        displayName: cleanName,
        battleTag: cleanTag,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const syncCharacterToOpenSignups = useCallback(
    async (
      characterId: string,
      nextName: string,
      nextClass: WowCharacter['wowClass'],
      nextLevel: number,
      nextItemLevel: number
    ) => {
      if (!user) return;
      const openOrLockedIds = new Set(
        events
          .filter((ev) => ev.status === 'open' || ev.status === 'locked')
          .map((ev) => ev.id)
      );
      for (const [eventId, list] of Object.entries(signupsByEvent)) {
        if (!openOrLockedIds.has(eventId)) continue;
        const match = list.find(
          (s) => s.userId === user.uid && s.characterId === characterId
        );
        if (!match) continue;
        if (
          match.characterName === nextName &&
          match.wowClass === nextClass &&
          match.characterLevel === nextLevel &&
          match.characterItemLevel === nextItemLevel
        ) {
          continue;
        }
        try {
          await updateDoc(doc(db, 'events', eventId, 'signups', match.id), {
            characterName: nextName,
            wowClass: nextClass,
            characterLevel: nextLevel,
            characterItemLevel: nextItemLevel,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-blocking: live view still resolves character name from characters[]
        }
      }
    },
    [user, events, signupsByEvent]
  );

  // Character Mutations
  const saveCharacter = async (
    payload: Omit<WowCharacter, 'id' | 'guildId' | 'ownerId' | 'ownerName' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!user) return;
    const name = clampString(payload.name, FIELD_LIMITS.characterNameMax);
    if (name.length < FIELD_LIMITS.characterNameMin) {
      throw new Error('Character name must be at least 2 characters.');
    }

    const sanitized = {
      ownerName: currentUserName,
      name,
      realm: clampString(payload.realm || 'Forever', FIELD_LIMITS.realmMax) || 'Forever',
      faction: payload.faction,
      race: clampString(payload.race, FIELD_LIMITS.raceMax),
      wowClass: payload.wowClass,
      level: clampInt(payload.level, 1, 60),
      xpPercent: clampInt(payload.xpPercent, 0, 99),
      itemLevel: clampInt(payload.itemLevel, 0, 100),
      primaryRole: payload.primaryRole,
      secondaryRole: payload.secondaryRole,
      prof1Name: clampString(payload.prof1Name === 'None' ? '' : payload.prof1Name, FIELD_LIMITS.profNameMax),
      prof1Skill: payload.prof1Name && payload.prof1Name !== 'None' ? clampInt(payload.prof1Skill, 1, 300) : 0,
      prof2Name: clampString(payload.prof2Name === 'None' ? '' : payload.prof2Name, FIELD_LIMITS.profNameMax),
      prof2Skill: payload.prof2Name && payload.prof2Name !== 'None' ? clampInt(payload.prof2Skill, 1, 300) : 0,
      specNotes: clampString(payload.specNotes, FIELD_LIMITS.specNotesMax),
    };

    if (existingId) {
      const path = `characters/${existingId}`;
      try {
        await updateDoc(doc(db, 'characters', existingId), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
        await syncCharacterToOpenSignups(
          existingId,
          sanitized.name,
          sanitized.wowClass,
          sanitized.level,
          sanitized.itemLevel
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      return;
    }

    const ref = doc(collection(db, 'characters'));
    const path = `characters/${ref.id}`;
    try {
      await setDoc(ref, {
        id: ref.id,
        guildId: GUILD_ID,
        ownerId: user.uid,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const quickUpdateCharacter = async (
    char: WowCharacter,
    updates: { level?: number; xpPercent?: number; itemLevel?: number; prof1Skill?: number; prof2Skill?: number }
  ) => {
    if (!user) return;
    const path = `characters/${char.id}`;
    const nextLevel = clampInt(updates.level ?? char.level, 1, 60);
    const nextItemLevel = clampInt(updates.itemLevel ?? char.itemLevel, 0, 100);
    try {
      await updateDoc(doc(db, 'characters', char.id), {
        level: nextLevel,
        xpPercent: clampInt(updates.xpPercent ?? char.xpPercent, 0, 99),
        itemLevel: nextItemLevel,
        prof1Skill: clampInt(updates.prof1Skill ?? char.prof1Skill, 0, 300),
        prof2Skill: clampInt(updates.prof2Skill ?? char.prof2Skill, 0, 300),
        updatedAt: serverTimestamp(),
      });
      await syncCharacterToOpenSignups(
        char.id,
        char.name,
        char.wowClass,
        nextLevel,
        nextItemLevel
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteCharacter = async (charId: string) => {
    const path = `characters/${charId}`;
    try {
      await deleteDoc(doc(db, 'characters', charId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Event Mutations
  const saveEvent = async (
    payload: Omit<DungeonEvent, 'id' | 'guildId' | 'creatorId' | 'creatorName' | 'status' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!user) return;
    const sanitized = {
      title: clampString(payload.title, FIELD_LIMITS.eventTitleMax) || clampString(payload.dungeonName, FIELD_LIMITS.eventTitleMax),
      dungeonId: clampString(payload.dungeonId, FIELD_LIMITS.dungeonIdMax),
      dungeonName: clampString(payload.dungeonName, FIELD_LIMITS.dungeonNameMax),
      category: payload.category,
      partySize: clampInt(payload.partySize, 2, 40),
      requirementType: payload.requirementType,
      requiredLevel: clampInt(payload.requiredLevel, 1, 100),
      scheduledAt: clampString(payload.scheduledAt, 32),
      timeNotes: clampString(payload.timeNotes, FIELD_LIMITS.timeNotesMax),
      description: clampString(payload.description, FIELD_LIMITS.eventDescMax),
    };

    if (existingId) {
      const path = `events/${existingId}`;
      try {
        await updateDoc(doc(db, 'events', existingId), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      return;
    }

    const ref = doc(collection(db, 'events'));
    const path = `events/${ref.id}`;
    try {
      await setDoc(ref, {
        id: ref.id,
        guildId: GUILD_ID,
        creatorId: user.uid,
        creatorName: currentUserName,
        ...sanitized,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateEventStatus = async (eventId: string, status: DungeonEvent['status']) => {
    const path = `events/${eventId}`;
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteEvent = async (eventId: string) => {
    const path = `events/${eventId}`;
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Signup Mutations (one slot per userId per event)
  const upsertSignup = async (
    eventId: string,
    character: WowCharacter,
    preferredRole: EventSignup['preferredRole'],
    altRoles: EventSignup['altRoles'],
    commitment: EventSignup['commitment'],
    note: string,
    isExisting: boolean
  ) => {
    if (!user) return;
    const signupId = user.uid;
    const path = `events/${eventId}/signups/${signupId}`;
    const sanitized = {
      userName: currentUserName,
      characterId: character.id,
      characterName: character.name,
      wowClass: character.wowClass,
      characterLevel: clampInt(character.level, 1, 60),
      characterItemLevel: clampInt(character.itemLevel, 0, 100),
      preferredRole,
      altRoles: altRoles.slice(0, 3),
      commitment,
      note: clampString(note, FIELD_LIMITS.signupNoteMax),
    };

    try {
      if (isExisting) {
        await updateDoc(doc(db, 'events', eventId, 'signups', signupId), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'events', eventId, 'signups', signupId), {
          id: signupId,
          eventId,
          guildId: GUILD_ID,
          userId: user.uid,
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const withdrawSignup = async (eventId: string, signupId: string) => {
    const path = `events/${eventId}/signups/${signupId}`;
    try {
      await deleteDoc(doc(db, 'events', eventId, 'signups', signupId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Material Mutations
  const saveMaterial = async (
    payload: Omit<GuildMaterial, 'id' | 'guildId' | 'creatorId' | 'updatedByName' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!user) return;
    const sanitized = {
      itemName: clampString(payload.itemName, FIELD_LIMITS.materialNameMax),
      category: payload.category,
      quantityHave: clampInt(payload.quantityHave, 0, 99999),
      quantityNeeded: clampInt(payload.quantityNeeded, 0, 99999),
      holderName: clampString(payload.holderName, FIELD_LIMITS.holderNameMax),
      notes: clampString(payload.notes, FIELD_LIMITS.materialNotesMax),
      updatedByName: currentUserName,
    };

    if (existingId) {
      const path = `materials/${existingId}`;
      try {
        await updateDoc(doc(db, 'materials', existingId), {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      return;
    }

    const ref = doc(collection(db, 'materials'));
    const path = `materials/${ref.id}`;
    try {
      await setDoc(ref, {
        id: ref.id,
        guildId: GUILD_ID,
        creatorId: user.uid,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const adjustMaterialStock = async (material: GuildMaterial, delta: number) => {
    if (!user) return;
    const path = `materials/${material.id}`;
    try {
      await updateDoc(doc(db, 'materials', material.id), {
        quantityHave: clampInt(material.quantityHave + delta, 0, 99999),
        updatedByName: currentUserName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteMaterial = async (materialId: string) => {
    const path = `materials/${materialId}`;
    try {
      await deleteDoc(doc(db, 'materials', materialId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Loot Mutations
  const addLootRecord = async (
    payload: Omit<LootRecord, 'id' | 'guildId' | 'loggerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    const ref = doc(collection(db, 'loot'));
    const path = `loot/${ref.id}`;
    try {
      await setDoc(ref, {
        id: ref.id,
        guildId: GUILD_ID,
        loggerId: user.uid,
        itemName: clampString(payload.itemName, FIELD_LIMITS.lootItemMax),
        itemQuality: payload.itemQuality,
        sourceName: clampString(payload.sourceName, FIELD_LIMITS.lootSourceMax),
        recipientCharacter: clampString(payload.recipientCharacter, FIELD_LIMITS.characterNameMax),
        recipientOwner: clampString(payload.recipientOwner, FIELD_LIMITS.displayNameMax),
        ruleMethod: payload.ruleMethod,
        notes: clampString(payload.notes, FIELD_LIMITS.lootNotesMax),
        awardedDate: clampString(payload.awardedDate, 20),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteLootRecord = async (lootId: string) => {
    const path = `loot/${lootId}`;
    try {
      await deleteDoc(doc(db, 'loot', lootId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const syncBlizzardCharacters = useCallback(
    async (
      syncedList: SyncedCharacterPayload[],
      battleTag: string | null
    ): Promise<{ updated: number; created: number }> => {
      if (!user) return { updated: 0, created: 0 };

      if (battleTag && (!currentMember || !currentMember.battleTag)) {
        try {
          await updateDoc(doc(db, 'members', user.uid), {
            battleTag: clampString(battleTag, FIELD_LIMITS.battleTagMax),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // non-blocking
        }
      }

      const mine = characters.filter((c) => c.ownerId === user.uid);
      let updated = 0;
      let created = 0;

      for (const item of syncedList) {
        const cleanFullName = item.name.trim().replace(/\s+/g, ' ');
        const nameLower = cleanFullName.toLowerCase();
        const firstWord = nameLower.split(' ')[0];
        const existing =
          mine.find((c) => c.name.trim().toLowerCase() === nameLower) ||
          mine.find(
            (c) =>
              !c.name.trim().includes(' ') &&
              c.name.trim().toLowerCase() === firstWord &&
              c.wowClass === item.wowClass
          );

        const hasApiProfs = item.professions.length > 0;
        const p1 = item.professions[0];
        const p2 = item.professions[1];

        if (existing) {
          const path = `characters/${existing.id}`;
          const nextName = clampString(item.name, FIELD_LIMITS.characterNameMax);
          const nextLevel = clampInt(item.level, 1, 60);
          const nextItemLevel =
            item.itemLevel > 0 ? clampInt(item.itemLevel, 0, 100) : existing.itemLevel;
          try {
            await updateDoc(doc(db, 'characters', existing.id), {
              ownerName: currentUserName,
              name: nextName,
              realm: clampString(item.realm || 'Forever', FIELD_LIMITS.realmMax) || 'Forever',
              faction: item.faction,
              race: clampString(item.race, FIELD_LIMITS.raceMax),
              wowClass: item.wowClass,
              level: nextLevel,
              itemLevel: nextItemLevel,
              prof1Name: hasApiProfs
                ? clampString(p1?.name || '', FIELD_LIMITS.profNameMax)
                : existing.prof1Name,
              prof1Skill: hasApiProfs
                ? clampInt(p1?.skill || 0, 0, 300)
                : existing.prof1Skill,
              prof2Name: hasApiProfs
                ? clampString(p2?.name || '', FIELD_LIMITS.profNameMax)
                : existing.prof2Name,
              prof2Skill: hasApiProfs
                ? clampInt(p2?.skill || 0, 0, 300)
                : existing.prof2Skill,
              updatedAt: serverTimestamp(),
            });
            await syncCharacterToOpenSignups(
              existing.id,
              nextName,
              item.wowClass,
              nextLevel,
              nextItemLevel
            );
            updated += 1;
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        } else {
          const ref = doc(collection(db, 'characters'));
          const path = `characters/${ref.id}`;
          try {
            await setDoc(ref, {
              id: ref.id,
              guildId: GUILD_ID,
              ownerId: user.uid,
              ownerName: currentUserName,
              name: clampString(item.name, FIELD_LIMITS.characterNameMax),
              realm: clampString(item.realm || 'Forever', FIELD_LIMITS.realmMax) || 'Forever',
              faction: item.faction,
              race: clampString(item.race, FIELD_LIMITS.raceMax),
              wowClass: item.wowClass,
              level: clampInt(item.level, 1, 60),
              xpPercent: 0,
              itemLevel: clampInt(item.itemLevel, 0, 100),
              primaryRole: CLASS_META[item.wowClass]?.defaultRole || 'DPS',
              secondaryRole: 'None',
              prof1Name: clampString(p1?.name || '', FIELD_LIMITS.profNameMax),
              prof1Skill: p1 ? clampInt(p1.skill, 1, 300) : 0,
              prof2Name: clampString(p2?.name || '', FIELD_LIMITS.profNameMax),
              prof2Skill: p2 ? clampInt(p2.skill, 1, 300) : 0,
              specNotes: item.guildName ? clampString(`<${item.guildName}>`, FIELD_LIMITS.specNotesMax) : '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            created += 1;
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        }
      }

      return { updated, created };
    },
    [user, characters, currentMember, currentUserName, syncCharacterToOpenSignups]
  );

  return {
    user,
    authReady,
    authError,
    membershipStatus,
    isAdmin,
    pendingEmailInvite,
    currentMember,
    currentUserName,
    members,
    characters,
    events,
    signupsByEvent,
    materials,
    lootRecords,
    inviteCodes,
    emailInvites,
    dataLoading,
    signInWithGoogle,
    signOutUser,
    redeemInviteCode,
    redeemEmailInvite,
    createInviteCode,
    toggleInviteCode,
    deleteInviteCode,
    createEmailInvite,
    deleteEmailInvite,
    removeGuildMember,
    updateMemberProfile,
    saveCharacter,
    quickUpdateCharacter,
    deleteCharacter,
    syncBlizzardCharacters,
    saveEvent,
    updateEventStatus,
    deleteEvent,
    upsertSignup,
    withdrawSignup,
    saveMaterial,
    adjustMaterialStock,
    deleteMaterial,
    addLootRecord,
    deleteLootRecord,
  };
}
