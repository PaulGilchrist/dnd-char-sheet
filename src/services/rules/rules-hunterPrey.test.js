import { describe, it, expect } from 'vitest';
import { addHunterPreyAttack } from './rules-hunterPrey.js';

function createStats(overrides = {}) {
    return {
        name: 'TestRanger',
        abilities: [
            { name: 'Strength', bonus: 1 },
            { name: 'Dexterity', bonus: 3 },
        ],
        proficiency: 3,
        attacks: [],
        automation: {
            passives: [{ type: 'hunter_prey', name: "Hunter's Prey" }],
        },
        ...overrides,
    };
}

describe('addHunterPreyAttack', () => {
    it('adds a Horde Breaker bonus action marker for a Hunter with the hunter_prey passive', () => {
        const stats = createStats();
        addHunterPreyAttack(stats);
        const hb = stats.attacks.find(a => a.isHordeBreaker);
        expect(hb).toBeDefined();
        expect(hb.name).toBe('Horde Breaker');
        expect(hb.type).toBe('Bonus Action');
        expect(hb.weaponType).toBe('melee');
        expect(hb.hitBonus).toBe(6);
    });

    it('does not require Extra Attack — level 3 Hunters get the marker too', () => {
        const stats = createStats({ level: 3 });
        expect(() => addHunterPreyAttack(stats)).not.toThrow();
        expect(stats.attacks.some(a => a.isHordeBreaker)).toBe(true);
    });

    it('adds nothing when the Hunter\'s Prey passive is missing', () => {
        const stats = createStats({ automation: { passives: [] } });
        addHunterPreyAttack(stats);
        expect(stats.attacks.some(a => a.isHordeBreaker)).toBe(false);
    });

    it('throws when passives is not an array', () => {
        const stats = createStats({ automation: { passives: 'nope' } });
        expect(() => addHunterPreyAttack(stats)).toThrow('Missing array: passives for TestRanger');
    });
});
