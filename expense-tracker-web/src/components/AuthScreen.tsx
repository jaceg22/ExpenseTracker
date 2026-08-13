import { FormEvent, useState } from "react";
import { api, ApiError, setToken } from "../api";
import type { AuthResponse } from "../types";

interface Props {
  onAuthenticated: (auth: AuthResponse) => void;
  inviteContext?: {
    groupName: string;
    invitedByName: string;
  };
}

export default function AuthScreen({ onAuthenticated, inviteContext }: Props) {
  const [mode, setMode] = useState<"login" | "register">(inviteContext ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(name, email, password);
      setToken(auth.token);
      onAuthenticated(auth);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand">
            <span className="brand-mark">$</span>
            Ledger
          </div>
          <p>
            {inviteContext
              ? `Log in or create an account to join ${inviteContext.groupName}.`
              : mode === "login"
                ? "Log in to see who owes who."
                : "Create an account to start a group."}
          </p>
          {inviteContext && (
            <p className="auth-invite-note">
              Invited by <strong>{inviteContext.invitedByName}</strong>
            </p>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button className="btn-text" onClick={() => setMode("register")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="btn-text" onClick={() => setMode("login")}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
