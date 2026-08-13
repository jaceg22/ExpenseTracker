import type { Balance } from "../types";

interface Props {
  balances: Balance[];
  currentUserId: number;
}

function formatMoney(n: number) {
  return Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BalanceList({ balances, currentUserId }: Props) {
  if (balances.length === 0) {
    return <p className="empty-note">No members yet.</p>;
  }

  return (
    <div className="ledger">
      {balances.map((b) => {
        const status = b.netBalance > 0.004 ? "positive" : b.netBalance < -0.004 ? "negative" : "settled";
        const label = status === "positive" ? "is owed" : status === "negative" ? "owes" : "settled up";
        const displayName = b.userId === currentUserId ? `${b.name} (you)` : b.name;

        return (
          <div className="ledger-row" key={b.userId}>
            <span className="ledger-name">{displayName}</span>
            <div className="ledger-amount-group">
              <span className={`ledger-tag ${status}`}>{label}</span>
              <span className={`ledger-figure ${status}`}>
                {status === "settled" ? "$0.00" : `$${formatMoney(b.netBalance)}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
