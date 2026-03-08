/**
 * Pattern Analysis Module — Pure TypeScript Statistical Analysis
 *
 * Detects 4 health patterns from logged symptom data using statistical analysis.
 * NO AI calls — this runs locally before sending data to Bedrock.
 *
 * Patterns detected:
 *   1. PCOS — irregular cycle lengths, acne patterns, mood swings
 *   2. Anaemia / Iron Deficiency — heavy prolonged flow, fatigue, low energy
 *   3. Endometriosis — non-period pelvic pain, back pain + cramp clusters
 *   4. PMS / PMDD — luteal-phase mood deterioration vs follicular baseline
 *
 * IMPORTANT: All language uses "pattern suggests" / "may warrant evaluation".
 * This is decision-support only — NEVER diagnostic language.
 *
 * @module pattern-analysis
 */

import type { SymptomLog, UserProfile, RiskFlag } from '@/types';

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface CycleStats {
    cycleLengths: number[];
    avgPainScore: number;
    avgSleepHours: number;
    heavyFlowDays: number;
    nonPeriodPainDays: number;
    lutealMoodScore: number;
    follicularMoodScore: number;
    topSymptoms: string[];
    totalCyclesTracked: number;
}

export interface PatternAnalysisResult {
    riskFlags: RiskFlag[];
    overallRisk: 'low' | 'medium' | 'high';
    cycleStats: CycleStats;
    urgentFlags: string[];
    analysisDate: string;
    logsAnalyzed: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Mood string → numeric score mapping (1 = terrible, 5 = great). */
const MOOD_SCORES: Record<string, number> = {
    great: 5,
    good: 4,
    neutral: 3,
    bad: 2,
    terrible: 1,
};

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Sorts logs chronologically by date (ascending).
 */
function sortByDate(logs: SymptomLog[]): SymptomLog[] {
    return [...logs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
}

/**
 * Calculates the number of full days between two date strings.
 */
function daysBetween(dateA: string, dateB: string): number {
    return Math.round(
        Math.abs(new Date(dateB).getTime() - new Date(dateA).getTime()) /
        (1000 * 60 * 60 * 24),
    );
}

/**
 * Extracts the YYYY-MM of a date string for monthly grouping.
 */
function monthKey(date: string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Detects period start dates by finding the first day of each flow episode.
 * A flow episode is a contiguous run of days where flowLevel ≠ 'none'.
 * A new episode starts after ≥3 consecutive no-flow days.
 */
function detectPeriodStartDates(sortedLogs: SymptomLog[]): string[] {
    const starts: string[] = [];
    let inPeriod = false;
    let noFlowStreak = 0;

    for (const log of sortedLogs) {
        const hasFlow = log.flowLevel !== 'none';

        if (hasFlow) {
            if (!inPeriod) {
                starts.push(log.date);
                inPeriod = true;
            }
            noFlowStreak = 0;
        } else {
            noFlowStreak++;
            if (noFlowStreak >= 3) {
                inPeriod = false;
            }
        }
    }

    return starts;
}

/**
 * Determines the cycle day for a given log relative to the most recent
 * period start that precedes it.
 * Returns -1 if no preceding period start is found.
 */
function getCycleDay(logDate: string, periodStarts: string[]): number {
    const logTime = new Date(logDate).getTime();

    // Find the latest period start before or on this date
    let latestStart: string | null = null;
    for (const start of periodStarts) {
        if (new Date(start).getTime() <= logTime) {
            latestStart = start;
        }
    }

    if (!latestStart) return -1;
    return daysBetween(latestStart, logDate) + 1; // cycle day 1 = start
}

/**
 * Checks if a symptom string exists in a log's symptom list (case-insensitive).
 */
function hasSymptom(log: SymptomLog, symptom: string): boolean {
    return (
        log.symptoms?.some(
            (s) => s.toLowerCase().includes(symptom.toLowerCase()),
        ) ?? false
    );
}

/**
 * Maps severity from a confidence percentage.
 * < 50 → low, 50–70 → medium, > 70 → high
 */
function severityFromConfidence(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence > 70) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
}

// ─── Pattern Detectors ───────────────────────────────────────────────────────

/**
 * **PCOS Pattern Detection**
 *
 * Clinical basis:
 * - Rotterdam criteria require ≥2 of: oligo-/anovulation, hyperandrogenism,
 *   polycystic ovarian morphology.
 * - Oligo-ovulation manifests as cycle lengths >35 days (oligomenorrhea).
 * - Hyperandrogenism may present as acne, particularly during the follicular phase.
 * - ACOG Practice Bulletin on PCOS references cycle irregularity as primary indicator.
 *
 * Detection logic:
 * a) Calculate cycle lengths from detected period start dates.
 * b) Flag if 2+ consecutive cycles >35 days.
 * c) Check acne in follicular phase (days 6–14) in >60% of applicable logs.
 * d) Check cycle length variance >10 days across last 3 cycles.
 * e) Check mood swings in >50% of luteal phase logs.
 *
 * Confidence: base 40% + modifiers. Severity derived from confidence.
 */
function detectPCOS(
    sortedLogs: SymptomLog[],
    periodStarts: string[],
    cycleLengths: number[],
    profile: UserProfile,
): RiskFlag | null {
    let confidence = 0;
    const indicators: string[] = [];

    // ── (b) 2+ consecutive cycles >35 days ──
    let consecutiveLong = 0;
    let maxConsecutiveLong = 0;
    for (const len of cycleLengths) {
        if (len > 35) {
            consecutiveLong++;
            maxConsecutiveLong = Math.max(maxConsecutiveLong, consecutiveLong);
        } else {
            consecutiveLong = 0;
        }
    }

    const hasProlongedCycles = maxConsecutiveLong >= 2;
    if (hasProlongedCycles) {
        confidence += 40 + 20; // base + cycles >35 days
        indicators.push(
            `${maxConsecutiveLong} consecutive cycles with length >35 days (pattern consistent with oligomenorrhea)`,
        );
    } else if (cycleLengths.some((l) => l > 35)) {
        confidence += 40; // base only, some long but not consecutive
        indicators.push(
            'At least one cycle >35 days detected; pattern may warrant monitoring',
        );
    } else {
        // No long cycles, skip PCOS unless other strong indicators
        confidence += 0;
    }

    // If no base (no long cycles at all), exit early unless user has PCOS condition
    if (confidence === 0 && !profile.conditions?.includes('PCOS')) {
        return null;
    }
    if (confidence === 0) {
        confidence = 40; // base only for known PCOS
    }

    // ── (c) Acne during follicular phase (days 6–14) in >60% of logs ──
    const follicularLogs = sortedLogs.filter((log) => {
        const day = getCycleDay(log.date, periodStarts);
        return day >= 6 && day <= 14;
    });

    if (follicularLogs.length > 0) {
        const acneCount = follicularLogs.filter((l) => hasSymptom(l, 'acne')).length;
        const acneRate = acneCount / follicularLogs.length;
        if (acneRate > 0.6) {
            confidence += 15;
            indicators.push(
                `Acne reported in ${Math.round(acneRate * 100)}% of follicular phase logs (pattern may suggest androgen sensitivity)`,
            );
        }
    }

    // ── (d) Cycle length variance >10 days across last 3 cycles ──
    const last3 = cycleLengths.slice(-3);
    if (last3.length >= 2) {
        const variance = Math.max(...last3) - Math.min(...last3);
        if (variance > 10) {
            confidence += 15;
            indicators.push(
                `Cycle length variance of ${variance} days across last ${last3.length} cycles (pattern suggests irregular ovulation)`,
            );
        }
    }

    // ── (e) Mood swings in >50% of luteal phase logs ──
    const lutealLogs = sortedLogs.filter((log) => {
        const day = getCycleDay(log.date, periodStarts);
        const cycleLen = profile.averageCycleLength || 28;
        return day >= cycleLen - 14 && day <= cycleLen;
    });

    if (lutealLogs.length > 0) {
        const moodSwingCount = lutealLogs.filter((l) =>
            hasSymptom(l, 'mood swings'),
        ).length;
        if (moodSwingCount / lutealLogs.length > 0.5) {
            indicators.push(
                'Mood swings reported in >50% of luteal phase logs',
            );
        }
    }

    // ── User has PCOS in conditions ──
    if (profile.conditions?.includes('PCOS')) {
        confidence += 10;
        indicators.push('PCOS listed in user health conditions');
    }

    confidence = Math.min(confidence, 100);

    if (indicators.length === 0) return null;

    return {
        type: 'pcos',
        severity: severityFromConfidence(confidence),
        confidence: confidence,
        description: `Cycle patterns suggest evaluation may be warranted for polycystic ovary syndrome. ${indicators.join('. ')}.`,
        recommendation:
            'Your doctor may consider evaluation for PCOS based on these cycle patterns. Discuss with your gynaecologist.',
    } as RiskFlag & { confidence: number };
}

/**
 * **Anaemia / Iron Deficiency Pattern Detection**
 *
 * Clinical basis:
 * - NIH Office of Dietary Supplements: ferritin depletion correlates with
 *   menstrual blood loss >80 mL/cycle.
 * - FIGO classification: heavy menstrual bleeding (HMB) defined as excessive
 *   blood loss interfering with quality of life.
 * - Prolonged heavy flow (≥5 consecutive days) is a significant risk factor.
 * - Fatigue, low energy, and headache are common clinical presentations.
 *
 * Detection logic:
 * a) Identify period days (flowLevel ≠ 'none').
 * b) Flag if heavy flow for ≥5 consecutive days in any cycle.
 * c) Check fatigue on >70% of period days.
 * d) Check sleep <6h on >40% of period days.
 * e) Check low energy on >60% of period days.
 * f) Check headache + fatigue co-occurrence on period days.
 */
function detectAnaemia(
    sortedLogs: SymptomLog[],
    _periodStarts: string[],
): RiskFlag | null {
    let confidence = 0;
    const indicators: string[] = [];

    // Identify period days
    const periodLogs = sortedLogs.filter((l) => l.flowLevel !== 'none');
    if (periodLogs.length === 0) return null;

    // ── (b) Heavy flow ≥5 consecutive days ──
    let consecutiveHeavy = 0;
    let maxConsecutiveHeavy = 0;
    for (const log of sortedLogs) {
        if (log.flowLevel === 'heavy') {
            consecutiveHeavy++;
            maxConsecutiveHeavy = Math.max(maxConsecutiveHeavy, consecutiveHeavy);
        } else {
            consecutiveHeavy = 0;
        }
    }

    if (maxConsecutiveHeavy >= 5) {
        confidence += 30 + 25; // base + heavy ≥5 days
        indicators.push(
            `${maxConsecutiveHeavy} consecutive heavy flow days detected (per NIH guidelines, prolonged heavy flow may correlate with ferritin depletion)`,
        );
    } else if (maxConsecutiveHeavy >= 3) {
        confidence += 30; // base only
        indicators.push(
            `${maxConsecutiveHeavy} consecutive heavy flow days; pattern warrants monitoring`,
        );
    } else {
        confidence += 0;
    }

    // ── (c) Fatigue on >70% of period days ──
    const fatigueOnPeriod = periodLogs.filter((l) =>
        hasSymptom(l, 'fatigue'),
    ).length;
    const fatigueRate = fatigueOnPeriod / periodLogs.length;

    if (fatigueRate > 0.7) {
        confidence += 20;
        indicators.push(
            `Fatigue reported on ${Math.round(fatigueRate * 100)}% of period days (pattern consistent with iron depletion)`,
        );
    }

    // ── (d) Sleep <6h on >40% of period days ──
    const poorSleepOnPeriod = periodLogs.filter(
        (l) => l.sleepHours < 6,
    ).length;
    const poorSleepRate = poorSleepOnPeriod / periodLogs.length;

    if (poorSleepRate > 0.4) {
        confidence += 10;
        indicators.push(
            `Sleep <6 hours on ${Math.round(poorSleepRate * 100)}% of period days`,
        );
    }

    // ── (e) Low energy on >60% of period days ──
    const lowEnergyOnPeriod = periodLogs.filter(
        (l) => l.energyLevel === 'low',
    ).length;
    const lowEnergyRate = lowEnergyOnPeriod / periodLogs.length;

    if (lowEnergyRate > 0.6) {
        confidence += 15;
        indicators.push(
            `Low energy on ${Math.round(lowEnergyRate * 100)}% of period days (per NIH iron deficiency guidelines, fatigue and low energy are key indicators)`,
        );
    }

    // ── (f) Headache + fatigue co-occurrence on period days ──
    const headacheFatigue = periodLogs.filter(
        (l) => hasSymptom(l, 'headache') && hasSymptom(l, 'fatigue'),
    ).length;
    if (headacheFatigue >= 3) {
        indicators.push(
            `Headache + fatigue co-occurrence on ${headacheFatigue} period days`,
        );
    }

    if (confidence === 0) return null;
    confidence = Math.min(confidence, 100);

    return {
        type: 'anemia',
        severity: severityFromConfidence(confidence),
        confidence: confidence,
        description: `Flow and energy patterns suggest discussion about iron levels may be warranted. ${indicators.join('. ')}.`,
        recommendation:
            'According to NIH iron deficiency guidelines, these patterns may warrant a blood test to check ferritin and haemoglobin levels. Discuss with your healthcare provider.',
    } as RiskFlag & { confidence: number };
}

/**
 * **Endometriosis Pattern Detection**
 *
 * Clinical basis:
 * - WHO (2024): endometriosis affects ~10% of reproductive-age women.
 * - Hallmark: chronic pelvic pain OUTSIDE of menstruation.
 * - Key differentiator: non-menstrual pain ≥6/10 recurring across multiple months.
 * - Dyspareunia and dyschezia are common but not trackable in this app.
 * - Pain at ovulation (~cycle day 14) is an additional indicator.
 *
 * Detection logic:
 * a) Identify non-period days (flowLevel = 'none').
 * b) Flag if painLevel ≥6 on non-period days in 3+ separate months.
 * c) Check back pain + cramps co-occurrence on non-period days.
 * d) Check painLevel ≥7 on ovulation days (~cycle day 14).
 * e) Check mood 'bad'|'terrible' correlating with non-period pain days.
 * f) URGENT: painLevel ≥8 on non-period days in ≥2 months.
 */
function detectEndometriosis(
    sortedLogs: SymptomLog[],
    periodStarts: string[],
    profile: UserProfile,
): { flag: RiskFlag | null; urgentFlags: string[] } {
    let confidence = 0;
    const indicators: string[] = [];
    const urgentFlags: string[] = [];

    // Non-period days with significant pain
    const nonPeriodPainLogs = sortedLogs.filter(
        (l) => l.flowLevel === 'none' && l.painLevel >= 6,
    );

    if (nonPeriodPainLogs.length === 0) {
        return { flag: null, urgentFlags: [] };
    }

    // ── (b) Pain ≥6 on non-period days in 3+ separate months ──
    const painMonths = new Set(nonPeriodPainLogs.map((l) => monthKey(l.date)));

    if (painMonths.size >= 3) {
        confidence += 20 + 30; // base + 3+ months
        indicators.push(
            `Pain ≥6/10 on non-period days across ${painMonths.size} separate months (per WHO, recurring non-menstrual pelvic pain may warrant evaluation for endometriosis)`,
        );
    } else if (painMonths.size >= 1) {
        confidence += 20; // base only
        indicators.push(
            `Pain ≥6/10 on non-period days in ${painMonths.size} month(s); continued tracking recommended`,
        );
    }

    // ── (c) Back pain + cramps on non-period days ──
    const nonPeriodDays = sortedLogs.filter((l) => l.flowLevel === 'none');
    const backCrampDays = nonPeriodDays.filter(
        (l) => hasSymptom(l, 'back pain') && hasSymptom(l, 'cramps'),
    ).length;

    if (backCrampDays >= 3) {
        confidence += 20;
        indicators.push(
            `Back pain + cramps co-occurring on ${backCrampDays} non-period days (pattern consistent with deep pelvic involvement)`,
        );
    }

    // ── (d) Pain ≥7 on ovulation days (~cycle day 14) ──
    const ovulationLogs = sortedLogs.filter((log) => {
        const day = getCycleDay(log.date, periodStarts);
        return day >= 13 && day <= 15; // ±1 day around ovulation
    });

    const ovulationPain = ovulationLogs.filter((l) => l.painLevel >= 7).length;
    if (ovulationPain >= 2) {
        confidence += 15;
        indicators.push(
            `Pain ≥7/10 on ${ovulationPain} ovulation-window days (pattern suggests mittelschmerz or deeper involvement)`,
        );
    }

    // ── (e) Mood correlation with non-period pain ──
    const moodCorrelation = nonPeriodPainLogs.filter(
        (l) => l.mood === 'bad' || l.mood === 'terrible',
    ).length;
    if (
        nonPeriodPainLogs.length > 0 &&
        moodCorrelation / nonPeriodPainLogs.length > 0.5
    ) {
        confidence += 15;
        indicators.push(
            'Low mood correlating with non-period pain days in >50% of occurrences',
        );
    }

    // ── (f) URGENT: pain ≥8 on non-period days in ≥2 months ──
    const severePainLogs = sortedLogs.filter(
        (l) => l.flowLevel === 'none' && l.painLevel >= 8,
    );
    const severePainMonths = new Set(severePainLogs.map((l) => monthKey(l.date)));

    if (severePainMonths.size >= 2) {
        urgentFlags.push(
            `Severe pain (≥8/10) on non-period days across ${severePainMonths.size} months — please consult a gynaecologist promptly`,
        );
    }

    if (confidence === 0) return { flag: null, urgentFlags };
    confidence = Math.min(confidence, 100);

    return {
        flag: {
            type: 'endometriosis',
            severity: severityFromConfidence(confidence),
            confidence: confidence,
            description: `Non-period pain patterns may warrant evaluation for endometriosis. ${indicators.join('. ')}.`,
            recommendation:
                'Per WHO (2024), recurring non-menstrual pelvic pain should be discussed with a gynaecologist. Your doctor may consider further evaluation.',
        } as RiskFlag & { confidence: number },
        urgentFlags,
    };
}

/**
 * **PMS / PMDD Pattern Detection**
 *
 * Clinical basis:
 * - ACOG CPG No. 7 (2023): PMDD requires ≥5 symptoms in the luteal phase
 *   with functional impairment, confirmed over 2 prospective cycles.
 * - Key differentiator: mood scores in the luteal phase (last 7–14 days)
 *   are significantly worse than follicular phase (days 6–13).
 * - A delta ≥1.5 points on a 1–5 mood scale is clinically meaningful.
 *
 * Detection logic:
 * a) Detect luteal phase: last 7–14 days before each period start.
 * b) Compare average luteal mood vs follicular mood.
 * c) Flag if delta ≥1.5 points.
 * d) Check anxiety in >60% of luteal logs.
 * e) Check bloating + breast tenderness in luteal phase.
 * f) Check low energy in >70% of luteal days.
 * g) Check if pattern repeats across 2+ cycles.
 */
function detectPMDD(
    sortedLogs: SymptomLog[],
    periodStarts: string[],
    profile: UserProfile,
): RiskFlag | null {
    let confidence = 0;
    const indicators: string[] = [];
    const cycleLen = profile.averageCycleLength || 28;

    // Collect mood scores by phase
    const lutealScores: number[] = [];
    const follicularScores: number[] = [];

    // Track per-cycle luteal data for repeat pattern check
    const lutealByCycle: Record<number, number[]> = {};

    for (const log of sortedLogs) {
        const day = getCycleDay(log.date, periodStarts);
        if (day < 0) continue;

        const score = MOOD_SCORES[log.mood] ?? 3;

        // Follicular phase: days 6–13
        if (day >= 6 && day <= 13) {
            follicularScores.push(score);
        }

        // Luteal phase: last 14 days to last 7 days of cycle
        if (day >= cycleLen - 14 && day <= cycleLen) {
            lutealScores.push(score);

            // Determine which cycle this belongs to
            const cycleIndex = periodStarts.findIndex((start) => {
                const startTime = new Date(start).getTime();
                const logTime = new Date(log.date).getTime();
                return logTime >= startTime && logTime < startTime + cycleLen * 86400000;
            });
            if (cycleIndex >= 0) {
                if (!lutealByCycle[cycleIndex]) lutealByCycle[cycleIndex] = [];
                lutealByCycle[cycleIndex].push(score);
            }
        }
    }

    if (lutealScores.length === 0 || follicularScores.length === 0) return null;

    const avgLuteal =
        lutealScores.reduce((s, v) => s + v, 0) / lutealScores.length;
    const avgFollicular =
        follicularScores.reduce((s, v) => s + v, 0) / follicularScores.length;
    const moodDelta = avgFollicular - avgLuteal; // positive = luteal is worse

    // ── (c) Mood delta ≥1.5 ──
    if (moodDelta >= 1.5) {
        confidence += 35 + 25; // base + delta
        indicators.push(
            `Luteal mood score ${avgLuteal.toFixed(1)} vs follicular ${avgFollicular.toFixed(1)} (delta ${moodDelta.toFixed(1)}). Based on ACOG CPG No. 7 (2023), this mood shift pattern may warrant evaluation for PMS/PMDD`,
        );
    } else if (moodDelta >= 1.0) {
        confidence += 35; // base only
        indicators.push(
            `Luteal mood score ${avgLuteal.toFixed(1)} vs follicular ${avgFollicular.toFixed(1)} (delta ${moodDelta.toFixed(1)}); moderate luteal mood decline`,
        );
    } else {
        return null; // insufficient mood differential
    }

    // Get luteal-phase logs for symptom checks
    const lutealLogs = sortedLogs.filter((log) => {
        const day = getCycleDay(log.date, periodStarts);
        return day >= cycleLen - 14 && day <= cycleLen;
    });

    // ── (d) Anxiety in >60% of luteal logs ──
    if (lutealLogs.length > 0) {
        const anxietyCount = lutealLogs.filter((l) =>
            hasSymptom(l, 'anxiety'),
        ).length;
        const anxietyRate = anxietyCount / lutealLogs.length;

        if (anxietyRate > 0.6) {
            confidence += 20;
            indicators.push(
                `Anxiety reported in ${Math.round(anxietyRate * 100)}% of luteal phase logs`,
            );
        }
    }

    // ── (e) Bloating + breast tenderness in luteal phase ──
    if (lutealLogs.length > 0) {
        const physicalCluster = lutealLogs.filter(
            (l) => hasSymptom(l, 'bloating') && hasSymptom(l, 'breast tenderness'),
        ).length;

        if (physicalCluster >= 3) {
            confidence += 10;
            indicators.push(
                `Bloating + breast tenderness co-occurring on ${physicalCluster} luteal phase days`,
            );
        }
    }

    // ── (f) Low energy in >70% of luteal days ──
    if (lutealLogs.length > 0) {
        const lowEnergyLuteal = lutealLogs.filter(
            (l) => l.energyLevel === 'low',
        ).length;
        if (lowEnergyLuteal / lutealLogs.length > 0.7) {
            indicators.push(
                'Low energy on >70% of luteal phase days',
            );
        }
    }

    // ── (g) Pattern repeats across 2+ cycles ──
    const cyclesWithPoorLuteal = Object.values(lutealByCycle).filter(
        (scores) => {
            const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
            return avgFollicular - avg >= 1.0;
        },
    ).length;

    if (cyclesWithPoorLuteal >= 2) {
        confidence += 10;
        indicators.push(
            `Luteal mood pattern repeats across ${cyclesWithPoorLuteal} tracked cycles`,
        );
    }

    confidence = Math.min(confidence, 100);

    return {
        type: 'general', // Using 'general' since RiskFlag.type doesn't have 'pms'
        severity: severityFromConfidence(confidence),
        confidence: confidence,
        description: `Mood and symptom patterns in the luteal phase suggest evaluation for PMS/PMDD may be warranted. ${indicators.join('. ')}.`,
        recommendation:
            'Based on ACOG CPG No. 7 (2023), prospective tracking of symptoms for 2+ cycles is recommended. Discuss these patterns with your healthcare provider.',
    } as RiskFlag & { confidence: number };
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

/**
 * Performs comprehensive statistical pattern analysis on symptom logs.
 *
 * This is a **purely local computation** — no AI or network calls.
 * The output feeds into the Clinical KB prompt (PROMPT 03) as structured input.
 *
 * @param logs    - Array of symptom logs from the user
 * @param profile - User profile with conditions, cycle length, etc.
 * @returns PatternAnalysisResult with detected risk flags, cycle stats, and urgents
 */
export function analyzeHealthPatterns(
    logs: SymptomLog[],
    profile: UserProfile,
): PatternAnalysisResult {
    if (logs.length === 0) {
        return {
            riskFlags: [],
            overallRisk: 'low',
            cycleStats: {
                cycleLengths: [],
                avgPainScore: 0,
                avgSleepHours: 0,
                heavyFlowDays: 0,
                nonPeriodPainDays: 0,
                lutealMoodScore: 3,
                follicularMoodScore: 3,
                topSymptoms: [],
                totalCyclesTracked: 0,
            },
            urgentFlags: [],
            analysisDate: new Date().toISOString(),
            logsAnalyzed: 0,
        };
    }

    const sortedLogs = sortByDate(logs);
    const periodStarts = detectPeriodStartDates(sortedLogs);

    // ── Compute cycle lengths ────────────────────────────────────────────
    const cycleLengths: number[] = [];
    for (let i = 1; i < periodStarts.length; i++) {
        cycleLengths.push(daysBetween(periodStarts[i - 1], periodStarts[i]));
    }
    const last5CycleLengths = cycleLengths.slice(-5);

    // ── Compute aggregate stats ──────────────────────────────────────────
    const avgPainScore =
        Math.round(
            (logs.reduce((sum, l) => sum + l.painLevel, 0) / logs.length) * 10,
        ) / 10;

    const avgSleepHours =
        Math.round(
            (logs.reduce((sum, l) => sum + l.sleepHours, 0) / logs.length) * 10,
        ) / 10;

    const heavyFlowDays = logs.filter((l) => l.flowLevel === 'heavy').length;

    const periodDayDates = new Set(
        logs.filter((l) => l.flowLevel !== 'none').map((l) => l.date),
    );
    const nonPeriodPainDays = logs.filter(
        (l) => l.painLevel >= 5 && !periodDayDates.has(l.date),
    ).length;

    // ── Mood scores by phase ─────────────────────────────────────────────
    const cycleLen = profile.averageCycleLength || 28;
    const lutealMoodLogs = sortedLogs.filter((log) => {
        const day = getCycleDay(log.date, periodStarts);
        return day >= cycleLen - 14 && day <= cycleLen;
    });
    const follicularMoodLogs = sortedLogs.filter((log) => {
        const day = getCycleDay(log.date, periodStarts);
        return day >= 6 && day <= 13;
    });

    const lutealMoodScore =
        lutealMoodLogs.length > 0
            ? Math.round(
                (lutealMoodLogs.reduce(
                    (sum, l) => sum + (MOOD_SCORES[l.mood] ?? 3),
                    0,
                ) /
                    lutealMoodLogs.length) *
                10,
            ) / 10
            : 3;

    const follicularMoodScore =
        follicularMoodLogs.length > 0
            ? Math.round(
                (follicularMoodLogs.reduce(
                    (sum, l) => sum + (MOOD_SCORES[l.mood] ?? 3),
                    0,
                ) /
                    follicularMoodLogs.length) *
                10,
            ) / 10
            : 3;

    // ── Top symptoms ─────────────────────────────────────────────────────
    const symptomCounts: Record<string, number> = {};
    logs.forEach((log) => {
        log.symptoms?.forEach((s) => {
            symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        });
    });
    const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s]) => s);

