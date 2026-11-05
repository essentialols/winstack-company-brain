/**
 * Delivery-slot arithmetic for brains, done with Intl so no timezone library
 * is needed. A "slot" is `deliveryHour:00` local time in `timezone` on one of
 * the brain's delivery weekdays.
 */

export interface BrainSchedule {
  readonly frequency: 'ONCE' | 'TWICE';
  readonly deliveryDays: readonly number[];
  readonly deliveryHour: number;
  readonly timezone: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const isValidTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const safeTimezone = (timezone: string): string =>
  isValidTimezone(timezone) ? timezone : 'UTC';

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedParts = (date: Date, timezone: string): ZonedParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

/** Offset of `timezone` from UTC at `date`, in ms (positive east of UTC). */
const timezoneOffsetMs = (date: Date, timezone: string): number => {
  const p = zonedParts(date, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

/** Convert a local wall-clock time in `timezone` to a UTC Date. */
const zonedTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string,
): Date => {
  const guess = Date.UTC(year, month - 1, day, hour);
  const firstOffset = timezoneOffsetMs(new Date(guess), timezone);
  const candidate = guess - firstOffset;
  // Re-check at the candidate instant so a DST switch between guess and
  // candidate does not leave us an hour off.
  const secondOffset = timezoneOffsetMs(new Date(candidate), timezone);
  return new Date(guess - secondOffset);
};

const activeDays = (schedule: BrainSchedule): number[] => {
  const days = [...new Set(schedule.deliveryDays)].filter((d) => d >= 0 && d <= 6);
  if (days.length === 0) {
    return [];
  }
  return schedule.frequency === 'ONCE' ? [days[0]] : days;
};

/** Slot instants on the local days `fromOffset..toOffset` around `now`. */
const slotsAround = (
  schedule: BrainSchedule,
  now: Date,
  fromOffset: number,
  toOffset: number,
): Date[] => {
  const timezone = safeTimezone(schedule.timezone);
  const days = activeDays(schedule);
  if (days.length === 0) {
    return [];
  }

  const today = zonedParts(now, timezone);
  const todayUtcMidnight = Date.UTC(today.year, today.month - 1, today.day);
  const slots: Date[] = [];

  for (let offset = fromOffset; offset <= toOffset; offset++) {
    // Calendar arithmetic on a date-only value; UTC avoids DST in the step.
    const local = new Date(todayUtcMidnight + offset * DAY_MS);
    if (!days.includes(local.getUTCDay())) {
      continue;
    }
    slots.push(
      zonedTimeToUtc(
        local.getUTCFullYear(),
        local.getUTCMonth() + 1,
        local.getUTCDate(),
        schedule.deliveryHour,
        timezone,
      ),
    );
  }

  return slots;
};

/** Most recent slot at or before `now`, or null when the brain has no days. */
export const previousSlot = (schedule: BrainSchedule, now: Date): Date | null => {
  const slots = slotsAround(schedule, now, -8, 0).filter((s) => s.getTime() <= now.getTime());
  return slots.length > 0 ? slots[slots.length - 1] : null;
};

/** First slot strictly after `now`, or null when the brain has no days. */
export const nextSlot = (schedule: BrainSchedule, now: Date): Date | null => {
  const slots = slotsAround(schedule, now, 0, 8).filter((s) => s.getTime() > now.getTime());
  return slots.length > 0 ? slots[0] : null;
};
