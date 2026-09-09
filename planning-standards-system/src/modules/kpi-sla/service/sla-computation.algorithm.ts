import { WorkScheduleType } from '../enums';

export interface SlaScheduleConfig {
    work_schedule_type: WorkScheduleType;
    /** Only used when work_schedule_type is CUSTOM. List of working day names, e.g. ["MONDAY", "TUESDAY", ...]. */
    work_schedule_config: string[] | null;
    /** 'HH:mm:ss' or 'HH:mm', 24-hour format, e.g. "08:00:00" */
    work_start_time: string;
    /** 'HH:mm:ss' or 'HH:mm', 24-hour format, e.g. "17:00:00" */
    work_end_time: string;
}

export interface HolidayDate {
    month: number; // 1-12
    day: number;
    year: number | null; // null = recurring every year
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Returns true if `date` is a working day under the given schedule config
 * (PS022 steps 3 & 5 — weekends and CUSTOM off-days are excluded).
 */
function isWorkingDay(date: Date, schedule: SlaScheduleConfig): boolean {
    const dayName = DAY_NAMES[date.getDay()];

    if (schedule.work_schedule_type === WorkScheduleType.WEEKDAYS) {
        return dayName !== 'SATURDAY' && dayName !== 'SUNDAY';
    }
    if (schedule.work_schedule_type === WorkScheduleType.MONDAY_TO_SATURDAY) {
        return dayName !== 'SUNDAY';
    }
    // CUSTOM: explicit allow-list of working day names. Defensive default —
    // if config is missing/malformed, fall back to standard weekdays so the
    // computation never silently treats every day as a working day.
    if (Array.isArray(schedule.work_schedule_config) && schedule.work_schedule_config.length > 0) {
        return schedule.work_schedule_config.includes(dayName);
    }
    return dayName !== 'SATURDAY' && dayName !== 'SUNDAY';
}

/**
 * Returns true if `date` falls on a holiday (PS022 step 4).
 * `year: null` holidays (e.g. fixed annual holidays like Independence Day)
 * recur every year and only need month+day to match.
 */
function isHoliday(date: Date, holidays: HolidayDate[]): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    return holidays.some((h) => {
        if (h.month !== month || h.day !== day) return false;
        return h.year === null || h.year === year;
    });
}

function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
}

/**
 * Computes elapsed *working* time between time_in and time_out, in minutes,
 * respecting:
 *  - weekends / CUSTOM off-days (step 3)
 *  - holidays (step 4)
 *  - configured office working hours (step 5) — time outside the window
 *    does not count, and the algorithm clips into the window at both ends.
 *
 * Walks day-by-day from time_in's date to time_out's date (inclusive),
 * accumulating only the portion of each working day that falls inside the
 * office's working-hour window and within [time_in, time_out].
 */
export function computeWorkingMinutes(
    timeIn: Date,
    timeOut: Date,
    schedule: SlaScheduleConfig,
    holidays: HolidayDate[],
): number {
    if (timeOut <= timeIn) return 0;

    const workStartMin = parseTimeToMinutes(schedule.work_start_time);
    const workEndMin = parseTimeToMinutes(schedule.work_end_time);

    let totalMinutes = 0;

    // Walk one calendar day at a time.
    const cursor = new Date(timeIn);
    cursor.setHours(0, 0, 0, 0);

    const lastDay = new Date(timeOut);
    lastDay.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= lastDay.getTime()) {
        if (isWorkingDay(cursor, schedule) && !isHoliday(cursor, holidays)) {
            // Working-hour window for this calendar day, in absolute Date terms.
            const dayWorkStart = new Date(cursor);
            dayWorkStart.setMinutes(dayWorkStart.getMinutes() + workStartMin);
            const dayWorkEnd = new Date(cursor);
            dayWorkEnd.setMinutes(dayWorkEnd.getMinutes() + workEndMin);

            // Clip to the actual transaction window [timeIn, timeOut] as well.
            const segmentStart = dayWorkStart < timeIn ? timeIn : dayWorkStart;
            const segmentEnd = dayWorkEnd > timeOut ? timeOut : dayWorkEnd;

            if (segmentEnd > segmentStart) {
                totalMinutes += (segmentEnd.getTime() - segmentStart.getTime()) / 60000;
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return totalMinutes;
}

/**
 * Maps a duration in days vs the SLA target into a 1-5 OPCR Timeliness
 * Score, per the office-confirmed formula:
 *   <=80%  -> 5 (Outstanding)
 *   <=99%  -> 4 (Very Satisfactory)
 *   <=100% -> 3 (Satisfactory)
 *   <=130% -> 2 (Unsatisfactory)
 *   >130%  -> 1 (Poor)
 */
export function mapToOpcrScore(percentageUsed: number): number {
    if (percentageUsed <= 80) return 5;
    if (percentageUsed <= 99) return 4;
    if (percentageUsed <= 100) return 3;
    if (percentageUsed <= 130) return 2;
    return 1;
}