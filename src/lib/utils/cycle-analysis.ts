import { differenceInDays, addDays } from 'date-fns';

export interface CycleInfo {
    averageCycleLength: number;
    lastPeriodStart: Date;
    nextPeriodDate: Date;
    cycleDay: number;
    daysUntilNextPeriod: number;
    currentPhase: string;
    periodStartDates: Date[];
    hasSufficientData: boolean;
}

interface LogEntry {
    date: string;
    flowLevel: string;
    [key: string]: any;
}

/**
 * Parse a date string (YYYY-MM-DD or ISO) into a local Date object.
 */
function parseLocalDate(dateStr: string): Date {
    if (dateStr.includes('T')) {
        return new Date(dateStr);
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/**
 * Format a Date as YYYY-MM-DD string using local time.
 */
function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Detect period start dates from symptom logs.
 * 
 * Logic:
 * 1. Sort all logs by date ascending
 * 2. Build a map of date → flowLevel for quick lookups
 * 3. Walk through dates: a "period start" is a flow day where the previous
 *    calendar day either has no log or has flowLevel === 'none'
 * 4. Adjacent flow days within 7 days are part of the same period
 * 5. Flow days separated by 14+ days from the last flow day = new period
 */
export function detectPeriodStartDates(logs: LogEntry[]): Date[] {
    if (!logs || logs.length === 0) return [];

    // Build date → flowLevel map
    const flowMap = new Map<string, string>();
    for (const log of logs) {
        const key = toDateKey(parseLocalDate(log.date));
        flowMap.set(key, log.flowLevel || 'none');
    }

    // Sort logs by date ascending, deduplicate by date
    const sortedDates = [...new Set(logs.map(l => toDateKey(parseLocalDate(l.date))))].sort();

    const periodStarts: Date[] = [];
    let lastFlowDateKey: string | null = null;

    for (const dateKey of sortedDates) {
        const flow = flowMap.get(dateKey) || 'none';
        const hasFlow = flow !== 'none';

        if (!hasFlow) {
            // No flow today — just continue
            continue;
        }

        // This day has flow — decide if it's a NEW period start or continuation
        if (lastFlowDateKey === null) {
            // First flow day ever recorded — it's a period start
            periodStarts.push(parseLocalDate(dateKey));
        } else {
            // Check gap between this flow day and the last flow day
            const gapDays = differenceInDays(parseLocalDate(dateKey), parseLocalDate(lastFlowDateKey));

            if (gapDays > 7) {
                // More than 7 days since last flow — this is a new period
                periodStarts.push(parseLocalDate(dateKey));
            }
            // If gap <= 7, it's part of the same period — skip
        }

        lastFlowDateKey = dateKey;
    }

    return periodStarts;
}

/**
 * Calculate average cycle length from period start dates.
 * Filters out outliers (<21 or >45 days).
 * Returns null if insufficient data.
 */
export function calculateAverageCycleLength(periodStartDates: Date[]): number | null {
    if (periodStartDates.length < 2) return null;

    const gaps: number[] = [];
    for (let i = 1; i < periodStartDates.length; i++) {
        const gap = differenceInDays(periodStartDates[i], periodStartDates[i - 1]);
        // Filter outliers — typical cycles are 21-45 days
        if (gap >= 21 && gap <= 45) {
            gaps.push(gap);
        }
    }

    if (gaps.length === 0) return null;

    const sum = gaps.reduce((a, b) => a + b, 0);
    return Math.round(sum / gaps.length);
}

/**
 * Determine the cycle phase based on cycle day and cycle length.
 * Uses proportional boundaries instead of hardcoded day numbers.
 */
export function getSmartCyclePhase(cycleDay: number, cycleLength: number): string {
    if (cycleDay < 1) return 'Menstrual';

    const menstrualEnd = Math.round(cycleLength * 0.18);   // ~5 days of 28
    const follicularEnd = Math.round(cycleLength * 0.46);  // ~13 days of 28
    const ovulationEnd = Math.round(cycleLength * 0.54);   // ~15 days of 28

    if (cycleDay <= menstrualEnd) return 'Menstrual';
    if (cycleDay <= follicularEnd) return 'Follicular';
    if (cycleDay <= ovulationEnd) return 'Ovulation';
    if (cycleDay <= cycleLength) return 'Luteal';
    return 'Expected Period';
}

/**
 * Get complete cycle info by analyzing symptom logs.
 * Falls back to profile data if insufficient logs.
 */
export function getCurrentCycleInfo(
    logs: LogEntry[],
    profileLastPeriodStart?: Date | null,
    profileCycleLength?: number
): CycleInfo {
    const periodStartDates = detectPeriodStartDates(logs);
    const computedCycleLength = calculateAverageCycleLength(periodStartDates);
    const hasSufficientData = computedCycleLength !== null;

    // Use computed data if available, otherwise fall back to profile/defaults
    const averageCycleLength = computedCycleLength || profileCycleLength || 28;

    // Most recent period start — prefer detected over profile
    const lastPeriodStart = periodStartDates.length > 0
        ? periodStartDates[periodStartDates.length - 1]
        : (profileLastPeriodStart || new Date());

    // Normalize to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastStart = new Date(lastPeriodStart);
    lastStart.setHours(0, 0, 0, 0);

    // Cycle day (1-based)
    const rawCycleDay = differenceInDays(today, lastStart) + 1;

    // If cycleDay exceeds cycle length, the period is overdue
    // Keep the raw value so dashboard can show "X days late"
    const cycleDay = rawCycleDay;

    // Next expected period date
    const nextPeriodDate = addDays(lastStart, averageCycleLength);

    // Days until next period — can be negative (overdue)
    const daysUntilNextPeriod = differenceInDays(nextPeriodDate, today);

    // Phase — use modular cycle day if way past due (wraps around)
    const phaseDay = cycleDay <= averageCycleLength + 7
        ? cycleDay
        : ((cycleDay - 1) % averageCycleLength) + 1;
    const currentPhase = getSmartCyclePhase(phaseDay, averageCycleLength);

    return {
        averageCycleLength,
        lastPeriodStart: lastStart,
        nextPeriodDate,
        cycleDay,
        daysUntilNextPeriod,
        currentPhase,
        periodStartDates,
        hasSufficientData,
    };
}

/**
 * Calculate logging streak — consecutive days with logs, counting backward from today.
 */
export function calculateLoggingStreak(logs: LogEntry[]): number {
    if (!logs || logs.length === 0) return 0;

    // Get unique dates from logs
    const uniqueDateKeys = new Set<string>();
    for (const log of logs) {
        uniqueDateKeys.add(toDateKey(parseLocalDate(log.date)));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today has a log — if not, start from yesterday
    const todayKey = toDateKey(today);
    let streak = 0;
    let checkDate = new Date(today);

    if (!uniqueDateKeys.has(todayKey)) {
        // Check yesterday — if no log yesterday either, streak is 0
        checkDate.setDate(checkDate.getDate() - 1);
        if (!uniqueDateKeys.has(toDateKey(checkDate))) {
            return 0;
        }
    }

    // Count consecutive days backward
    while (uniqueDateKeys.has(toDateKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}
