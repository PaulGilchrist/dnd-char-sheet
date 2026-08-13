export const CAMPAIGN = 'test-campaign';
export const MAP = 'test-map';

export function makeCelestialStats(overrides = {}) {
    return {
        name: 'TestHero',
        proficiency: 3,
        class: { major: { name: 'Celestial Patron' }, subclass: { name: 'Celestial Patron' } },
        specialActions: [
            {
                name: 'Celestial Resilience',
                automation: {
                    tempHpExpression: 'warlock level + CHA modifier',
                    allyTempHpExpression: 'floor(warlock level / 2) + CHA modifier',
                    maxAllies: 5,
                    range: '60_ft',
                },
            },
        ],
        ...overrides,
    };
}

export function makeAction(overrides = {}) {
    return {
        name: 'Celestial Resilience',
        description: 'Gain temporary hit points.',
        automation: {
            type: 'celestial_resilience',
            tempHpExpression: 'warlock level + CHA modifier',
            allyTempHpExpression: 'floor(warlock level / 2) + CHA modifier',
            maxAllies: 5,
            range: '60_ft',
        },
        ...overrides,
    };
}
