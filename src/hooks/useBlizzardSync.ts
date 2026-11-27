import { useCallback, useEffect, useRef, useState } from 'react';
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
  autoSyncReady: boolean;
  onApplySyncedCharacters: (
    characters: SyncedCharacterPayload[],
    battleTag: string | null
  ) => Promise<{ updated: number; created: number }>;
}

export function useBlizzardSync({
  user,
  autoSyncReady,
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
  const autoSyncedUidRef = useRef<string | null>(null);
  const popupPollRef = useRef<number | null>(null);

  const clearPopupPoll = useCallback(() => {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
  }, []);

  useEffect(() => clearPopupPoll, [clearPopupPoll]);

  const fetchWithAuth = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error('Sign in required.');
      const token = await user.getIdToken();
      const headers: Record<string, string> = {
        ...((init?.headers as Record<string, string>) || {}),
        Authorization: `Bearer ${token}`,
      };
      if (init?.body) {
        headers['Content-Type'] = 'application/json';
      }
      return fetch(url, {
        ...init,
        credentials: 'include',
        headers,
      });
    },
    [user]
  );

  const refreshStatus = useCallback(async () => {
    if (!user || !user.emailVerified) return;
    setStatusLoading(true);
    try {
      const resp = await fetchWithAuth(
        `/api/blizzard/status?origin=${encodeURIComponent(window.location.origin)}`
      );
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
    if (!user) {
      autoSyncedUidRef.current = null;
      return;
    }
    void refreshStatus();
  }, [user, refreshStatus]);

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
          diagnostic?: string;
        };
        if (!resp.ok) {
          throw new Error(data.error || 'Failed to sync characters from Battle.net.');
        }

        const list = data.characters || [];
        if (list.length === 0) {
          setSyncMessage(
            data.diagnostic ||
              `Connected to Battle.net (${activeRegion.toUpperCase()}), but no WoW: Forever characters were returned. Characters typically appear after reaching level 10 and logging out of the game.`
          );
          await refreshStatus();
          return;
        }

        const { updated, created } = await onApplySyncedCharacters(
          list,
          data.battleTag || null
        );
        setSyncMessage(
          `Synced ${list.length} WoW: Forever character${list.length === 1 ? '' : 's'} (${activeRegion.toUpperCase()}): ${updated} updated, ${created} added.`
        );
        await refreshStatus();
      } catch (err) {
        setSyncError(
          err instanceof Error ? err.message : 'Battle.net character sync failed.'
        );
        await refreshStatus();
      } finally {
        setSyncing(false);
      }
    },
    [user, region, fetchWithAuth, onApplySyncedCharacters, refreshStatus]
  );

  useEffect(() => {
    if (
      !user ||
      !autoSyncReady ||
      !status.connected ||
      syncing ||
      autoSyncedUidRef.current === user.uid
    ) {
      return;
    }
    autoSyncedUidRef.current = user.uid;
    void syncNow(status.region || region);
  }, [user, autoSyncReady, status.connected, status.region, syncing, region, syncNow]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        origin !== window.location.origin &&
        !origin.endsWith('.run.app') &&
        !origin.endsWith('.ai.studio') &&
        !origin.includes('localhost')
      ) {
        return;
      }

      if (event.data?.type === 'BLIZZARD_AUTH_SUCCESS') {
        clearPopupPoll();
        setConnecting(false);
        const nextRegion = (event.data?.region as BlizzardRegion) || region;
        setRegion(nextRegion);
        void syncNow(nextRegion);
      } else if (event.data?.type === 'BLIZZARD_AUTH_ERROR') {
        clearPopupPoll();
        setConnecting(false);
        const detail = typeof event.data?.error === 'string' ? event.data.error.trim() : '';
        setSyncError(
          detail
            ? `Battle.net authorization failed: ${detail}`
            : 'Battle.net authorization was cancelled or declined.'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [region, syncNow, clearPopupPoll]);

  const connectBattleNet = async () => {
    if (!user) return;
    clearPopupPoll();
    setConnecting(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const resp = await fetchWithAuth(
        `/api/blizzard/auth-url?region=${encodeURIComponent(region)}&origin=${encodeURIComponent(window.location.origin)}`
      );
      const data = (await resp.json()) as {
        url?: string;
        error?: string;
        callbackUrl?: string;
      };
      if (!resp.ok || !data.url) {
        throw new Error(data.error || 'Could not start Battle.net OAuth.');
      }
      const usedCallbackUrl =
        data.callbackUrl || `${window.location.origin}/auth/blizzard/callback`;
      setStatus((prev) => ({ ...prev, callbackUrl: usedCallbackUrl }));

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
        return;
      }

      popupPollRef.current = window.setInterval(() => {
        if (popup.closed) {
          clearPopupPoll();
          setConnecting(false);
          setSyncError(
            `Battle.net login window closed before finishing. If Battle.net showed 400, verify this exact Redirect URL is saved on develop.battle.net: ${usedCallbackUrl}`
          );
        }
      }, 450);
    } catch (err) {
      clearPopupPoll();
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