    // ── Run pattern detectors ────────────────────────────────────────────
    const riskFlags: RiskFlag[] = [];
    let allUrgentFlags: string[] = [];

    const pcosFlag = detectPCOS(sortedLogs, periodStarts, cycleLengths, profile);
    if (pcosFlag) riskFlags.push(pcosFlag);

    const anaemiaFlag = detectAnaemia(sortedLogs, periodStarts);
    if (anaemiaFlag) riskFlags.push(anaemiaFlag);

    const endoResult = detectEndometriosis(sortedLogs, periodStarts, profile);
    if (endoResult.flag) riskFlags.push(endoResult.flag);
    allUrgentFlags = [...allUrgentFlags, ...endoResult.urgentFlags];

    const pmddFlag = detectPMDD(sortedLogs, periodStarts, profile);
    if (pmddFlag) riskFlags.push(pmddFlag);

    // ── Overall risk ─────────────────────────────────────────────────────
    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    if (riskFlags.some((f) => f.severity === 'high') || allUrgentFlags.length > 0) {
        overallRisk = 'high';
    } else if (riskFlags.some((f) => f.severity === 'medium')) {
        overallRisk = 'medium';
    }

    return {
        riskFlags,
        overallRisk,
        cycleStats: {
            cycleLengths: last5CycleLengths,
            avgPainScore,
            avgSleepHours,
            heavyFlowDays,
            nonPeriodPainDays,
            lutealMoodScore,
            follicularMoodScore,
            topSymptoms,
            totalCyclesTracked: periodStarts.length > 0 ? periodStarts.length - 1 : 0,
        },
        urgentFlags: allUrgentFlags,
        analysisDate: new Date().toISOString(),
        logsAnalyzed: logs.length,
    };
}
