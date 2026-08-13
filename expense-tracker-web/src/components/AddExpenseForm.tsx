import { FormEvent, useEffect, useState } from "react";
import type { User } from "../types";

interface Props {
  members: User[];
  onSubmit: (data: {
    description: string;
    amount: number;
    paidByUserId: number;
    category?: string;
    participantUserIds?: number[];
  }) => Promise<void>;
}

export default function AddExpenseForm({ members, onSubmit }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidByUserId, setPaidByUserId] = useState<number | "">("");
  const [participantIds, setParticipantIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default: everyone in the group participates.
  useEffect(() => {
    setParticipantIds(new Set(members.map((m) => m.id)));
    if (members.length > 0 && paidByUserId === "") setPaidByUserId(members[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  function toggleParticipant(id: number) {
    setParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (!description.trim()) return setError("Give the expense a description.");
    if (!numericAmount || numericAmount <= 0) return setError("Enter an amount greater than zero.");
    if (paidByUserId === "") return setError("Choose who paid.");
    if (participantIds.size === 0) return setError("At least one participant is required.");

    setSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount: numericAmount,
        paidByUserId: paidByUserId as number,
        category: category.trim() || undefined,
        participantUserIds: Array.from(participantIds),
      });
      setDescription("");
      setAmount("");
      setCategory("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-row">
        <div className="field">
          <label htmlFor="desc">Description</label>
          <input
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, gas, hotel…"
          />
        </div>
        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="field">
          <label htmlFor="category">Category (optional)</label>
          <input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Food, Travel…"
          />
        </div>
        <div className="field">
          <label htmlFor="paidBy">Paid by</label>
          <select
            id="paidBy"
            value={paidByUserId}
            onChange={(e) => setPaidByUserId(Number(e.target.value))}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field" style={{ marginTop: 4 }}>
        <label>Split between</label>
        <div className="checkbox-row">
          {members.map((m) => (
            <label className="checkbox-pill" key={m.id}>
              <input
                type="checkbox"
                checked={participantIds.has(m.id)}
                onChange={() => toggleParticipant(m.id)}
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}
