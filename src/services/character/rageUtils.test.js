// @improved-by-ai
// @cleaned-by-ai
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

    describe('when ragePoints is depleted (<= 0)', () => {
        it('returns false, shows popup, and does not update runtime state when ragePoints is 0', async () => {
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
            expect(popup.calls).toHaveLength(1);
            expect(popup.calls[0]).toBe('<b>Rage Feature</b><br/>No Rage remaining to restore this feature.');
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('treats null ragePoints as 0 and returns false', async () => {
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
            expect(popup.calls).toHaveLength(1);
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });

        it('treats negative ragePoints as 0 and returns false', async () => {
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
            expect(popup.calls).toHaveLength(1);
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('when ragePoints > 0', () => {
        it('decrements ragePoints by 1 and sets resourceUses to 1', async () => {
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
            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                1,
                'TestBarbarian',
                'ragePoints',
                2,
                'test-campaign'
            );
            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                2,
                'TestBarbarian',
                'ragefeatureUses',
                1,
                'test-campaign'
            );
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

            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                1,
                'TestBarbarian',
                'ragePoints',
                0,
                'test-campaign'
            );
        });

        it('dispatches a combat-summary-updated CustomEvent', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            const popup = makePopupCallback();
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                false,
                popup
            );

            expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
            const eventArg = dispatchSpy.mock.calls[0][0];
            expect(eventArg.type).toBe('combat-summary-updated');
            dispatchSpy.mockRestore();
        });

        it('shows success popup message', async () => {
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
        it('builds rageKey from actionName when auto is false (single word)', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage',
                false,
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                2,
                'TestBarbarian',
                'rageUses',
                1,
                'test-campaign'
            );
        });

        it('builds rageKey from actionName when auto is false (multiple words, spaces collapsed)', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage   Feature   Power',
                false,
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                2,
                'TestBarbarian',
                'ragefeaturepowerUses',
                1,
                'test-campaign'
            );
        });

        it('uses auto.resourceKey when auto is an object with resourceKey', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                { resourceKey: 'customRageUses' },
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                2,
                'TestBarbarian',
                'customRageUses',
                1,
                'test-campaign'
            );
        });

        it('uses auto.resourceKey even when auto is truthy (true)', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(3);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                { resourceKey: 'autoRageUses' },
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                2,
                'TestBarbarian',
                'autoRageUses',
                1,
                'test-campaign'
            );
        });

        it('builds rageKey from actionName when auto is true boolean with no resourceKey', async () => {
            runtimeState.getRuntimeValue.mockReturnValue(2);

            const popup = makePopupCallback();
            await handleRestoreRage(
                makePlayerStats(),
                'test-campaign',
                'Rage Feature',
                true,
                popup
            );

            expect(runtimeState.setRuntimeValue).toHaveBeenNthCalledWith(
                2,
                'TestBarbarian',
                'ragefeatureUses',
                1,
                'test-campaign'
            );
        });
    });
});
