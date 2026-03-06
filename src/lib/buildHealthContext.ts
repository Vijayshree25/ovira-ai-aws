import { UserProfile } from '@/types';

/**
 * Generates a ~150-200 word plain-English health context summary
 * that is prepended to every AI prompt for personalisation.
 */
export function buildHealthContext(profile: UserProfile): string {
    const parts: string[] = [];

    // Demographics
    const age = profile.ageRange || 'unknown age range';
    const activity = profile.activityLevel || 'unspecified activity level';
    parts.push(`User is a ${age} year-old woman with ${activity} activity level.`);

    // Height
    if (profile.heightRange) {
        parts.push(`Height range: ${profile.heightRange}.`);
    }

    // Health conditions
    const conditions = profile.conditions?.length
        ? profile.conditions.join(', ')
        : 'no known conditions';
    parts.push(`Known health conditions: ${conditions}.`);

    // Cycle info
    const cycleLen = profile.avgCycleLength || profile.averageCycleLength || 28;
    const regularity = profile.cycleRegularity || 'not specified';
    parts.push(
        `Her menstrual cycle averages ${cycleLen} days and is described as "${regularity}".`
    );

    // Diet & Lifestyle
    if (profile.dietType) {
        const grain = profile.stapleGrain ? ` with ${profile.stapleGrain} staples` : '';
        const iron = profile.ironRichFoodFrequency
            ? ` and ${profile.ironRichFoodFrequency} iron-rich food intake`
            : '';
        parts.push(`She follows a ${profile.dietType} diet${grain}${iron}.`);
    }

    if (profile.waterIntake) {
        parts.push(`Daily water intake: ~${profile.waterIntake} glasses.`);
    }

    if (profile.caffeineIntake) {
        parts.push(`Caffeine intake: ${profile.caffeineIntake}.`);
    }

    if (profile.sleepHabit) {
        parts.push(`Sleep habit: usually sleeps ${profile.sleepHabit}.`);
    }

    // Recent symptoms
    if (profile.recentPainLevel) {
        parts.push(
            `She has experienced ${profile.recentPainLevel} menstrual pain in the last 3 months.`
        );
    }

    if (profile.recentMoodPattern) {
        parts.push(`Pre-period mood: ${profile.recentMoodPattern}.`);
    }

    if (profile.regularSymptoms?.length) {
        parts.push(`She regularly experiences: ${profile.regularSymptoms.join(', ')}.`);
    }

    if (profile.hasDoctorConsultation) {
        parts.push(`Recent doctor consultation: ${profile.hasDoctorConsultation}.`);
    }

    // Personal goal
    if (profile.personalGoal) {
        parts.push(`Her personal health goal is: "${profile.personalGoal}".`);
    }

    parts.push('This context should inform all health advice given to this user.');

    return parts.join(' ');
}
