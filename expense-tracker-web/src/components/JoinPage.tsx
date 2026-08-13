import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, getToken } from "../api";
import AuthScreen from "./AuthScreen";
import type { AuthResponse, InvitePreview } from "../types";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Missing invite code.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const info = await api.previewInvite(code);
        setPreview(info);
        if (getToken()) setShowJoinModal(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "This invite link is not valid.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  async function handleJoin() {
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      const group = await api.joinGroup(code);
      navigate("/", { replace: true, state: { selectedGroupId: group.id } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't join that group.");
      setJoining(false);
    }
  }

  function handleAuthenticated(auth: AuthResponse) {
    localStorage.setItem(
      "et_user",
      JSON.stringify({ id: auth.userId, name: auth.name, email: auth.email })
    );
    setLoggedIn(true);
    setShowJoinModal(true);
  }

  function handleDecline() {
    navigate("/", { replace: true });
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <p className="spinner-text">Checking invite…</p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="form-error">{error}</div>
          <Link className="btn btn-ghost" to="/" style={{ width: "100%", textAlign: "center", marginTop: 12 }}>
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        inviteContext={
          preview
            ? { groupName: preview.groupName, invitedByName: preview.invitedByName }
            : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="auth-screen">
        <p className="spinner-text">Loading…</p>
      </div>

      {showJoinModal && preview && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
          <div className="modal-card">
            <h2 id="join-modal-title" className="modal-title">
              Join {preview.groupName}?
            </h2>
            <p className="modal-body">
              <strong>{preview.invitedByName}</strong> invited you to join{" "}
              <strong>{preview.groupName}</strong>.
              {preview.memberCount > 0 && (
                <>
                  {" "}
                  ({preview.memberCount} {preview.memberCount === 1 ? "member" : "members"} already in the
                  group.)
                </>
              )}
            </p>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={handleDecline} disabled={joining}>
                Not now
              </button>
              <button className="btn btn-primary" type="button" onClick={handleJoin} disabled={joining}>
                {joining ? "Joining…" : "Join group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
