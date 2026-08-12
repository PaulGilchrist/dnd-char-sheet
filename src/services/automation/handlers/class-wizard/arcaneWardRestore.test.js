
import {
    onArcaneWardRestore,
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

describe('onArcaneWardRestore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('restores ward HP based on spell slot level', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 5;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        const result = await onArcaneWardRestore(
            { name: 'Arcane Ward', automation: { type: 'passive_rule' } },
            makeWizardStats('TestWizard', 5, 3),
            2,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 9, campaignName);
        expect(result.payload.description).toContain('restored 4 HP');
    });

    it('caps ward HP at max when restoration would exceed it', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 12;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onArcaneWardRestore(
            { name: 'Arcane Ward', automation: { type: 'passive_rule' } },
            makeWizardStats('TestWizard', 5, 3),
            3,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 13, campaignName);
    });

    it('defaults to spell slot level 1 when value is invalid', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 5;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onArcaneWardRestore(
            { name: 'Arcane Ward', automation: { type: 'passive_rule' } },
            makeWizardStats('TestWizard', 5, 3),
            'invalid',
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 7, campaignName);
    });

    it('defaults to 0 when ward HP is not set', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return undefined;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });

        await onArcaneWardRestore(
            { name: 'Arcane Ward', automation: { type: 'passive_rule' } },
            makeWizardStats('TestWizard', 5, 3),
            1,
            campaignName,
        );

        expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'arcaneWardHp', 2, campaignName);
    });

    it('throws when addEntry rejects', async () => {
        setWardMocks((player, key) => {
            if (key === 'arcaneWardActive') return true;
            if (key === 'arcaneWardHp') return 5;
            if (key === 'arcaneWardMax') return 13;
            return undefined;
        });
        addEntry.mockRejectedValueOnce(new Error('log failure'));

        await expect(
            onArcaneWardRestore(
                { name: 'Arcane Ward', automation: { type: 'passive_rule' } },
                makeWizardStats('TestWizard', 5, 3),
                2,
                campaignName,
            ),
        ).rejects.toThrow('log failure');
    });
});
