export function formatQuoteDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatQuoteTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export function formatQuoteDateTime(date: Date | string): {
  date: string;
  time: string;
} {
  return {
    date: formatQuoteDate(date),
    time: formatQuoteTime(date),
  };
}
