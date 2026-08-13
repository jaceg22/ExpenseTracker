import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import type { InviteLink, User } from "../types";

interface Props {
  groupId: number;
  groupName: string;
  allUsers: User[];
  currentMemberIds: Set<number>;
  onAdd: (userId: number) => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function MembersPanel({
  groupId,
  groupName,
  allUsers,
  currentMemberIds,
  onAdd,
  onLeave,
}: Props) {
  const candidates = allUsers.filter((u) => !currentMemberIds.has(u.id));
  const [selected, setSelected] = useState<number | "">("");
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInvitedEmail, setLastInvitedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getInviteLink(groupId).then(setInviteLink).catch(() => setInviteLink(null));
  }, [groupId]);

  function fullInviteUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(fullInviteUrl(inviteLink.invitePath));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (selected === "") return;
    setSubmittingMember(true);
    setError(null);
    try {
      await onAdd(selected as number);
      setSelected("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that person.");
    } finally {
      setSubmittingMember(false);
    }
  }

  async function handleEmailInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmittingInvite(true);
    setError(null);
    try {
      const invite = await api.inviteByEmail(groupId, inviteEmail.trim());
      setInviteLink({ inviteCode: invite.inviteCode, invitePath: invite.invitePath });
      setLastInvitedEmail(invite.email);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that invite.");
    } finally {
      setSubmittingInvite(false);
    }
  }

  function openEmailDraft() {
    if (!inviteLink) return;
    const url = fullInviteUrl(inviteLink.invitePath);
    const subject = encodeURIComponent(`Join ${groupName} on Ledger`);
    const body = encodeURIComponent(
      `Hey,\n\nJoin our expense group "${groupName}" on Ledger:\n${url}\n\nYou'll need to create an account (or log in) and then you'll be added automatically.`
    );
    window.location.href = `mailto:${lastInvitedEmail || ""}?subject=${subject}&body=${body}`;
  }

  async function handleLeave() {
    if (!confirm(`Leave "${groupName}"? You can rejoin later with an invite link.`)) return;
    setLeaving(true);
    setError(null);
    try {
      await onLeave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave this group.");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="panel stack">
      {error && <div className="form-error">{error}</div>}

      <div>
        <h4 className="panel-title">Invite by link</h4>
        <p className="empty-note" style={{ marginBottom: 12 }}>
          Share this link — anyone with a Ledger account can join the group.
        </p>
        {inviteLink ? (
          <div className="invite-link-row">
            <input readOnly value={fullInviteUrl(inviteLink.invitePath)} />
            <button className="btn btn-ghost btn-sm" type="button" onClick={copyInviteLink}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        ) : (
          <p className="empty-note">Loading invite link…</p>
        )}
      </div>

      <div>
        <h4 className="panel-title">Invite by email</h4>
        <form className="inline-form" onSubmit={handleEmailInvite}>
          <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label htmlFor="inviteEmail">Email address</label>
            <input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@example.com"
            />
          </div>
          <button className="btn btn-ghost" type="submit" disabled={submittingInvite || !inviteEmail.trim()}>
            {submittingInvite ? "Saving…" : "Create invite"}
          </button>
        </form>
        {inviteLink && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={openEmailDraft} style={{ marginTop: 8 }}>
            Open in email app
          </button>
        )}
      </div>

      <div>
        <h4 className="panel-title">Add existing user</h4>
        {candidates.length === 0 ? (
          <p className="empty-note">Every registered user is already in this group.</p>
        ) : (
          <form className="inline-form" onSubmit={handleAddMember}>
            <div className="field" style={{ minWidth: 200, marginBottom: 0 }}>
              <label htmlFor="newMember">Pick someone</label>
              <select
                id="newMember"
                value={selected}
                onChange={(e) => setSelected(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">Select a person…</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-ghost" type="submit" disabled={submittingMember || selected === ""}>
              {submittingMember ? "Adding…" : "Add to group"}
            </button>
          </form>
        )}
      </div>

      <div className="panel-divider">
        <button className="btn btn-ghost btn-sm danger-text" type="button" onClick={handleLeave} disabled={leaving}>
          {leaving ? "Leaving…" : "Leave group"}
        </button>
      </div>
    </div>
  );
}