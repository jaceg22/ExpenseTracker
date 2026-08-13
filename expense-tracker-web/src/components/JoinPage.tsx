import { useEffect, useRef, useState } from "react";
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
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    if (!loggedIn || !preview || !code || autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    handleJoin();
  }, [loggedIn, preview, code]);

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
    } finally {
      setJoining(false);
    }
  }

  function handleAuthenticated(auth: AuthResponse) {
    localStorage.setItem(
      "et_user",
      JSON.stringify({ id: auth.userId, name: auth.name, email: auth.email })
    );
    setLoggedIn(true);
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <p className="spinner-text">Checking invite…</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div>
        {preview && (
          <div className="join-banner">
            You&apos;ve been invited to join <strong>{preview.groupName}</strong>.
          </div>
        )}
        <AuthScreen onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand">
            <span className="brand-mark">$</span>
            Ledger
          </div>
          {preview ? (
            <p>
              Join <strong>{preview.groupName}</strong> ({preview.memberCount}{" "}
              {preview.memberCount === 1 ? "member" : "members"}).
            </p>
          ) : (
            <p>Join this expense group.</p>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        {preview ? (
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleJoin} disabled={joining}>
            {joining ? "Joining…" : `Join ${preview.groupName}`}
          </button>
        ) : (
          <Link className="btn btn-ghost" to="/" style={{ width: "100%", textAlign: "center" }}>
            Back home
          </Link>
        )}
      </div>
    </div>
  );
}
