// The backend's single source of "now". Honours DEV_NOW (e.g.
// "2026-11-03T09:00:00+08:00") outside production so the dev database can
// behave as if it is already November before the real date arrives. Used by
// currentMonth() and lazy month open.
export function now(): Date {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_NOW) {
    return new Date(process.env.DEV_NOW);
  }
  return new Date();
}
