// Canonical source mirrors the CONDITIONS labels in
// src/services/combat/conditions/conditionUtils.js (kept inline to avoid adding
// a conditionUtils import to consumers' test-graphs — many suites partial-mock it).
// Exhaustion/Diseased are legacy 5e conditions that still appear inside the mixed
// `immunities` list of older monsters.json statblocks but were dropped from CONDITIONS.
const LEGACY_CONDITION_NAMES = new Set([
    'blinded', 'charmed', 'cursed', 'deafened', 'frightened', 'grappled',
    'incapacitated', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
    'slow', 'stunned', 'unconscious', 'exhaustion', 'diseased',
]);

function hasEntries(list) {
    return Array.isArray(list) && list.length > 0;
}

/**
 * monsters.json stores IRV under two schemas:
 *  - 2024-batch monsters: damage_immunities / damage_resistances / damage_vulnerabilities / condition_immunities
 *  - legacy monsters: immunities / resistances / vulnerabilities, with damage types AND condition
 *    names mixed together inside `immunities` (CLA-207).
 * Resolve either shape into the split lists consumers and the statblock viewer expect.
 * Shared by knowEnemyHandler, encounterToInitiative, initiativeService and MonsterCardBody (CLA-173).
 */
export function resolveMonsterIRV(monsterData) {
    const resistances = hasEntries(monsterData.damage_resistances)
        ? monsterData.damage_resistances
        : (monsterData.resistances || []);
    const vulnerabilities = hasEntries(monsterData.damage_vulnerabilities)
        ? monsterData.damage_vulnerabilities
        : (monsterData.vulnerabilities || []);

    if (hasEntries(monsterData.damage_immunities)) {
        return {
            immunities: monsterData.damage_immunities,
            resistances,
            vulnerabilities,
            conditionImmunities: monsterData.condition_immunities || [],
        };
    }

    const legacyImmunities = monsterData.immunities || [];
    const conditionImmunities = legacyImmunities.filter(v => LEGACY_CONDITION_NAMES.has(String(v).toLowerCase()));
    const immunities = legacyImmunities.filter(v => !LEGACY_CONDITION_NAMES.has(String(v).toLowerCase()));
    if (!hasEntries(conditionImmunities) && hasEntries(monsterData.condition_immunities)) {
        return { immunities, resistances, vulnerabilities, conditionImmunities: monsterData.condition_immunities };
    }
    return { immunities, resistances, vulnerabilities, conditionImmunities };
}
