import { useEffect, useState } from "react";
import { api } from "../api";
import type { Settlement, User } from "../types";

interface Props {
  groupId: number;
  members: User[];
  onSettle: (data: { fromUserId: number; toUserId: number; amount: number; note?: string }) => Promise<void>;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export default function SettleUpForm({ groupId, members, onSettle }: Props) {
  const [fromUserId, setFromUserId] = useState<number | "">("");
  const [toUserId, setToUserId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState<Settlement[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettlements(groupId).then(setPayments).catch(() => setPayments([]));
  }, [groupId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (fromUserId === "" || toUserId === "") return setError("Choose who paid and who received it.");
    if (fromUserId === toUserId) return setError("Those need to be two different people.");
    if (!numericAmount || numericAmount <= 0) return setError("Enter an amount greater than zero.");

    setSubmitting(true);
    try {
      await onSettle({
        fromUserId: fromUserId as number,
        toUserId: toUserId as number,
        amount: numericAmount,
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      const updated = await api.getSettlements(groupId);
      setPayments(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record that payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <form className="panel" onSubmit={handleSubmit}>
        <h4 className="panel-title">Record a payment</h4>
        {error && <div className="form-error">{error}</div>}
        <div className="form-row">
          <div className="field">
            <label htmlFor="from">Paid by</label>
            <select
              id="from"
              value={fromUserId}
              onChange={(e) => setFromUserId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">Select…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="to">Received by</label>
            <select
              id="to"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">Select…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="settleAmount">Amount</label>
            <input
              id="settleAmount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="field">
            <label htmlFor="note">Note (optional)</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Venmo, cash…" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Recording…" : "Add payment"}
        </button>
      </form>

      <div className="panel">
        <h4 className="panel-title">Payment history</h4>
        {payments.length === 0 ? (
          <p className="empty-note">No payments recorded yet.</p>
        ) : (
          <ul className="simple-list">
            {payments.map((p) => (
              <li key={p.id}>
                <strong>{p.fromUserName}</strong> paid <strong>{p.toUserName}</strong>{" "}
                {formatMoney(p.amount)}
                {p.note ? ` · ${p.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
