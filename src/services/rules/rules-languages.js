import { is2024 } from './rules-helpers.js';

/**
 * Get languages for a character (handles both rulesets internally).
 */
export function getLanguages(playerStats, playerSummary) {
    let languages = playerStats.race?.languages;
    if (!Array.isArray(languages)) {
        console.error('rules: expected race.languages to be an array for', playerStats.name);
        throw new Error('Missing array: race.languages for ' + playerStats.name);
    }
    languages = [...languages];
    let languagesAllowed = languages.length;
    languagesAllowed += 2; // Background languages

    if (playerStats.race.language_choices) {
        languagesAllowed += playerStats.race.language_choices.choose || 0;
    }

    if (playerStats.race.subrace && playerStats.race.subrace.language_options) {
        let subraceLanguages = playerStats.race.subrace.languages;
        if (!Array.isArray(subraceLanguages)) {
            console.error('rules: expected subrace.languages to be an array for', playerStats.name);
            throw new Error('Missing array: subrace.languages for ' + playerStats.name);
        }
        languages = [...new Set([...languages, ...subraceLanguages])];
        languagesAllowed += playerStats.race.subrace.language_options.choose || 0;
    }

    let classLanguages = playerStats.class?.languages || [];
    if (!Array.isArray(classLanguages)) {
        console.error('rules: expected class.languages to be an array for', playerStats.name);
        throw new Error('Missing array: class.languages for ' + playerStats.name);
    }
    languages = [...new Set([...languages, ...classLanguages])];

    if (playerStats.class?.language_choices) {
        let rangerLanguageBonus = playerStats.class.language_choices.choose || 0;
        languagesAllowed += rangerLanguageBonus;
        if (playerStats.class.name === 'Ranger') {
            if (playerStats.level > 5) languagesAllowed += 1;
            if (playerStats.level > 13) languagesAllowed += 1;
         }
    }

    // 5e: class.subclass.language_choices, 2024: class.major.language_choices
    const use2024 = is2024(playerStats, playerSummary);
    if (use2024) {
        if (playerStats.class.major && playerStats.class.major.language_choices) {
            languagesAllowed += playerStats.class.major.language_choices.choose || 0;
         }
    } else {
        if (playerStats.class.subclass && playerStats.class.subclass.language_choices) {
            languagesAllowed += playerStats.class.subclass.language_choices.choose || 0;
         }
    }

    if (playerStats.languages) {
        languages = [...new Set([...languages, ...playerStats.languages])];
    }

    return [languagesAllowed, languages.sort()];
}
