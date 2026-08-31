// CLA-200 regression — row-activation modal flow at the service level.
// A clickable Special Actions "Inspiring Smite:" row dispatches through the
// REAL executeHandler dispatcher (CharSpecialActions.handleAutomationClick's
// call site) into the REAL inspiringSmiteHandler, which must open the
// InspiringSmiteModal via the 'inspiring-smite-pending' window event when the
// lastAttack gate (Divine Smite by the caster) is live — and show a friendly
// popup otherwise. Previously the row was inert (type missing from
// INTERACTIVE_HANDLER_TYPES) and the auto post-cast trigger was unreachable.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../rules/combat/rangeValidation.js', () => ({
    getDistanceFeet: vi.fn(),
    rangeToFeet: vi.fn(() => 30),
}));

vi.mock('../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../maps/mapsService.js', () => ({
    loadMapData: vi.fn().mockResolvedValue(null),
}));

// Capture CustomEvents dispatched by the handler
const dispatchedEvents = {};
const originalDispatch = window.dispatchEvent.bind(window);
window.dispatchEvent = vi.fn((event) => {
    dispatchedEvents[event.type] = event;
    return originalDispatch(event);
});

// ── Imports ─────────────────────────────────────────────────────

import { executeHandler } from './index.js';
import { isInteractiveAutomation } from '../combat/automation/automationService.js';
import * as useRuntimeState from '../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';
const playerName = 'TestPaladin';

// Exact row entry shape rendered by CharSpecialActions for a subclass major:
// rules-helpers.mergeAutomationSpecialActions wraps the collector info object
// as { name, description, automation: info, hasAutomation } — and the info for
// post_cast_inspiring_smite carries { type, name, range, casting_time } but NO
// nested automation key (CLA-213 shape note).
function makeRowEntry() {
    return {
        name: 'Inspiring Smite',
        description: '…',
        hasAutomation: true,
        automation: {
            type: 'post_cast_inspiring_smite',
            name: 'Inspiring Smite',
            range: '30 ft',
            casting_time: 'passive',
            hasAutomation: true,
        },
    };
}

function makePlayerStats() {
    return {
        name: playerName,
        level: 20,
        automation: { passives: [] },
        class: { class_levels: [{ level: 20, channel_divinity: 3 }] },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    // Clear captured events from previous tests (capture map persists)
    for (const key of Object.keys(dispatchedEvents)) delete dispatchedEvents[key];
    useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'lastAttack') {
            return { attackName: 'Divine Smite', attackerName: playerName };
        }
        if (key === playerName && prop === 'channelDivinityCharges') return 3;
        if (key === playerName && prop === 'selectedAllies') return [playerName, 'AllyOne', 'AllyTwo'];
        return undefined;
    });
});

describe('Inspiring Smite row activation → modal dispatch (CLA-200)', () => {
    it('the row is interactive (passes the CharSpecialActions clickable gate)', () => {
        expect(isInteractiveAutomation(makeRowEntry())).toBe(true);
    });

    it('row click dispatches inspiring-smite-pending with roll, targets and charges', async () => {
        const result = await executeHandler(makeRowEntry(), makePlayerStats(), campaignName, null);

        // Handler dispatches the modal and returns null (the modal consumes the rest)
        expect(result).toBeNull();
        const event = dispatchedEvents['inspiring-smite-pending'];
        expect(event).toBeDefined();
        expect(event.detail.tempHp).toBeGreaterThan(0); // 2d8 + 20 at lv20
        expect(event.detail.roll).toBe('2d8 + 20');
        expect(event.detail.channelDivinityCharges).toBe(3);
        const names = event.detail.creatureTargets.map(t => t.name);
        expect(names).toContain(playerName);
        expect(names).toContain('AllyOne');
        expect(names).toContain('AllyTwo');
    });

    it('row click without a Divine Smite cast shows a friendly popup and opens no modal', async () => {
        useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
            if (key === 'campaign' && prop === 'lastAttack') {
                return { attackName: 'Fire Bolt', attackerName: playerName };
            }
            if (key === playerName && prop === 'channelDivinityCharges') return 3;
            return undefined;
        });

        const result = await executeHandler(makeRowEntry(), makePlayerStats(), campaignName, null);

        expect(result).not.toBeNull();
        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Divine Smite');
        expect(dispatchedEvents['inspiring-smite-pending']).toBeUndefined();
    });

    it('row click with zero Channel Divinity charges shows a popup and opens no modal', async () => {
        useRuntimeState.getRuntimeValue.mockImplementation((key, prop) => {
            if (key === 'campaign' && prop === 'lastAttack') {
                return { attackName: 'Divine Smite', attackerName: playerName };
            }
            if (key === playerName && prop === 'channelDivinityCharges') return 0;
            return undefined;
        });

        const result = await executeHandler(makeRowEntry(), makePlayerStats(), campaignName, null);

        expect(result).not.toBeNull();
        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Channel Divinity');
        expect(dispatchedEvents['inspiring-smite-pending']).toBeUndefined();
    });
});
