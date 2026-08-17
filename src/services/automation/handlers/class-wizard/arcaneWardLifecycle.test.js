// @improved-by-ai
import {
    onArcaneWardDestroy,
    onArcaneWardLevelUp,
    onAbjurationSpellCast,
} from './arcaneWardHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

const campaignName = 'test-campaign';

function makeWizardStats(name, level, intBonus) {
    return {
        name,
        rules: '2024',
        level,
        abilities: [{ name: 'Intelligence', bonus: intBonus }],
    };
}

function setWardMocks(getRuntimeValueImpl) {
    getRuntimeValue.mockImplementation(getRuntimeValueImpl);
}

describe('onArcaneWardDestroy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sets ward active to false, HP and max to 0', async () => {
        const result = await onArcaneWardDestroy(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledTimes(3);
        expect(setRuntimeValue).toHaveBeenNthCalledWith(
            1,
            'TestWizard',
            'arcaneWardActive',
            false,
            campaignName,
        );
        expect(setRuntimeValue).toHaveBeenNthCalledWith(
            2,
            'TestWizard',
            'arcaneWardHp',
            0,
            campaignName,
        );
        expect(setRuntimeValue).toHaveBeenNthCalledWith(
            3,
            'TestWizard',
            'arcaneWardMax',
            0,
            campaignName,
        );
        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('destroyed');
        expect(result.payload.description).toContain('Long Rest');
    });

    it('makes exactly 3 setRuntimeValue calls and no addEntry calls', async () => {
        await onArcaneWardDestroy(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledTimes(3);
        expect(addEntry).not.toHaveBeenCalled();
    });
});

describe('onArcaneWardLevelUp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('computes correct max HP: 2 x level + INT modifier', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 10;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        // 2*5 + 3 = 13
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 13, campaignName);
    });

    it('scales current HP proportionally when max increases', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 10;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        const level6Stats = makeWizardStats('TestWizard', 6, 3);

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            level6Stats,
            campaignName,
        );

        // prevMax=13, newMax=15, ratio=15/13, newHp=round(10*15/13)=round(11.54)=12
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 15, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 12, campaignName);
    });

    it('does not change current HP when max did not increase', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 10;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 13, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 10, campaignName);
    });

    it('caps scaled HP at new max', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 12;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        const level6Stats = makeWizardStats('TestWizard', 6, 3);

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            level6Stats,
            campaignName,
        );

        // ratio=15/13, newHp=round(12*15/13)=round(13.85)=14, capped at 15
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 14, campaignName);
    });

    it('returns info popup when ward is not active', async () => {
        setWardMocks(() => false);

        const result = await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('not active');
    });

    it('handles missing Intelligence ability by using 0 modifier', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 5;
            if (key === 'arcaneWardMax') return 10;
            return undefined;
        });

        const noAbilitiesStats = {
            name: 'TestWizard',
            rules: '2024',
            level: 5,
            abilities: [],
        };

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            noAbilitiesStats,
            campaignName,
        );

        // 2*5 + 0 = 10
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 10, campaignName);
    });

    it('handles missing abilities array by using 0 modifier', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 5;
            if (key === 'arcaneWardMax') return 10;
            return undefined;
        });

        const noAbilitiesStats = {
            name: 'TestWizard',
            rules: '2024',
            level: 5,
        };

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            noAbilitiesStats,
            campaignName,
        );

        // 2*5 + 0 = 10
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 10, campaignName);
    });

    it('sets current HP to round of scaled value when prevMax is 0', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return undefined;
            if (key === 'arcaneWardMax') return 0;
            return undefined;
        });

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        // prevMaxHp=0, so no scaling happens; currentHp defaults to 0 via ?? 0
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 13, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 0, campaignName);
    });

    it('sets current HP to 0 when both current and max are undefined', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return undefined;
            if (key === 'arcaneWardMax') return undefined;
            return undefined;
        });

        await onArcaneWardLevelUp(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 13, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 0, campaignName);
    });
});

