import { is2024 } from './rules-helpers.js';
import { applyUmbralSightDarkvision, applyThirdEyeDarkvision, applyBlindsightSenses, applyTruesightSenses } from './core/senseUtils.js';

/**
 * Compute senses for a character (ruleset-specific).
 */
export function computeSenses(playerStats, playerSummary) {
    const { raceRules: rr } = getSubModules(playerStats, playerSummary);

    if (is2024(playerStats, playerSummary)) {
        playerStats.senses = rr.getSenses(playerStats);
        // Apply Umbral Sight darkvision enhancement for Gloom Stalkers
        playerStats.senses = applyUmbralSightDarkvision(playerStats, playerStats.senses);
        // Apply The Third Eye darkvision enhancement from active buffs
        playerStats.senses = applyThirdEyeDarkvision(playerStats, playerStats.senses, playerSummary.campaignName);
        // Apply Truesight from passive_buff automation (e.g., Boon of Truesight)
        playerStats.senses = applyTruesightSenses(playerStats, playerStats.senses);
        // Apply Blindsight from passive_buff automation (e.g., Skulker feat in 2024)
        playerStats.senses = applyBlindsightSenses(playerStats, playerStats.senses);
    } else {
        playerStats.immunities = rr.getImmunities(playerSummary);
        playerStats.resistances = rr.getResistances(playerSummary);
        playerStats.senses = rr.getSenses(playerStats);
        // Apply The Third Eye darkvision enhancement from active buffs (5e)
        playerStats.senses = applyThirdEyeDarkvision(playerStats, playerStats.senses, playerSummary.campaignName);
        // Apply Truesight from passive_buff automation (e.g., Boon of Truesight)
        playerStats.senses = applyTruesightSenses(playerStats, playerStats.senses);
        // Apply Blindsight from passive_buff automation (e.g., Skulker feat in 2024)
        playerStats.senses = applyBlindsightSenses(playerStats, playerStats.senses);
    }
}

// Re-export needed function
import { getSubModules } from './rules-core.js';
