import { now } from "@/lib/now";

const SG_YEAR_MONTH = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Singapore",
  year: "numeric",
  month: "2-digit",
});

// The billing month key ("YYYY-MM") for an instant, in Asia/Singapore.
export function monthKeyOf(date: Date): string {
  const parts = SG_YEAR_MONTH.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

export function currentMonth(): string {
  return monthKeyOf(now());
}
