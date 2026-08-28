export function makePlayerStats(overrides = {}) {
    return {
        name: 'FighterRogue',
        proficiency: 3,
        abilities: [{ name: 'CHA', bonus: 4 }],
        ...overrides,
    };
}

export function makeAction(overrides = {}) {
    return {
        name: 'Spell Thief',
        targetName: 'Goblin',
        casterName: 'Goblin',
        spellName: 'Burning Hands',
        automation: {
            type: 'spell_thief',
            saveType: 'INT',
            saveDc: 13,
            ...overrides.automation,
        },
        ...overrides,
    };
}
