import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useBattleMasterSelectionVersion,
    battleMasterSelectionSerial,
    isBattleMaster,
    SELECTION_KEY,
} from './battleMaster.js';
import { setRuntimeValue } from '../runtime/useRuntimeState.js';

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));

const battleMaster = { name: 'BM', class: { name: 'Fighter', subclass: { name: 'Battle Master' } } };
const nonFighter = { name: 'Wizard', class: { name: 'Wizard', subclass: { name: 'Divination' } } };

describe('isBattleMaster', () => {
    it('detects Battle Master subclass', () => {
        expect(isBattleMaster(battleMaster)).toBe(true);
    });

    it('rejects non-Battle Master characters', () => {
        expect(isBattleMaster(nonFighter)).toBe(false);
        expect(isBattleMaster({ name: 'X' })).toBe(false);
        expect(isBattleMaster(undefined)).toBe(false);
    });
});

describe('battleMasterSelectionSerial', () => {
    beforeEach(() => {
        setRuntimeValue('BM', SELECTION_KEY, [], 'test-campaign');
        setRuntimeValue('Wizard', SELECTION_KEY, ['Trip Attack'], 'test-campaign');
    });

    it('includes Battle Master selections', () => {
        setRuntimeValue('BM', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        expect(battleMasterSelectionSerial([battleMaster], 'test-campaign')).toBe('BM:["Evasive Footwork"]');
    });

    it('ignores non-Battle Master characters', () => {
        expect(battleMasterSelectionSerial([nonFighter], 'test-campaign')).toBe('');
    });

    it('is stable for identical selections', () => {
        setRuntimeValue('BM', SELECTION_KEY, ['Evasive Footwork', 'Rally'], 'test-campaign');
        expect(battleMasterSelectionSerial([battleMaster], 'test-campaign'))
            .toBe(battleMasterSelectionSerial([battleMaster], 'test-campaign'));
    });
});

describe('useBattleMasterSelectionVersion', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('bumps version when the runtime selection changes', () => {
        setRuntimeValue('BM', SELECTION_KEY, [], 'test-campaign');
        const { result } = renderHook(() => useBattleMasterSelectionVersion([battleMaster], 'test-campaign'));
        const initial = result.current;

        act(() => {
            setRuntimeValue('BM', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        });

        expect(result.current).toBe(initial + 1);
    });

    it('does not bump version when other store keys change', () => {
        setRuntimeValue('BM', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        const { result } = renderHook(() => useBattleMasterSelectionVersion([battleMaster], 'test-campaign'));
        const initial = result.current;

        act(() => {
            setRuntimeValue('BM', 'superiorityDice', 3, 'test-campaign');
        });

        expect(result.current).toBe(initial);
    });

    it('does not bump version when selection is re-set to the same value', () => {
        setRuntimeValue('BM', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        const { result } = renderHook(() => useBattleMasterSelectionVersion([battleMaster], 'test-campaign'));
        const initial = result.current;

        act(() => {
            setRuntimeValue('BM', SELECTION_KEY, ['Evasive Footwork'], 'test-campaign');
        });

        expect(result.current).toBe(initial);
    });

    it('subscribes to multiple Battle Masters', () => {
        const second = { name: 'BM2', class: { name: 'Fighter', subclass: { name: 'Battle Master' } } };
        const { result } = renderHook(() => useBattleMasterSelectionVersion([battleMaster, second], 'test-campaign'));
        const initial = result.current;

        act(() => {
            setRuntimeValue('BM2', SELECTION_KEY, ['Rally'], 'test-campaign');
        });

        expect(result.current).toBeGreaterThan(initial);
    });

    it('returns constant version when no Battle Masters present', () => {
        const { result } = renderHook(() => useBattleMasterSelectionVersion([nonFighter], 'test-campaign'));
        const initial = result.current;

        act(() => {
            setRuntimeValue('Wizard', SELECTION_KEY, ['Trip Attack'], 'test-campaign');
        });

        expect(result.current).toBe(initial);
    });
});
