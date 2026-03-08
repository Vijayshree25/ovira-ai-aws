/**
 * Vitest test scaffold for pattern-analysis.ts
 *
 * 3 test cases covering the main detection scenarios with synthetic data.
 * Run with: npm run test -- pattern-analysis
 */

import { describe, it, expect } from 'vitest';
import { analyzeHealthPatterns } from '@/lib/utils/pattern-analysis';
import type { SymptomLog, UserProfile } from '@/types';

// ─── Test Helpers ────────────────────────────────────────────────────────────

/** Generates a date string offset by `dayOffset` from a base date. */
function makeDate(baseDate: string, dayOffset: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
}

/** Creates a minimal SymptomLog for testing. */
function makeLog(overrides: Partial<SymptomLog> & { date: string; userId: string }): SymptomLog {
    return {
        id: `log_${overrides.date}`,
        userId: overrides.userId,
        date: overrides.date,
        flowLevel: overrides.flowLevel ?? 'none',
        painLevel: overrides.painLevel ?? 0,
        mood: overrides.mood ?? 'neutral',
        energyLevel: overrides.energyLevel ?? 'medium',
        sleepHours: overrides.sleepHours ?? 7,
        symptoms: overrides.symptoms ?? [],
        notes: overrides.notes,
        createdAt: overrides.date,
    };
}

const baseProfile: UserProfile = {
    uid: 'test-user',
    email: 'test@example.com',
    ageRange: '25-34',
    conditions: [],
    language: 'en',
    onboardingComplete: true,
    createdAt: '2025-01-01',
    averageCycleLength: 28,
    lastPeriodStart: '2025-03-01',
};

// ─── Test Cases ──────────────────────────────────────────────────────────────

describe('analyzeHealthPatterns', () => {
    it('returns empty results for no logs', () => {
        const result = analyzeHealthPatterns([], baseProfile);

        expect(result.riskFlags).toHaveLength(0);
        expect(result.overallRisk).toBe('low');
        expect(result.urgentFlags).toHaveLength(0);
        expect(result.logsAnalyzed).toBe(0);
        expect(result.cycleStats.totalCyclesTracked).toBe(0);
    });

    it('detects anaemia pattern from heavy flow + fatigue + low energy', () => {
        // Simulate 2 cycles with heavy flow for 6 consecutive days + fatigue + low energy
        const base = '2025-01-01';
        const logs: SymptomLog[] = [];

        // Cycle 1: 6 heavy days with fatigue and low energy
        for (let d = 0; d < 6; d++) {
            logs.push(
                makeLog({
                    userId: 'test-user',
                    date: makeDate(base, d),
                    flowLevel: 'heavy',
                    painLevel: 5,
                    mood: 'bad',
                    energyLevel: 'low',
                    sleepHours: 5,
                    symptoms: ['Fatigue', 'Headache', 'Cramps'],
                }),
            );
        }

        // Non-period days
        for (let d = 6; d < 28; d++) {
            logs.push(
                makeLog({
                    userId: 'test-user',
                    date: makeDate(base, d),
                    flowLevel: 'none',
                    painLevel: 1,
                    mood: 'good',
                    energyLevel: 'medium',
                    sleepHours: 7,
                }),
            );
        }

        // Cycle 2: 6 heavy days with fatigue and low energy
        for (let d = 28; d < 34; d++) {
            logs.push(
                makeLog({
                    userId: 'test-user',
                    date: makeDate(base, d),
                    flowLevel: 'heavy',
                    painLevel: 6,
                    mood: 'bad',
                    energyLevel: 'low',
                    sleepHours: 5,
                    symptoms: ['Fatigue', 'Headache'],
                }),
            );
        }

        const result = analyzeHealthPatterns(logs, baseProfile);

        // Should detect anaemia
        const anaemiaFlag = result.riskFlags.find((f) => f.type === 'anemia');
        expect(anaemiaFlag).toBeDefined();
        expect(anaemiaFlag!.severity).not.toBe('low');
        expect(result.cycleStats.heavyFlowDays).toBe(12);
    });

    it('detects endometriosis pattern with urgent flag for severe non-period pain', () => {
        const base = '2025-01-01';
        const logs: SymptomLog[] = [];

        // Generate 3 months of data with non-period pain ≥8 across months
        for (let month = 0; month < 3; month++) {
            const monthBase = makeDate(base, month * 30);

            // Period days (5 days)
            for (let d = 0; d < 5; d++) {
                logs.push(
                    makeLog({
                        userId: 'test-user',
                        date: makeDate(monthBase, d),
                        flowLevel: d < 2 ? 'heavy' : 'medium',
                        painLevel: 6,
                        mood: 'bad',
                        energyLevel: 'low',
                        sleepHours: 6,
                        symptoms: ['Cramps'],
                    }),
                );
            }

            // Non-period days with severe pain
            for (let d = 10; d < 15; d++) {
                logs.push(
                    makeLog({
                        userId: 'test-user',
                        date: makeDate(monthBase, d),
                        flowLevel: 'none',
                        painLevel: 8,
                        mood: 'terrible',
                        energyLevel: 'low',
                        sleepHours: 5,
                        symptoms: ['Back pain', 'Cramps'],
                    }),
                );
            }

            // Normal non-period days
            for (let d = 15; d < 28; d++) {
                logs.push(
                    makeLog({
                        userId: 'test-user',
                        date: makeDate(monthBase, d),
                        flowLevel: 'none',
                        painLevel: 2,
                        mood: 'neutral',
                        energyLevel: 'medium',
                        sleepHours: 7,
                    }),
                );
            }
        }

        const result = analyzeHealthPatterns(logs, baseProfile);

        // Should detect endometriosis
        const endoFlag = result.riskFlags.find((f) => f.type === 'endometriosis');
        expect(endoFlag).toBeDefined();

        // Should have urgent flags for pain ≥8 across ≥2 months
        expect(result.urgentFlags.length).toBeGreaterThan(0);
        expect(result.overallRisk).toBe('high');
    });
});
