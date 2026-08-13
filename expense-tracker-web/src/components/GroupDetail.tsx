import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Balance, Expense, Group, User } from "../types";
import BalanceList from "./BalanceList";
import ExpenseList from "./ExpenseList";
import AddExpenseForm from "./AddExpenseForm";
import MembersPanel from "./MembersPanel";
import SettleUpForm from "./SettleUpForm";

interface Props {
  groupId: number;
  currentUserId: number;
  allUsers: User[];
  onGroupChanged: () => void;
  onLeftGroup: () => void;
}

type Tab = "expenses" | "add" | "members" | "settle";

export default function GroupDetail({
  groupId,
  currentUserId,
  allUsers,
  onGroupChanged,
  onLeftGroup,
}: Props) {
  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("expenses");
  const [toast, setToast] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, b, e] = await Promise.all([
        api.getGroup(groupId),
        api.getBalances(groupId),
        api.getExpenses(groupId),
      ]);
      setGroup(g);
      setBalances(b);
      setExpenses(e);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this group.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }

  async function handleAddExpense(data: Parameters<typeof api.createExpense>[1]) {
    await api.createExpense(groupId, data);
    flash("Expense added");
    await loadAll();
  }

  async function handleDeleteExpense(expenseId: number) {
    await api.deleteExpense(groupId, expenseId);
    flash("Expense removed");
    await loadAll();
  }

  async function handleAddMember(userId: number) {
    await api.addMember(groupId, userId);
    flash("Member added");
    await loadAll();
    onGroupChanged();
  }

  async function handleSettle(data: Parameters<typeof api.createSettlement>[1]) {
    await api.createSettlement(groupId, data);
    flash("Payment recorded");
    await loadAll();
  }

  async function handleLeaveGroup() {
    await api.leaveGroup(groupId);
    flash("You left the group");
    onLeftGroup();
  }

  if (loading && !group) return <p className="spinner-text">Loading group…</p>;
  if (error) return <div className="form-error">{error}</div>;
  if (!group) return null;

  return (
    <div>
      <div className="group-header">
        <div>
          <h1 className="group-title">{group.name}</h1>
          <div className="member-chips">
            {group.members.map((m) => (
              <span className="chip" key={m.id}>
                {m.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Balances</h3>
        </div>
        <BalanceList balances={balances} currentUserId={currentUserId} />
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Activity</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={tab === "expenses" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              onClick={() => setTab("expenses")}
            >
              Expenses
            </button>
            <button
              className={tab === "add" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              onClick={() => setTab("add")}
            >
              Add expense
            </button>
            <button
              className={tab === "settle" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              onClick={() => setTab("settle")}
            >
              Payments
            </button>
            <button
              className={tab === "members" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              onClick={() => setTab("members")}
            >
              Members
            </button>
          </div>
        </div>

        {tab === "expenses" && <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />}
        {tab === "add" && <AddExpenseForm members={group.members} onSubmit={handleAddExpense} />}
        {tab === "settle" && (
          <SettleUpForm groupId={groupId} members={group.members} onSettle={handleSettle} />
        )}
        {tab === "members" && (
          <MembersPanel
            groupId={groupId}
            groupName={group.name}
            allUsers={allUsers}
            currentMemberIds={new Set(group.members.map((m) => m.id))}
            onAdd={handleAddMember}
            onLeave={handleLeaveGroup}
          />
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
