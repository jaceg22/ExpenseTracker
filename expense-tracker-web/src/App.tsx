import { FormEvent, useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, getToken, setToken } from "./api";
import type { AuthResponse, Group } from "./types";
import AuthScreen from "./components/AuthScreen";
import GroupDetail from "./components/GroupDetail";
import JoinPage from "./components/JoinPage";

interface CurrentUser {
  id: number;
  name: string;
  email: string;
}

function HomeApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<import("./types").User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    const [g, u] = await Promise.all([api.getGroups(), api.getAllUsers()]);
    setGroups(g);
    setAllUsers(u);

    const fromJoin = (location.state as { selectedGroupId?: number } | null)?.selectedGroupId;
    if (fromJoin && g.some((group) => group.id === fromJoin)) {
      setSelectedGroupId(fromJoin);
      navigate(".", { replace: true, state: null });
      return;
    }

    setSelectedGroupId((prev) => prev ?? (g.length > 0 ? g[0].id : null));
  }, [location.state, navigate]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }
    (async () => {
      try {
        const stored = localStorage.getItem("et_user");
        if (stored) setCurrentUser(JSON.parse(stored));
        await loadGroups();
      } catch {
        setToken(null);
        setCurrentUser(null);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [loadGroups]);

  function handleAuthenticated(auth: AuthResponse) {
    const user = { id: auth.userId, name: auth.name, email: auth.email };
    setCurrentUser(user);
    localStorage.setItem("et_user", JSON.stringify(user));
    loadGroups();
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem("et_user");
    setCurrentUser(null);
    setGroups([]);
    setSelectedGroupId(null);
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    setGroupError(null);
    if (!newGroupName.trim()) {
      setGroupError("Enter a group name first.");
      return;
    }
    setCreatingGroup(true);
    try {
      const group = await api.createGroup(newGroupName.trim());
      setNewGroupName("");
      await loadGroups();
      setSelectedGroupId(group.id);
    } catch (err) {
      setGroupError(err instanceof ApiError ? err.message : "Couldn't create that group.");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleLeftGroup() {
    const updated = await api.getGroups();
    setGroups(updated);
    setAllUsers(await api.getAllUsers());
    setSelectedGroupId(updated.length > 0 ? updated[0].id : null);
  }

  if (checkingSession) return null;

  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">$</span>
          Ledger
        </div>
        <div className="topbar-user">
          <span>{currentUser.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Groups</h2>
          </div>

          {groups.length === 0 ? (
            <p className="empty-note">
              No groups yet — create one below to start splitting expenses.
            </p>
          ) : (
            <ul className="group-list">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    className={`group-list-item ${g.id === selectedGroupId ? "active" : ""}`}
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleCreateGroup} style={{ marginTop: 20 }}>
            {groupError && <div className="form-error" style={{ marginBottom: 10 }}>{groupError}</div>}
            <div className="field">
              <label htmlFor="newGroup">New group</label>
              <input
                id="newGroup"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Roommates, ski trip…"
              />
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={creatingGroup} style={{ width: "100%" }}>
              {creatingGroup ? "Creating…" : "Create group"}
            </button>
          </form>
        </aside>

        <main className="main">
          {selectedGroupId ? (
            <GroupDetail
              groupId={selectedGroupId}
              currentUserId={currentUser.id}
              allUsers={allUsers}
              onGroupChanged={loadGroups}
              onLeftGroup={handleLeftGroup}
            />
          ) : (
            <div className="main-empty">Create a group to get started.</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/*" element={<HomeApp />} />
      </Routes>
    </BrowserRouter>
  );
}
