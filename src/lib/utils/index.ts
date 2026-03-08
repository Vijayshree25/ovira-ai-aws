import { clsx, type ClassValue } from 'clsx';
import { format, differenceInDays, addDays, isToday, isPast, isFuture, parseISO } from 'date-fns';

// Merge class names
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

// Format date for display
export function formatDate(date: Date | string, formatString: string = 'MMM d, yyyy'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
}

// Calculate cycle day
export function calculateCycleDay(lastPeriodStart: Date): number {
    return differenceInDays(new Date(), lastPeriodStart) + 1;
}

// Predict next period
export function predictNextPeriod(lastPeriodStart: Date, averageCycleLength: number = 28): Date {
    return addDays(lastPeriodStart, averageCycleLength);
}

// Get days until next period
export function getDaysUntilNextPeriod(lastPeriodStart: Date, averageCycleLength: number = 28): number {
    const nextPeriod = predictNextPeriod(lastPeriodStart, averageCycleLength);
    return differenceInDays(nextPeriod, new Date());
}

// Get cycle phase (proportional to actual cycle length)
export function getCyclePhase(cycleDay: number, averageCycleLength: number = 28): string {
    const menstrualEnd = Math.round(averageCycleLength * 0.18);   // ~5 days of 28
    const follicularEnd = Math.round(averageCycleLength * 0.46);  // ~13 days of 28
    const ovulationEnd = Math.round(averageCycleLength * 0.54);   // ~15 days of 28

    if (cycleDay <= menstrualEnd) return 'Menstrual';
    if (cycleDay <= follicularEnd) return 'Follicular';
    if (cycleDay <= ovulationEnd) return 'Ovulation';
    if (cycleDay <= averageCycleLength) return 'Luteal';
    return 'Expected Period';
}

// Get phase color
export function getPhaseColor(phase: string): string {
    switch (phase) {
        case 'Menstrual': return 'hsl(0, 84%, 60%)';
        case 'Follicular': return 'hsl(38, 92%, 50%)';
        case 'Ovulation': return 'hsl(160, 84%, 39%)';
        case 'Luteal': return 'hsl(262, 52%, 47%)';
        case 'Expected Period': return 'hsl(330, 81%, 60%)';
        default: return 'hsl(220, 13%, 91%)';
    }
}

// Calculate logging streak
export function calculateStreak(logDates: Date[]): number {
    if (logDates.length === 0) return 0;

    const sortedDates = logDates.sort((a, b) => b.getTime() - a.getTime());
    let streak = 0;
    let currentDate = new Date();

    // Check if logged today
    if (!isToday(sortedDates[0])) {
        currentDate = sortedDates[0];
    }

    for (const logDate of sortedDates) {
        const daysDiff = differenceInDays(currentDate, logDate);

        if (daysDiff === 0 || daysDiff === 1) {
            streak++;
            currentDate = logDate;
        } else {
            break;
        }
    }

    return streak;
}

// Validate email
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Generate unique ID
export function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Format number with suffix (1st, 2nd, 3rd, etc.)
export function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Date helpers
export { isToday, isPast, isFuture, addDays, differenceInDays, format, parseISO };
