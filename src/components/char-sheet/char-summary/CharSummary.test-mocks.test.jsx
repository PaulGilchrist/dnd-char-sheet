// @improved-by-ai
//
// Shared mock data for CharSummary component tests.
// All test files should import from this module rather than duplicating
// the mockPlayerStats object. Extend with spread syntax for test-specific overrides:
//   { ...mockPlayerStats, feats: [{ name: 'Test' }] }
//
// Fields added in this improvement:
//   - feats (feat popup tests)
//   - toolProficiencies (proficiencies display tests)
//   - dexterity ability bonus (many tests add it manually)
//   - rules (ruleset selection tests)
//   - automationConditionalImmunities (rage/feign death tests)
//   - wrathOfTheSeaActive (wrath of the sea badge tests)

const mockPlayerStats = {
    name: 'Thorin',
    xp: 2300,
    xpMode: 'milestone',
    rules: '5e',
    race: { name: 'Dwarf', type: 'Hill Dwarf', subrace: { name: 'Hill Dwarf', speed: 25 } },
    class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, major: { name: 'Cleric' } },
    level: 5,
    alignment: 'Lawful Good',
    proficiency: 3,
    initiative: 2,
    initiativeAdvantage: false,
    abilities: [
        { name: 'Wisdom', bonus: 3 },
        { name: 'Strength', bonus: 2 },
        { name: 'Dexterity', bonus: 2 },
    ],
    armorClass: 18,
    armorClassFormula: '16 + 2 (shield)',
    hitPoints: 45,
    inventory: { equipped: ['Scale Mail', 'Shield'] },
    equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }, { name: 'Shield', type: 'Shield' }],
    background: 'Soldier',
    immunities: [],
    resistances: [],
    vulnerabilities: [],
    senses: [],
    proficiencies: [],
    toolProficiencies: [],
    languages: [],
    automation: { passives: [], actions: [] },
    automationConditionalImmunities: [],
    passives: [],
    exhaustionLevel: 0,
    feats: [],
    wrathOfTheSeaActive: false,
};

const mockCampaignName = 'test-campaign';

export { mockPlayerStats, mockCampaignName };