describe('onAbjurationSpellCast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a new ward when one is not active', async () => {
        setWardMocks(() => false);

        const result = await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Shield',
            1,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledTimes(3);
        expect(setRuntimeValue).toHaveBeenNthCalledWith(
            1,
            'TestWizard',
            'arcaneWardActive',
            true,
            campaignName,
        );
        expect(setRuntimeValue).toHaveBeenNthCalledWith(
            2,
            'TestWizard',
            'arcaneWardMax',
            13,
            campaignName,
        );
        expect(setRuntimeValue).toHaveBeenNthCalledWith(
            3,
            'TestWizard',
            'arcaneWardHp',
            13,
            campaignName,
        );
        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('created');
        expect(result.payload.description).toContain('Shield');
    });

    it('creates ward with correct max HP for different wizard levels', async () => {
        setWardMocks(() => false);

        const level10Stats = makeWizardStats('TestWizard', 10, 4);

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            level10Stats,
            'Mage Armor',
            1,
            campaignName,
        );

        // 2*10 + 4 = 24
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 24, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 24, campaignName);
    });

    it('restores ward HP when ward is already active', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 8;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        const result = await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Mage Armor',
            1,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 10, campaignName);
        expect(result.payload.description).toContain('restored 2 HP');
    });

    it('restores more HP with a higher spell slot level', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 8;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        const result = await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Mage Armor',
            3,
            campaignName,
        );

        // 8 + (3*2) = 14, capped at 13
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 13, campaignName);
        expect(result.payload.description).toContain('restored 6 HP');
    });

    it('caps restored HP at max when already active', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 12;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Mage Armor',
            3,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 13, campaignName);
    });

    it('defaults to spell slot level 1 when value is invalid', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 8;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Shield',
            'invalid',
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 10, campaignName);
    });

    it('defaults to spell slot level 1 when value is undefined', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 8;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Shield',
            undefined,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 10, campaignName);
    });

    it('throws when addEntry rejects during ward creation', async () => {
        setWardMocks(() => false);
        addEntry.mockRejectedValueOnce(new Error('log failure'));

        await expect(
            onAbjurationSpellCast(
                { name: 'Arcane Ward' },
                makeWizardStats('TestWizard', 5, 3),
                'Shield',
                1,
                campaignName,
            ),
        ).rejects.toThrow('log failure');
    });

    it('throws when addEntry rejects during ward restoration', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 8;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });
        addEntry.mockRejectedValueOnce(new Error('log failure'));

        await expect(
            onAbjurationSpellCast(
                { name: 'Arcane Ward' },
                makeWizardStats('TestWizard', 5, 3),
                'Mage Armor',
                1,
                campaignName,
            ),
        ).rejects.toThrow('log failure');
    });

    it('logs ward creation via addEntry', async () => {
        setWardMocks(() => false);

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Shield',
            1,
            campaignName,
        );

        expect(addEntry).toHaveBeenCalledTimes(1);
        expect(addEntry).toHaveBeenCalledWith(
            campaignName,
            expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestWizard',
                abilityName: 'Arcane Ward',
                description: expect.stringContaining('Shield'),
            }),
        );
    });

    it('logs ward restoration via addEntry', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 8;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            makeWizardStats('TestWizard', 5, 3),
            'Mage Armor',
            1,
            campaignName,
        );

        expect(addEntry).toHaveBeenCalledTimes(1);
        expect(addEntry).toHaveBeenCalledWith(
            campaignName,
            expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestWizard',
                abilityName: 'Arcane Ward',
                description: expect.stringContaining('restored'),
            }),
        );
    });

    it('handles missing Intelligence ability when creating a new ward', async () => {
        setWardMocks(() => false);

        const noAbilitiesStats = {
            name: 'TestWizard',
            rules: '2024',
            level: 5,
        };

        await onAbjurationSpellCast(
            { name: 'Arcane Ward' },
            noAbilitiesStats,
            'Shield',
            1,
            campaignName,
        );

        // 2*5 + 0 = 10
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardMax', 10, campaignName);
        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 10, campaignName);
    });
});
