import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRestoreRage } from './rageUtils.js';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

const makePlayerStats = (overrides = {}) => ({
    name: 'TestBarbarian',
    ...overrides,
});

const makePopupCallback = () => {
    const calls = [];
    const cb = (html) => calls.push(html);
    cb.calls = calls;
    return cb;
};

describe('handleRestoreRage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rage points === 0 (no rage remaining)', () => {
        it('returns false and shows popup when ragePoints is 0', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const popup = makePopupCallback();
            const result = await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(result).toBe(false);
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
            expect(popup.calls).toHaveLength(1);
            expect(popup.calls[0]).toBe('<b>Rage Feature</b><br/>No Rage remaining to restore this feature.');
        });

        it('returns false and shows popup when ragePoints is null (defaults to 0)', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(null);

            const popup = makePopupCallback();
            const result = await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(result).toBe(false);
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
            expect(popup.calls).toHaveLength(1);
        });

        it('returns false and shows popup when ragePoints is negative', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(-1);

            const popup = makePopupCallback();
            const result = await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(result).toBe(false);
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('rage points > 0 (rage available)', () => {
        it('returns true and decrements ragePoints by 1', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const popup = makePopupCallback();
            const result = await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(result).toBe(true);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'ragePoints',
                2,
                'test-campaign'
            );
        });

        it('sets the resourceUses key to 1 when auto is false', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            // actionName is 'Rage Feature' -> key is 'ragefeatureUses'
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'ragefeatureUses',
                1,
                'test-campaign'
            );
        });

        it('uses auto.resourceKey when provided', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                { resourceKey: 'customRageUses' },
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'customRageUses',
                1,
                'test-campaign'
            );
        });

        it('uses auto.resourceKey even when auto is true', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                { resourceKey: 'autoRageUses' },
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'autoRageUses',
                1,
                'test-campaign'
            );
        });

        it('dispatches combat-summary-updated event', async () => {
            const popup = makePopupCallback();
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'combat-summary-updated' }));
            dispatchSpy.mockRestore();
        });

        it('sets ragePoints to 0 when current is 1', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(1);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'ragePoints',
                0,
                'test-campaign'
            );
        });

        it('calls setPopupHtml with success message', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(5);

            const popupCalls = [];
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                (html) => popupCalls.push(html)
            );

            expect(popupCalls).toHaveLength(1);
            expect(popupCalls[0]).toBe('<b>Rage Feature</b><br/>Expended 1 Rage to restore use.');
        });
    });

    describe('rageKey construction', () => {
        it('builds rageKey from actionName with spaces removed for single word', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage',
                false,
                popup
            );

            // 'Rage'.toLowerCase().replace(/\s+/g, '') + 'Uses' = 'rageUses'
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'rageUses',
                1,
                'test-campaign'
            );
        });

        it('builds rageKey from actionName with multiple spaces', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage   Feature   Power',
                false,
                popup
            );

            // 'Rage   Feature   Power'.toLowerCase().replace(/\s+/g, '') + 'Uses' = 'ragefeaturepowerUses'
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestBarbarian',
                'ragefeaturepowerUses',
                1,
                'test-campaign'
            );
        });
    });

    describe('setPopupHtml for no rage', () => {
        it('calls setPopupHtml with no rage message', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(0);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(popup.calls).toHaveLength(1);
            expect(popup.calls[0]).toBe('<b>Rage Feature</b><br/>No Rage remaining to restore this feature.');
        });
    });
});
