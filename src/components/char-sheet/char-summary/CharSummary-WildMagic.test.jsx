import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { useSyncedState } from '../../../hooks/runtime/useSyncedState.js';
import { mockPlayerStats, mockCampaignName } from './CharSummary.test-mocks.test.jsx';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/Popup.jsx', () => ({ default: ({ children, onClick }) => <div data-testid="popup" onClick={onClick}>{children}</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({ default: () => <div data-testid="short-rest-btn">Short Rest</div> }));
vi.mock('../ShortRestModal.jsx', () => ({ default: () => <div data-testid="short-rest-modal">Short Rest Modal</div> }));
vi.mock('./CharConditions.jsx', () => ({ default: () => <div data-testid="char-conditions">Conditions</div> }));

vi.mock('../../../hooks/runtime/useTrackedResource.js', () => ({
    default: vi.fn((key, name, init, _deps, _campaign) => ({ current: init(), update: vi.fn() })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
    useRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    getRuntimeValue: vi.fn(),
    getStore: vi.fn(() => new Map()),
}));

vi.mock('../../../hooks/runtime/useSyncedState.js', () => ({
    useSyncedState: vi.fn((_name, _key, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
    showBackgroundPopup: vi.fn(),
}));

vi.mock('../../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn(), rollInitiative: vi.fn() })),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
    sanitizeHtml: (html) => html,
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
    getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
    },
    getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
}));

vi.mock('../../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: (name) => ({ baseName: name }),
}));

describe('CharSummary - Wild Magic Surge Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders surge effects list when surgeEffects is present', () => {
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') {
                return [
                    [{ timestamp: 1000, roll: 5, effect: 'Fireball', duration: '1 round' }, { timestamp: 2000, roll: 12, effect: 'Healing' }],
                    vi.fn(),
                ];
            }
            if (key === 'smiteOfProtectionActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'bulwarkOfForceActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'naturesSanctuaryActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'bulwarkOfForceTargets') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'naturesSanctuaryCreatures') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'wrathOfTheSeaActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'mantleOfMajestyActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'innerRadianceActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'unbreakableMajestyActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'baitAndSwitchActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'baitAndSwitchBonus') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'activeBuffs') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'coverRefresh') {
                return [defaultValue, vi.fn()];
            }
            return [defaultValue, vi.fn()];
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Surge Effects:/)).toBeInTheDocument();
        expect(screen.getByText(/#5 — Fireball/)).toBeInTheDocument();
        expect(screen.getByText(/#12 — Healing/)).toBeInTheDocument();
        expect(screen.getByTitle('1 round')).toBeInTheDocument();
    });

    it('shows "Tamed" when roll is "tamed"', () => {
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') {
                return [[{ timestamp: 3000, roll: 'tamed', effect: 'Wild Surge' }], vi.fn()];
            }
            if (key === 'smiteOfProtectionActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'bulwarkOfForceActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'naturesSanctuaryActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'bulwarkOfForceTargets') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'naturesSanctuaryCreatures') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'wrathOfTheSeaActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'mantleOfMajestyActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'innerRadianceActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'unbreakableMajestyActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'baitAndSwitchActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'baitAndSwitchBonus') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'activeBuffs') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'coverRefresh') {
                return [defaultValue, vi.fn()];
            }
            return [defaultValue, vi.fn()];
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Tamed/)).toBeInTheDocument();
    });

    it('does not render surge effects when surgeEffects is null', () => {
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') {
                return [null, vi.fn()];
            }
            if (key === 'smiteOfProtectionActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'bulwarkOfForceActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'naturesSanctuaryActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'bulwarkOfForceTargets') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'naturesSanctuaryCreatures') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'wrathOfTheSeaActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'mantleOfMajestyActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'innerRadianceActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'unbreakableMajestyActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'baitAndSwitchActive') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'baitAndSwitchBonus') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'activeBuffs') {
                return [defaultValue, vi.fn()];
            }
            if (key === 'coverRefresh') {
                return [defaultValue, vi.fn()];
            }
            return [defaultValue, vi.fn()];
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Surge Effects:/)).not.toBeInTheDocument();
    });
});
