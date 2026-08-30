import { describe, it, expect } from 'vitest';
import { selectBrutalStrikeRiders } from './brutalStrikeSelection.js';

const lv9Rider = {
    type: 'attack_rider',
    name: 'Brutal Strike',
    featureLevel: 9,
    damageExpression: '1d10',
    trigger: 'strength_attack_hit_after_reckless',
    options: [
        { name: 'Forceful Blow', effect: 'push_15ft' },
        { name: 'Hamstring Blow', effect: 'speed_reduction', value: '15_ft_until_start_of_next_turn' },
    ],
};

const lv13Rider = {
    type: 'attack_rider',
    name: 'Improved Brutal Strike',
    featureLevel: 13,
    damageExpression: '1d10',
    trigger: 'strength_attack_hit_after_reckless',
    options: [
        { name: 'Forceful Blow', effect: 'push_15ft' },
        { name: 'Hamstring Blow', effect: 'speed_reduction', value: '15_ft_until_start_of_next_turn' },
        { name: 'Staggering Blow', effect: 'disadvantage_on_next_save', noOpportunityAttacks: true },
        { name: 'Sundering Blow', effect: 'next_attack_bonus', value: 5 },
    ],
};

const lv17Rider = {
    type: 'attack_rider',
    name: 'Brutal Strike (Level 17)',
    featureLevel: 17,
    damageExpression: '2d10',
    trigger: 'strength_attack_hit_after_reckless',
    maxEffects: 2,
    options: lv13Rider.options,
};

describe('selectBrutalStrikeRiders', () => {
    it('tie on dice count is broken by higher feature level (CLA-182)', () => {
        const riders = selectBrutalStrikeRiders([lv9Rider, lv13Rider]);
        expect(riders[0].name).toBe('Improved Brutal Strike');
        expect(riders[0].options.map(o => o.name)).toEqual([
            'Forceful Blow', 'Hamstring Blow', 'Staggering Blow', 'Sundering Blow',
        ]);
    });

    it('selects improved rider even when lv9 rider is collected after lv13 rider', () => {
        const riders = selectBrutalStrikeRiders([lv13Rider, lv9Rider]);
        expect(riders[0].name).toBe('Improved Brutal Strike');
    });

    it('higher dice count still wins over higher feature level', () => {
        const riders = selectBrutalStrikeRiders([lv13Rider, lv17Rider]);
        expect(riders[0].name).toBe('Brutal Strike (Level 17)');
        expect(riders[0].maxEffects).toBe(2);
    });

    it('filters out non-matching entries', () => {
        const riders = selectBrutalStrikeRiders([
            { type: 'attack_rider', name: 'Other', damageExpression: '1d10', trigger: 'hit' },
            { type: 'damage_bonus', name: 'Bonus', damageExpression: '1d10', trigger: 'strength_attack_hit_after_reckless' },
            { type: 'attack_rider', name: 'NoDice', trigger: 'strength_attack_hit_after_reckless' },
            lv9Rider,
        ]);
        expect(riders).toHaveLength(1);
        expect(riders[0].name).toBe('Brutal Strike');
    });

    it('returns empty array for missing or empty input', () => {
        expect(selectBrutalStrikeRiders(undefined)).toEqual([]);
        expect(selectBrutalStrikeRiders([])).toEqual([]);
    });
});
