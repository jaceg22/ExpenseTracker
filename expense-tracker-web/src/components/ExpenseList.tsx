import type { Expense } from "../types";

interface Props {
  expenses: Expense[];
  onDelete: (expenseId: number) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return <p className="empty-note">No expenses logged yet. Add the first one below.</p>;
  }

  return (
    <div>
      {expenses.map((e) => (
        <div className="expense-card" key={e.id}>
          <div className="expense-main">
            <span className="expense-desc">{e.description}</span>
            <span className="expense-meta">
              Paid by {e.paidByName} · split {e.participants.length} way
              {e.participants.length === 1 ? "" : "s"} · {formatDate(e.date)}
            </span>
          </div>
          <div className="expense-right">
            {e.category && <span className="category-pill">{e.category}</span>}
            <span className="expense-amount">
              ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button className="icon-btn" onClick={() => onDelete(e.id)} title="Delete expense" aria-label="Delete expense">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
