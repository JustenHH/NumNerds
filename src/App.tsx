import React, { useState } from 'react';
import {
  Calendar,
  Home,
  KeyRound,
  LogOut,
  Package,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { CharacterModal } from './components/CharacterModal';
import { CharactersView } from './components/CharactersView';
import { DungeonsView } from './components/DungeonsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventModal } from './components/EventModal';
import { GuildAccessModal } from './components/GuildAccessModal';
import { InviteGate } from './components/InviteGate';
import { LeaderboardView } from './components/LeaderboardView';
import { LedgerView } from './components/LedgerView';
import { NumLockLogo } from './components/NumLockLogo';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OverviewView } from './components/OverviewView';
import { ProfileModal } from './components/ProfileModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SignupModal } from './components/SignupModal';
import { useBlizzardSync } from './hooks/useBlizzardSync';
import { useGuildData } from './hooks/useGuildData';
import { DungeonEvent, WowCharacter } from './types/wow';

type ActiveTab = 'overview' | 'characters' | 'leaderboard' | 'dungeons' | 'ledger';

const NAV_ITEMS: { id: ActiveTab; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', mobileLabel: 'Home', icon: Home },
  { id: 'characters', label: 'Characters', mobileLabel: 'Roster', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', mobileLabel: 'Ranks', icon: Trophy },
  { id: 'dungeons', label: 'Dungeon Runs', mobileLabel: 'Dungeons', icon: Calendar },
  { id: 'ledger', label: 'Guild Ledger', mobileLabel: 'Ledger', icon: Package },
];

function GuildApp() {
  const {
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
  } = useGuildData();

  const blizzardSync = useBlizzardSync({
    user: membershipStatus === 'admitted' ? user : null,
    autoSyncReady: membershipStatus === 'admitted' && !dataLoading,
    onApplySyncedCharacters: syncBlizzardCharacters,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Modal States
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<WowCharacter | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DungeonEvent | null>(null);
  const [signupEvent, setSignupEvent] = useState<DungeonEvent | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#d4a843] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-slate-400">Loading Numlock Nerds...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate onSignIn={signInWithGoogle} authError={authError} />;
  }

  if (membershipStatus === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#d4a843] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-slate-400">Verifying guild invitation...</p>
        </div>
      </div>
    );
  }

  if (membershipStatus === 'invite_required') {
    return (
      <InviteGate
        userEmail={user.email || 'Unknown Google account'}
        defaultDisplayName={currentUserName}
        pendingEmailInvite={pendingEmailInvite}
        onRedeemCode={redeemInviteCode}
        onRedeemEmailInvite={redeemEmailInvite}
        onSignOut={signOutUser}
      />
    );
  }

  const myCharacters = characters.filter((c) => c.ownerId === user.uid);
  const activeSignupList = signupEvent ? signupsByEvent[signupEvent.id] || [] : [];
  const existingSignupForModal = activeSignupList.find((s) => s.userId === user.uid) || null;

  const openNewCharacter = () => {
    setEditingChar(null);
    setCharModalOpen(true);
  };

  const openEditCharacter = (char: WowCharacter) => {
    setEditingChar(char);
    setCharModalOpen(true);
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setEventModalOpen(true);
  };

  const openEditEvent = (ev: DungeonEvent) => {
    setEditingEvent(ev);
    setEventModalOpen(true);
  };

  const handleQuickLevelChange = async (char: WowCharacter, delta: number) => {
    const nextLevel = Math.min(60, Math.max(1, char.level + delta));
    await quickUpdateCharacter(char, { level: nextLevel, xpPercent: 0 });
  };

  const activeNavTitle = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Overview';

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex">
      {/* Desktop Sidebar (240px) */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/90 bg-[#0d1118]">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80">
          <NumLockLogo className="h-9 w-9 shrink-0" />
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap truncate">
            Numlock Nerds
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[42px] flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-[#d4a843]/15 text-[#f3d999] border border-[#d4a843]/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#d4a843]' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-4 space-y-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAccessModalOpen(true)}
              className="w-full min-h-[40px] flex items-center justify-center gap-2 rounded-xl border border-[#d4a843]/35 bg-[#d4a843]/10 px-3 py-2 text-xs font-semibold text-[#f3d999] hover:bg-[#d4a843]/20 transition whitespace-nowrap"
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span>Invites &amp; Access</span>
            </button>
          )}

          <PWAInstallButton />

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-800/60 transition"
              title="Edit guildmate profile"
            >
              <UserCog className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUserName}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentMember?.battleTag || 'Edit profile'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => void signOutUser()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Compact Sticky Header (Mobile 52px / Desktop 64px) */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 border-b border-slate-800/90 bg-[#0b0e14]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <NumLockLogo className="h-8 w-8 shrink-0 lg:hidden" />
            <h1 className="font-display text-base lg:text-lg font-bold text-white truncate lg:hidden">
              Numlock Nerds
            </h1>
            <span className="hidden lg:inline text-sm font-medium text-slate-300 whitespace-nowrap">
              Numlock Nerds <span className="text-slate-600 mx-2">/</span>{' '}
              <span className="text-white">{activeNavTitle}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="lg:hidden">
              <PWAInstallButton compact />
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAccessModalOpen(true)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4a843]/40 bg-[#d4a843]/10 text-[#f3d999]"
                aria-label="Invites and access"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#121722] text-slate-300"
              aria-label="Profile settings"
            >
              <UserCog className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openNewEvent}
              className="hidden sm:inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-[#d4a843] px-3.5 py-1.5 text-xs font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c] whitespace-nowrap shrink-0"
            >
              Propose Run
            </button>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {dataLoading ? (
            <div className="space-y-4">
              <div className="h-40 rounded-2xl border border-slate-800 bg-[#121722] animate-pulse" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 rounded-2xl border border-slate-800 bg-[#121722] animate-pulse" />
                <div className="h-64 rounded-2xl border border-slate-800 bg-[#121722] animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  currentUserId={user.uid}
                  currentUserName={currentUserName}
                  members={members}
                  characters={characters}
                  events={events}
                  signupsByEvent={signupsByEvent}
                  materials={materials}
                  blizzardConfigured={blizzardSync.status.configured}
                  blizzardConnected={blizzardSync.status.connected}
                  connectingBlizzard={blizzardSync.connecting}
                  syncingBlizzard={blizzardSync.syncing}
                  syncError={blizzardSync.syncError}
                  syncMessage={blizzardSync.syncMessage}
                  onConnectBlizzard={blizzardSync.connectBattleNet}
                  onSyncBlizzard={() => blizzardSync.syncNow()}
                  onNavigate={setActiveTab}
                  onAddCharacter={openNewCharacter}
                  onEditCharacter={openEditCharacter}
                  onDeleteCharacter={deleteCharacter}
                  onCreateEvent={openNewEvent}
                  onOpenSignup={(ev) => setSignupEvent(ev)}
                  onQuickLevelChange={handleQuickLevelChange}
                />
              )}

              {activeTab === 'characters' && (
                <CharactersView
                  currentUserId={user.uid}
                  isAdmin={isAdmin}
                  characters={characters}
                  members={members}
                  blizzardRegion={blizzardSync.region}
                  onChangeRegion={blizzardSync.setRegion}
                  blizzardConfigured={blizzardSync.status.configured}
                  blizzardConnected={blizzardSync.status.connected}
                  blizzardBattleTag={blizzardSync.status.battleTag}
                  blizzardCallbackUrl={blizzardSync.status.callbackUrl}
                  connectingBlizzard={blizzardSync.connecting}
                  syncingBlizzard={blizzardSync.syncing}
                  syncError={blizzardSync.syncError}
                  syncMessage={blizzardSync.syncMessage}
                  onConnectBlizzard={blizzardSync.connectBattleNet}
                  onSyncBlizzard={() => blizzardSync.syncNow()}
                  onDisconnectBlizzard={blizzardSync.disconnectBattleNet}
                  onAddCharacter={openNewCharacter}
                  onEditCharacter={openEditCharacter}
                  onDeleteCharacter={deleteCharacter}
                />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardView currentUserId={user.uid} characters={characters} />
              )}

              {activeTab === 'dungeons' && (
                <DungeonsView
                  currentUserId={user.uid}
                  characters={characters}
                  events={events}
                  signupsByEvent={signupsByEvent}
                  onCreateEvent={openNewEvent}
                  onEditEvent={openEditEvent}
                  onUpdateStatus={updateEventStatus}
                  onDeleteEvent={deleteEvent}
                  onOpenSignup={(ev) => setSignupEvent(ev)}
                  onWithdrawSignup={withdrawSignup}
                />
              )}

              {activeTab === 'ledger' && (
                <LedgerView
                  currentUserId={user.uid}
                  currentUserName={currentUserName}
                  materials={materials}
                  lootRecords={lootRecords}
                  onSaveMaterial={saveMaterial}
                  onAdjustStock={adjustMaterialStock}
                  onDeleteMaterial={deleteMaterial}
                  onAddLoot={addLootRecord}
                  onDeleteLoot={deleteLootRecord}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-[#0d1118]/95 backdrop-blur-md lg:hidden pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 transition ${
                  active ? 'text-[#d4a843]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium tracking-tight">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {charModalOpen && (
        <CharacterModal
          existing={editingChar}
          blizzardRegion={blizzardSync.region}
          onChangeRegion={blizzardSync.setRegion}
          blizzardConfigured={blizzardSync.status.configured}
          blizzardConnected={blizzardSync.status.connected}
          blizzardBattleTag={blizzardSync.status.battleTag}
          connectingBlizzard={blizzardSync.connecting}
          syncingBlizzard={blizzardSync.syncing}
          syncError={blizzardSync.syncError}
          syncMessage={blizzardSync.syncMessage}
          onConnectBlizzard={blizzardSync.connectBattleNet}
          onSyncBlizzard={() => blizzardSync.syncNow()}
          onClose={() => setCharModalOpen(false)}
          onSave={saveCharacter}
          onDelete={deleteCharacter}
        />
      )}

      {eventModalOpen && (
        <EventModal
          existing={editingEvent}
          onClose={() => setEventModalOpen(false)}
          onSave={saveEvent}
        />
      )}

      {signupEvent && (
        <SignupModal
          event={signupEvent}
          myCharacters={myCharacters}
          existingSignup={existingSignupForModal}
          onClose={() => setSignupEvent(null)}
          onCreateCharacterFirst={() => {
            setSignupEvent(null);
            openNewCharacter();
          }}
          onSubmit={upsertSignup}
          onWithdraw={withdrawSignup}
        />
      )}

      {profileModalOpen && (
        <ProfileModal
          member={currentMember}
          fallbackName={currentUserName}
          onClose={() => setProfileModalOpen(false)}
          onSave={updateMemberProfile}
        />
      )}

      {accessModalOpen && isAdmin && (
        <GuildAccessModal
          currentUserId={user.uid}
          members={members}
          inviteCodes={inviteCodes}
          emailInvites={emailInvites}
          onCreateInviteCode={createInviteCode}
          onToggleInviteCode={toggleInviteCode}
          onDeleteInviteCode={deleteInviteCode}
          onCreateEmailInvite={createEmailInvite}
          onDeleteEmailInvite={deleteEmailInvite}
          onRemoveMember={removeGuildMember}
          onClose={() => setAccessModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GuildApp />
      <OfflineIndicator />
    </ErrorBoundary>
  );
}
