// Resolves the real D&D creature type from a combatSummary creature.
// EB-joined monsters carry type:'npc' with the real type in monsterType (CLA-173/SP-094);
// PCs carry type:'pc' with no monsterType, so they fall through unchanged.
export function resolveCreatureType(creature) {
    if (!creature) return undefined;
    return creature.monsterType || creature.type;
}
