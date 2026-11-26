import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export type BlizzardRegion = 'eu' | 'us' | 'kr' | 'tw';

export interface SyncedCharacterPayload {
  name: string;
  realm: string;
  realmSlug: string;
  faction: 'Alliance' | 'Horde';
  race: string;
  wowClass:
    | 'Warrior'
    | 'Paladin'
    | 'Hunter'
    | 'Rogue'
    | 'Priest'
    | 'Shaman'
    | 'Mage'
    | 'Warlock'
    | 'Druid';
  level: number;
  itemLevel: number;
  professions: Array<{ name: string; skill: number }>;
  guildName: string;
}

interface BlizzardStatusResponse {
  configured: boolean;
  connected: boolean;
  region: BlizzardRegion | null;
  battleTag: string | null;
  callbackUrl: string;
}

interface UseBlizzardSyncOptions {
  user: User | null;
  onApplySyncedCharacters: (
    characters: SyncedCharacterPayload[],
    battleTag: string | null
  ) => Promise<{ updated: number; created: number }>;
}

export function useBlizzardSync({
  user,
  onApplySyncedCharacters,
}: UseBlizzardSyncOptions) {
  const [region, setRegion] = useState<BlizzardRegion>('eu');
  const [status, setStatus] = useState<BlizzardStatusResponse>({
    configured: true,
    connected: false,
    region: null,
    battleTag: null,
    callbackUrl: `${window.location.origin}/auth/blizzard/callback`,
  });
  const [statusLoading, setStatusLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchWithAuth = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error('Sign in required.');
      const token = await user.getIdToken();
      return fetch(url, {
        ...init,
        credentials: 'include',
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    },
    [user]
  );

  const refreshStatus = useCallback(async () => {
    if (!user || !user.emailVerified) return;
    setStatusLoading(true);
    try {
      const resp = await fetchWithAuth('/api/blizzard/status');
      if (resp.ok) {
        const data = (await resp.json()) as BlizzardStatusResponse;
        setStatus(data);
        if (data.region) {
          setRegion(data.region);
        }
      }
    } catch {
      // Ignore transient status fetch issues
    } finally {
      setStatusLoading(false);
    }
  }, [user, fetchWithAuth]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const syncNow = useCallback(
    async (targetRegion?: BlizzardRegion) => {
      if (!user) return;
      const activeRegion = targetRegion || region;
      setSyncing(true);
      setSyncError(null);
      setSyncMessage(null);
      try {
        const resp = await fetchWithAuth('/api/blizzard/sync', {
          method: 'POST',
          body: JSON.stringify({ region: activeRegion }),
        });
        const data = (await resp.json()) as {
          error?: string;
          characters?: SyncedCharacterPayload[];
          battleTag?: string | null;
        };
        if (!resp.ok) {
          throw new Error(data.error || 'Failed to sync characters from Battle.net.');
        }

        const list = data.characters || [];
        if (list.length === 0) {
          setSyncMessage(
            `Connected to Battle.net (${activeRegion.toUpperCase()}), but no Classic Era characters were returned. Make sure you have logged out of your character recently.`
          );
          return;
        }

        const { updated, created } = await onApplySyncedCharacters(
          list,
          data.battleTag || null
        );
        setSyncMessage(
          `Synced ${list.length} Classic Era character${list.length === 1 ? '' : 's'} (${activeRegion.toUpperCase()}): ${updated} updated, ${created} added.`
        );
        await refreshStatus();
      } catch (err) {
        setSyncError(
          err instanceof Error ? err.message : 'Battle.net character sync failed.'
        );
      } finally {
        setSyncing(false);
      }
    },
    [user, region, fetchWithAuth, onApplySyncedCharacters, refreshStatus]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        origin !== window.location.origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost')
      ) {
        return;
      }

      if (event.data?.type === 'BLIZZARD_AUTH_SUCCESS') {
        setConnecting(false);
        const nextRegion = (event.data?.region as BlizzardRegion) || region;
        setRegion(nextRegion);
        void syncNow(nextRegion);
      } else if (event.data?.type === 'BLIZZARD_AUTH_ERROR') {
        setConnecting(false);
        setSyncError('Battle.net authorization was cancelled or declined.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [region, syncNow]);

  const connectBattleNet = async () => {
    if (!user) return;
    setConnecting(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const resp = await fetchWithAuth(
        `/api/blizzard/auth-url?region=${encodeURIComponent(region)}`
      );
      const data = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !data.url) {
        throw new Error(data.error || 'Could not start Battle.net OAuth.');
      }

      const popup = window.open(
        data.url,
        'blizzard_oauth',
        'width=560,height=720,menubar=no,toolbar=no'
      );
      if (!popup) {
        setConnecting(false);
        setSyncError(
          'Popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      }
    } catch (err) {
      setConnecting(false);
      setSyncError(
        err instanceof Error ? err.message : 'Could not connect to Battle.net.'
      );
    }
  };

  const disconnectBattleNet = async () => {
    if (!user) return;
    setSyncError(null);
    setSyncMessage(null);
    try {
      await fetchWithAuth('/api/blizzard/disconnect', { method: 'POST' });
      await refreshStatus();
    } catch {
      // ignore
    }
  };

  const lookupCharacter = async (
    targetRegion: BlizzardRegion,
    realm: string,
    name: string
  ): Promise<SyncedCharacterPayload> => {
    const resp = await fetchWithAuth('/api/blizzard/lookup', {
      method: 'POST',
      body: JSON.stringify({ region: targetRegion, realm, name }),
    });
    const data = (await resp.json()) as {
      character?: SyncedCharacterPayload;
      error?: string;
    };
    if (!resp.ok || !data.character) {
      throw new Error(data.error || 'Character not found on Blizzard API.');
    }
    return data.character;
  };

  return {
    region,
    setRegion,
    status,
    statusLoading,
    connecting,
    syncing,
    syncError,
    syncMessage,
    connectBattleNet,
    syncNow,
    disconnectBattleNet,
    lookupCharacter,
  };
}
