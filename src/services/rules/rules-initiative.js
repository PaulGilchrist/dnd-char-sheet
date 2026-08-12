import { evaluateAutoExpression } from '../combat/automation/automationService.js';

/**
 * Compute initiative for a character.
 */
export function computeInitiative(playerStats) {
    const dexAbility = playerStats.abilities.find((ability) => ability.name === 'Dexterity');
    playerStats.initiative = dexAbility.bonus;

    // Add Dread Ambush initiative bonus (WIS modifier) for Gloom Stalkers
    const dreadAmbushPassive = (playerStats.automation?.passives ?? []).find(
        p => p.type === 'passive_rule' && p.effect === 'dread_ambush_initiative'
    );
    if (dreadAmbushPassive) {
        const wisAbility = playerStats.abilities.find((ability) => ability.name === 'Wisdom');
        playerStats.initiative += (wisAbility?.bonus || 0);
    }

    // Add initiative_bonus from passive_buff (e.g., Alert feat)
    const initiativeBonusPassives = (playerStats.automation?.passives ?? []).filter(
        p => p.type === 'passive_buff' && p.effect === 'initiative_bonus'
    );
    for (const passive of initiativeBonusPassives) {
        const bonus = evaluateAutoExpression(passive.bonusExpression || '0', playerStats);
        if (typeof bonus === 'number' && !isNaN(bonus)) {
            playerStats.initiative += bonus;
        }
    }
    playerStats.initiativeAdvantage = (playerStats.automation?.passives ?? []).some(
        p => p.type === 'passive_rule' && p.effect === 'initiative_advantage'
    );

    // Alert: can't be surprised while conscious
    playerStats.noSurprise = (playerStats.automation?.passives ?? []).some(
        p => p.type === 'passive_buff' && p.effect === 'no_surprise'
    );

    // Alert: unseen attackers don't gain advantage on attacks against you
    playerStats.unseenAttackerAdvantageNegate = (playerStats.automation?.passives ?? []).some(
        p => p.type === 'passive_buff' && p.effect === 'unseen_attacker_advantage_negate'
    );
}
