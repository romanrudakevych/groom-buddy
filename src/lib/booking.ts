/**
 * Quick booking: compact slot search. Slots are offered only at the edges of
 * free gaps (day start, right after a visit, or flush before the next visit)
 * so the groomer's day stays tightly packed with no small idle holes.
 */
export const DAY_START = 9 * 60;
export const DAY_END = 20 * 60;
export const STEP = 30;

export type BusyAppt = {
  groomer_id: string;
  date: string;
  time: string;
  status: string;
  planned_duration: number;
  actual_duration: number | null;
};

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
export const fromMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function busyIntervals(appts: BusyAppt[], groomerId: string, date: string) {
  return appts
    .filter((a) => a.groomer_id === groomerId && a.date === date && a.status !== "Zrušeno")
    .map((a) => {
      const s = toMin(a.time);
      const d = (a.status === "Dokončeno" ? a.actual_duration : null) ?? a.planned_duration;
      return [s, s + Math.max(d || 0, STEP)] as [number, number];
    })
    .sort((x, y) => x[0] - y[0]);
}

/** Compact free start times (HH:MM) for a visit of `duration` minutes. */
export function compactSlots(busy: [number, number][], duration: number, notBefore = 0) {
  const gaps: [number, number, boolean][] = []; // [from, to, toIsBooking]
  let cur = DAY_START;
  for (const [s, e] of busy) {
    if (s > cur) gaps.push([cur, s, true]);
    cur = Math.max(cur, e);
  }
  if (cur < DAY_END) gaps.push([cur, DAY_END, false]);
  const out = new Set<number>();
  for (const [from0, to, flush] of gaps) {
    const from = Math.ceil(Math.max(from0, notBefore) / STEP) * STEP;
    if (to - from < duration) continue;
    out.add(from);
    if (flush) {
      const late = Math.floor((to - duration) / STEP) * STEP;
      if (late > from) out.add(late);
    }
  }
  return [...out].sort((a, b) => a - b).map(fromMin);
}

/** Every 30-min start that fits; `best` marks compact (gap-edge) starts. */
export function allSlots(busy: [number, number][], duration: number, notBefore = 0) {
  const best = new Set(compactSlots(busy, duration, notBefore));
  const out: { time: string; best: boolean }[] = [];
  const first = Math.ceil(Math.max(DAY_START, notBefore) / STEP) * STEP;
  for (let s = first; s + duration <= DAY_END; s += STEP) {
    if (busy.some(([b, e]) => s < e && s + duration > b)) continue;
    const t = fromMin(s);
    out.push({ time: t, best: best.has(t) });
  }
  return out;
}

export type DurationSource = { duration: number; serviceIds: string[]; fromDate: string | null };

/** Length of the dog's last completed visit (actual if recorded), else fallback. */
export function previousDuration(
  appts: (BusyAppt & { dog_id: string; serviceIds: string[] })[],
  dogId: string,
  fallback: { duration: number; serviceIds: string[] },
): DurationSource {
  const last = appts
    .filter((a) => a.dog_id === dogId && a.status === "Dokončeno")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))[0];
  if (!last) return { ...fallback, fromDate: null };
  return {
    duration: last.actual_duration || last.planned_duration || fallback.duration,
    serviceIds: last.serviceIds.length ? last.serviceIds : fallback.serviceIds,
    fromDate: last.date,
  };
}

export const periodOf = (t: string) => {
  const m = toMin(t);
  return m < 12 * 60 ? "morning" : m < 16 * 60 ? "afternoon" : "evening";
};
