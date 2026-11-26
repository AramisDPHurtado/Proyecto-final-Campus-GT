import { DateTime } from "luxon";
import { badRequest } from "./errors.js";

export const BUSINESS_ZONE = "America/Argentina/Buenos_Aires";

export interface Slot {
  startsAt: string;
  endsAt: string;
  operatingDate: string;
  label: string;
}

function strictDate(date: string): DateTime {
  const parsed = DateTime.fromISO(date, { zone: BUSINESS_ZONE });
  if (!parsed.isValid || parsed.toFormat("yyyy-MM-dd") !== date) {
    throw badRequest("La fecha debe tener el formato AAAA-MM-DD.", "INVALID_DATE");
  }
  return parsed.startOf("day");
}

function closeHourForOperatingDay(day: DateTime): number | null {
  if (day.weekday >= 2 && day.weekday <= 5) return 1;
  if (day.weekday === 6 || day.weekday === 7) return 3;
  return null;
}

function operatingDateForLocalStart(start: DateTime): string {
  return (start.hour < 13 ? start.minus({ days: 1 }) : start).toISODate() ?? "";
}

export function parseStart(value: string): DateTime {
  const parsed = DateTime.fromISO(value, { setZone: true }).setZone(BUSINESS_ZONE);
  if (!parsed.isValid || parsed.minute !== 0 || parsed.second !== 0 || parsed.millisecond !== 0) {
    throw badRequest("La tanda debe comenzar en una hora en punto.", "INVALID_START");
  }
  return parsed;
}

export function slotsForDate(date: string, now: DateTime<boolean> = DateTime.now().setZone(BUSINESS_ZONE)): Slot[] {
  const selected = strictDate(date);
  const candidates: DateTime[] = [];

  // The early hours belong to the operating day that opened the previous afternoon.
  const previousDay = selected.minus({ days: 1 });
  const previousClose = closeHourForOperatingDay(previousDay);
  if (previousClose !== null) {
    for (let hour = 0; hour < previousClose; hour += 1) {
      candidates.push(selected.set({ hour, minute: 0, second: 0, millisecond: 0 }));
    }
  }

  // The selected calendar date starts a new operating day at 13:00.
  if (closeHourForOperatingDay(selected) !== null) {
    for (let hour = 13; hour < 24; hour += 1) {
      candidates.push(selected.set({ hour, minute: 0, second: 0, millisecond: 0 }));
    }
  }

  return candidates
    .filter((start) => start.toMillis() > now.toMillis())
    .map((start) => ({
      startsAt: start.toUTC().toISO() ?? "",
      endsAt: start.plus({ hours: 1 }).toUTC().toISO() ?? "",
      operatingDate: operatingDateForLocalStart(start),
      label: start.toFormat("HH:mm")
    }));
}

export function validateFutureBusinessSlot(
  value: string,
  now: DateTime<boolean> = DateTime.now().setZone(BUSINESS_ZONE)
): Slot {
  const start = parseStart(value);
  if (start.toMillis() <= now.toMillis()) {
    throw badRequest("Elegí una tanda futura.", "START_IN_PAST");
  }
  const date = start.toISODate() ?? "";
  const slot = slotsForDate(date, now).find((candidate) => candidate.startsAt === start.toUTC().toISO());
  if (!slot) {
    throw badRequest("Ese horario está fuera del calendario del karting.", "OUTSIDE_OPENING_HOURS");
  }
  return slot;
}
