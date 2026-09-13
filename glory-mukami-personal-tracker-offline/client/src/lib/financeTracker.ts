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

/** Two decimal places, half-up, applied at every boundary so float noise
 * from summing (0.1 + 0.2) never reaches the screen or the stored value. */
export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formats an amount with exactly two decimals and the user's own currency
 * code (or none). Uses the locale's grouping, never its currency symbol
 * table, so an unknown or empty code is fine. */
export function formatMoney(value: number, currency: string) {
  const number = roundMoney(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const code = currency.trim().toUpperCase();
  return code ? `${code} ${number}` : number;
}

/** Plain-language description of what a period contains. */
export function periodWindowDescription(
  period: CashFlowPeriod,
  reference = new Date()
) {
  const ref = dayStart(reference);
  const fmt = (date: Date) =>
    date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (period === "daily") return `today, ${fmt(ref)}`;
  if (period === "weekly") {
    const start = new Date(ref);
    start.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `Monday ${fmt(start)} to Sunday ${fmt(end)}`;
  }
  return `the calendar month of ${ref.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}

export function cashFlowCsv(entries: CashFlowEntry[], currency: string) {
  const escape = (value: string | number | boolean) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = [
    "date",
    "direction",
    "title",
    "amount",
    "currency",
    "category",
    "recurring",
    "note",
  ];
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map(entry =>
      [
        entry.date,
        entry.direction,
        entry.title,
        roundMoney(entry.amount).toFixed(2),
        currency.trim().toUpperCase(),
        entry.category,
        entry.recurring ? "yes" : "no",
        entry.note,
      ]
        .map(escape)
        .join(",")
    );
  return [header.join(","), ...rows].join("\n");
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
    openingAmount: roundMoney(openingAmount),
    moneyIn: roundMoney(moneyIn),
    moneyOut: roundMoney(moneyOut),
    currentBalance: roundMoney(openingAmount + moneyIn - moneyOut),
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
