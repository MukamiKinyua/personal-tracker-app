export type CashFlowPeriod = "daily" | "weekly" | "monthly";
export type CashFlowEntry = {
  id: string;
  title: string;
  amount: number;
  direction: "in" | "out";
  category: string;
  date: string;
  note: string;
  recurring: boolean;
};

function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function periodLabel(period: CashFlowPeriod) {
  return period === "daily"
    ? "Today"
    : period === "weekly"
      ? "This week"
      : "This month";
}

export function entriesForPeriod(
  entries: CashFlowEntry[],
  period: CashFlowPeriod,
  reference = new Date()
): CashFlowEntry[] {
  const ref = dayStart(reference);
  return entries.filter(entry => {
    const date = parseLocalDate(entry.date);
    if (period === "daily") return dayStart(date).getTime() === ref.getTime();
    if (period === "weekly") {
      const start = new Date(ref);
      start.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return date >= start && date < end;
    }
    return (
      date.getFullYear() === ref.getFullYear() &&
      date.getMonth() === ref.getMonth()
    );
  });
}

export function cashFlowSummary(
  openingAmount: number,
  entries: CashFlowEntry[]
) {
  const moneyIn = entries
    .filter(entry => entry.direction === "in")
    .reduce((total, entry) => total + entry.amount, 0);
  const moneyOut = entries
    .filter(entry => entry.direction === "out")
    .reduce((total, entry) => total + entry.amount, 0);
  return {
    openingAmount,
    moneyIn,
    moneyOut,
    currentBalance: openingAmount + moneyIn - moneyOut,
  };
}

export function cashOutByCategory(entries: CashFlowEntry[]) {
  const totals = new Map<string, number>();
  entries
    .filter(entry => entry.direction === "out")
    .forEach(entry =>
      totals.set(
        entry.category,
        (totals.get(entry.category) || 0) + entry.amount
      )
    );
  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function runningBalanceSeries(
  openingAmount: number,
  entries: CashFlowEntry[]
) {
  let balance = openingAmount;
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map(entry => {
      balance += entry.direction === "in" ? entry.amount : -entry.amount;
      return { id: entry.id, date: entry.date, balance };
    });
}
