import { SymptomLog, UserProfile, RiskFlag } from '@/types';
import { detectPeriodStartDates, calculateAverageCycleLength, getCurrentCycleInfo } from './cycle-analysis';
import { differenceInMonths, parseISO, isAfter, subMonths } from 'date-fns';

export interface HealthStats {
    totalLogs: number;
    monthsCovered: number;
    avgPain: number;
    heavyFlowDays: number;
    topSymptoms: string[];
    lutealMoodPattern: string;
    cycleLengths: number[];
    nonPeriodPainDays: number;
}

/**
 * Calculate health statistics from logs over a 12-month period.
 */
export function calculateHealthStats(logs: SymptomLog[], profile: UserProfile): HealthStats {
    const now = new Date();
    const twelveMonthsAgo = subMonths(now, 12);
    const sixMonthsAgo = subMonths(now, 6);

    const relevantLogs = logs.filter(log => {
        const logDate = log.date.includes('T') ? parseISO(log.date) : new Date(log.date);
        return isAfter(logDate, twelveMonthsAgo);
    });

    const totalLogs = relevantLogs.length;

    // Months covered
    let monthsCovered = 0;
    if (totalLogs > 0) {
        const sortedLogs = [...relevantLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstLogDate = new Date(sortedLogs[0].date);
        const lastLogDate = new Date(sortedLogs[sortedLogs.length - 1].date);
        monthsCovered = Math.max(1, differenceInMonths(lastLogDate, firstLogDate) + 1);
    }

    // Avg Pain
    const avgPain = totalLogs > 0
        ? Number((relevantLogs.reduce((sum, l) => sum + (l.painLevel || 0), 0) / totalLogs).toFixed(1))
        : 0;

    // Heavy flow days (last 6 months)
    const heavyFlowDays = relevantLogs.filter(l => {
        const logDate = l.date.includes('T') ? parseISO(l.date) : new Date(l.date);
        return isAfter(logDate, sixMonthsAgo) && l.flowLevel === 'heavy';
    }).length;

    // Top Symptoms
    const symptomCounts: Record<string, number> = {};
    relevantLogs.forEach(l => {
        (l.symptoms || []).forEach(s => {
            symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        });
    });
    const topSymptoms = Object.entries(symptomCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);

    // Luteal Mood Pattern
    // Identify luteal phase logs (approx 14 days before period start)
    const periodStarts = detectPeriodStartDates(relevantLogs.map(l => ({ ...l, date: l.date })));
    const moodCounts: Record<string, number> = {};

    // Simple heuristic for luteal mood: logs in the 5 days before each period start
    periodStarts.forEach(start => {
        const lutealWindowStart = subMonths(start, 0); // Reset time part
        lutealWindowStart.setDate(start.getDate() - 5);

        relevantLogs.forEach(l => {
            const logDate = l.date.includes('T') ? parseISO(l.date) : new Date(l.date);
            if (isAfter(logDate, lutealWindowStart) && !isAfter(logDate, start)) {
                moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1;
            }
        });
    });

    const dominantMood = Object.entries(moodCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'stable';
    const lutealMoodPattern = dominantMood !== 'stable'
        ? `Noticeable ${dominantMood} pattern during luteal phase`
        : 'Relatively stable mood patterns observed';

    // Cycle Lengths (last 6)
    const cycleLengths: number[] = [];
    for (let i = 1; i < periodStarts.length; i++) {
        const diff = Math.round((periodStarts[i].getTime() - periodStarts[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 21 && diff <= 45) {
            cycleLengths.push(diff);
        }
    }
    const last6CycleLengths = cycleLengths.slice(-6);

    // Non-period pain days
    const nonPeriodPainDays = relevantLogs.filter(l => l.flowLevel === 'none' && (l.painLevel || 0) > 5).length;

    return {
        totalLogs,
        monthsCovered,
        avgPain,
        heavyFlowDays,
        topSymptoms,
        lutealMoodPattern,
        cycleLengths: last6CycleLengths,
        nonPeriodPainDays
    };
}

/**
 * Detect health patterns and return risk flags.
 */
export function analyzeHealthRiskFlags(logs: SymptomLog[], profile: UserProfile): RiskFlag[] {
    const flags: RiskFlag[] = [];
    const stats = calculateHealthStats(logs, profile);
    const cycleInfo = getCurrentCycleInfo(
        logs.map(l => ({ ...l, date: l.date })),
        profile.lastPeriodStart ? new Date(profile.lastPeriodStart) : null,
        profile.averageCycleLength
    );

    // Anemia
    if (stats.heavyFlowDays >= 3 && stats.totalLogs > 0) {
        flags.push({
            type: 'anemia',
            severity: 'medium',
            description: 'Pattern of heavy menstrual flow detected consistently',
            recommendation: 'Worth discussing iron levels or flow management with your doctor'
        });
    }

    // PCOS
    if (cycleInfo.averageCycleLength > 35 || profile.conditions?.includes('PCOS')) {
        flags.push({
            type: 'pcos',
            severity: 'medium',
            description: 'Observation of cycles longer than 35 days (average: ' + cycleInfo.averageCycleLength + 'd)',
            recommendation: 'Pattern worth discussing for potential hormonal evaluation'
        });
    }

    // Endometriosis
    if (stats.nonPeriodPainDays > 5 || stats.avgPain > 7) {
        flags.push({
            type: 'endometriosis',
            severity: 'high',
            description: 'Self-tracked observation of high pain levels outside of menstrual window',
            recommendation: 'Flagged for evaluation of persistent pelvic pain triggers'
        });
    }

    // PMDD / Luteal Sensitivity
    if (stats.lutealMoodPattern.includes('anxious') || stats.lutealMoodPattern.includes('irritable') || stats.lutealMoodPattern.includes('sad')) {
        flags.push({
            type: 'general',
            severity: 'medium',
            description: 'Noticed pattern of significant mood sensitivity in the luteal phase',
            recommendation: 'Self-tracked observation worth discussing for cicloal mood management'
        });
    }

    return flags;
}
