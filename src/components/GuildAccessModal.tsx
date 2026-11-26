import React, { useState } from 'react';
import { Check, Copy, Link2, MailPlus, Trash2, UserMinus, X } from 'lucide-react';
import { EmailInvite, FIELD_LIMITS, GuildMember, InviteCode } from '../types/wow';

interface GuildAccessModalProps {
  currentUserId: string;
  members: GuildMember[];
  inviteCodes: InviteCode[];
  emailInvites: EmailInvite[];
  onCreateInviteCode: (note: string, maxUses: number, customCode?: string) => Promise<string>;
  onToggleInviteCode: (code: string, active: boolean) => Promise<void>;
  onDeleteInviteCode: (code: string) => Promise<void>;
  onCreateEmailInvite: (email: string, note: string) => Promise<void>;
  onDeleteEmailInvite: (id: string) => Promise<void>;
  onRemoveMember: (uid: string) => Promise<void>;
  onClose: () => void;
}

export const GuildAccessModal: React.FC<GuildAccessModalProps> = ({
  currentUserId,
  members,
  inviteCodes,
  emailInvites,
  onCreateInviteCode,
  onToggleInviteCode,
  onDeleteInviteCode,
  onCreateEmailInvite,
  onDeleteEmailInvite,
  onRemoveMember,
  onClose,
}) => {
  const [tab, setTab] = useState<'codes' | 'emails' | 'members'>('codes');
  const [codeNote, setCodeNote] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [maxUses, setMaxUses] = useState<number>(5);

  const [inviteEmail, setInviteEmail] = useState('');
  const [emailNote, setEmailNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);

  const handleCopyInviteLink = async (code: string) => {
    const shareUrl = `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setError(`Share this link: ${shareUrl}`);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreateInviteCode(codeNote, maxUses, customCode || undefined);
      setCodeNote('');
      setCustomCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite code.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreateEmailInvite(inviteEmail, emailNote);
      setInviteEmail('');
      setEmailNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email invitation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#121722] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Invites & Guild Access</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Only invited friends or invite-link holders can join Numlock Nerds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close invites modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-[#0b0e14] p-1">
          <button
            type="button"
            onClick={() => {
              setTab('codes');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap ${
              tab === 'codes' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Invite Links ({inviteCodes.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('emails');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap ${
              tab === 'emails' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Invites ({emailInvites.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('members');
              setError(null);
            }}
            className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap ${
              tab === 'members' ? 'bg-[#d4a843] text-[#0b0e14]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Members ({members.length})
          </button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300 break-all">
            {error}
          </p>
        )}

        {tab === 'codes' && (
          <div className="space-y-5">
            <form
              onSubmit={(e) => void handleCreateCode(e)}
              className="rounded-xl border border-slate-800 bg-[#0b0e14]/70 p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.inviteNoteMax}
                    value={codeNote}
                    onChange={(e) => setCodeNote(e.target.value)}
                    placeholder="e.g. Discord squad link"
                    className="w-full min-h-[42px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Custom Code (optional)
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.inviteCodeMax}
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="Auto (NLN-...)"
                    className="font-mono-num w-full min-h-[42px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-xs uppercase text-white placeholder:normal-case placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="font-mono-num w-full min-h-[42px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-xs text-white focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c] disabled:opacity-60 whitespace-nowrap"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Create Invite Code</span>
                </button>
              </div>
            </form>

            {inviteCodes.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No invite codes created yet. Generate one above to share in Discord.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#0b0e14]/50">
                {inviteCodes.map((inv) => {
                  const exhausted = inv.usesCount >= inv.maxUses;
                  return (
                    <div
                      key={inv.code}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono-num font-semibold text-white">
                            {inv.code}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="font-mono-num text-xs text-slate-400">
                            {inv.usesCount}/{inv.maxUses} used
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span
                            className={`text-xs font-medium ${
                              !inv.active
                                ? 'text-slate-500'
                                : exhausted
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {!inv.active ? 'Disabled' : exhausted ? 'Full' : 'Active'}
                          </span>
                        </div>
                        {inv.note && (
                          <p className="mt-0.5 text-xs text-slate-400 truncate">{inv.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleCopyInviteLink(inv.code)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#121722] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
                        >
                          {copiedCode === inv.code ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied Link</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onToggleInviteCode(inv.code, !inv.active)}
                          className="min-h-[36px] rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
                        >
                          {inv.active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteInviteCode(inv.code)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                          aria-label={`Delete invite code ${inv.code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'emails' && (
          <div className="space-y-5">
            <form
              onSubmit={(e) => void handleCreateEmail(e)}
              className="rounded-xl border border-slate-800 bg-[#0b0e14]/70 p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Friend&apos;s Google Email
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={FIELD_LIMITS.emailMax}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@gmail.com"
                    className="w-full min-h-[42px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.inviteNoteMax}
                    value={emailNote}
                    onChange={(e) => setEmailNote(e.target.value)}
                    placeholder="e.g. Main healer"
                    className="w-full min-h-[42px] rounded-xl border border-slate-700/80 bg-[#0b0e14] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#d4a843] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-semibold text-[#0b0e14] hover:bg-[#e5b95c] disabled:opacity-60 whitespace-nowrap"
                >
                  <MailPlus className="h-3.5 w-3.5" />
                  <span>Add Email Invite</span>
                </button>
              </div>
            </form>

            {emailInvites.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No email invitations added yet. Pre-approve a friend&apos;s Google email above so they can join with one click.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#0b0e14]/50">
                {emailInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-white truncate">{inv.email}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span
                          className={`text-xs font-medium ${
                            inv.redeemed
                              ? 'text-emerald-400'
                              : inv.active
                                ? 'text-amber-300'
                                : 'text-slate-500'
                          }`}
                        >
                          {inv.redeemed ? 'Joined' : inv.active ? 'Pending' : 'Inactive'}
                        </span>
                      </div>
                      {inv.note && (
                        <p className="mt-0.5 text-xs text-slate-400 truncate">{inv.note}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void onDeleteEmailInvite(inv.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400 shrink-0"
                      aria-label={`Remove email invite for ${inv.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No members yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#0b0e14]/50">
                {members.map((member) => {
                  const isSelf = member.uid === currentUserId;
                  return (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between gap-3 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-white truncate">
                            {member.displayName}
                          </span>
                          {isSelf && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="text-xs text-[#d4a843]">Admin (You)</span>
                            </>
                          )}
                        </div>
                        {member.battleTag && (
                          <p className="font-mono-num text-xs text-slate-400">
                            {member.battleTag}
                          </p>
                        )}
                      </div>

                      {!isSelf && (
                        confirmRemoveUid === member.uid ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                void onRemoveMember(member.uid);
                                setConfirmRemoveUid(null);
                              }}
                              className="min-h-[34px] rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
                            >
                              Confirm Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveUid(null)}
                              className="min-h-[34px] rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveUid(member.uid)}
                            className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-500/40 hover:text-red-300 shrink-0"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
