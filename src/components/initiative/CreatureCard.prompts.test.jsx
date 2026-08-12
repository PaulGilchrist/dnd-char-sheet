import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureCard from './CreatureCard.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import * as buffToggle from '../../services/automation/common/buffToggle.js';
import * as savePromptService from '../../services/combat/conditions/savePromptService.js';
vi.mock('../common/AvatarImage.jsx', () => ({
    default: vi.fn(({ name, imagePath }) => {
        return <div data-testid={`avatar-${name}`} className="avatar-wrapper">{imagePath ? <img src={imagePath} alt={name} /> : <span>{name?.charAt(0).toUpperCase() || '?'}</span>}</div>;
    }),
}));

vi.mock('../common/MonsterNameAutocomplete.jsx', () => ({
    default: vi.fn(({ value, onChange, showBadge }) => {
        return <div data-testid="monster-autocomplete"><input data-testid="monster-name-input" value={value} onChange={(e) => onChange(e.target.value)} />{showBadge && <span data-testid="npc-match-badge">NPC Match</span>}</div>;
    }),
}));

vi.mock('./NpcAvatar.jsx', () => ({
    default: vi.fn(({ name, imageUrl, imagePath, onClick }) => {
        const src = imagePath || imageUrl;
        return <div data-testid={`npc-avatar-${name}`} className="npc-avatar" onClick={onClick}>{src ? <img src={src} alt={name} /> : <span>{name?.charAt(0).toUpperCase() || '?'}</span>}</div>;
    }),
}));

vi.mock('./CreatureHp.jsx', () => ({
    default: vi.fn(({ creature, isLocalhost, onChange }) => {
        return <div data-testid={`creature-hp-${creature.name}`} className="creature-hp"><input data-testid={`hp-input-${creature.name}`} type="number" defaultValue={creature.currentHp ?? 0} onBlur={(e) => onChange(creature.name, parseInt(e.target.value) || 0)} disabled={!isLocalhost && creature.type === 'player'} /><span>{creature.currentHp ?? 0}/{creature.maxHp ?? 1}</span></div>;
    }),
}));

vi.mock('./ConditionEffectBadges.jsx', () => ({
    default: vi.fn(({ conditions, targetEffects, creatureName }) => {
        const children = [];
        (conditions || []).forEach(c => children.push(<span key={c.id} data-testid={`effect-condition-${c.id}`}>{c.label}</span>));
        (targetEffects || []).forEach(te => children.push(<span key={te.id} data-testid={`effect-target-${te.id}`}>{te.effect}</span>));
        return <div data-testid={`condition-effects-${creatureName}`}>{children}</div>;
    }),
}));

vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
    getAbilityLabel: (ability) => ability?.toUpperCase() || '',
}));

vi.mock('../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  useRuntimeValue: vi.fn((_campaignName, key) => {
      if (key === 'targetEffects') return [];
      return null;
  }),
  getRuntimeValue: vi.fn((target, key, _campaignName) => {
      if (key === 'naturesSanctuaryActive') return sanctuaryMocks.naturesSanctuaryActive?.[target];
      if (key === 'naturesSanctuaryCreatures') return sanctuaryMocks.naturesSanctuaryCreatures?.[target];
      if (key === 'naturesSanctuaryResistance') return sanctuaryMocks.naturesSanctuaryResistance?.[target];
      if (key === 'wrathOfTheSeaActive') return wrathOfTheSeaMocks[target];
      if (key === 'concentration') return { spell: "Hunter's Mark" };
      if (key === 'targetEffects') return runtimeTargetEffects;
      if (key === 'activeBuffs') return runtimeActiveBuffs?.[target];
      return undefined;
  }),
  setRuntimeValue: vi.fn(),
  listeners: new Map(),
}));

let sanctuaryMocks = {};
let wrathOfTheSeaMocks = {};
let runtimeTargetEffects = [];
let runtimeActiveBuffs = {};

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
    sendFleshToStoneResult: vi.fn(),
    sendPrismaticSprayIndigoResult: vi.fn(),
    sendPrismaticSprayVioletResult: vi.fn(),
}));

describe('CreatureCard', () => {
    let props;

    const defaultPlayerCreature = {
        name: 'Alice',
        type: 'player',
        currentHp: 20,
        maxHp: 20,
        initiative: 14,
        targetName: '',
        conditions: [],
        concentration: null,
    };

    beforeEach(() => {
        props = {
            creature: defaultPlayerCreature,
            isActive: false,
            isLocalhost: true,
            campaignNpcs: [],
            overlays: [],
            allCreatures: [defaultPlayerCreature],
            campaignName: 'test-campaign',
            onRemoveNpc: vi.fn(),
            onNpcClick: vi.fn(),
            onNameChange: vi.fn(),
            onHpChange: vi.fn(),
            onInitiativeChange: vi.fn(),
            onTargetChange: vi.fn(),
            onRollConditionSave: vi.fn(),
            onBreakCondition: vi.fn(),
            onOpenEffectAdder: vi.fn(),
            onRollConcentrationSave: vi.fn(),
            onBreakConcentration: vi.fn(),
        };
        wrathOfTheSeaMocks = {};
        sanctuaryMocks = {};
        runtimeTargetEffects = [];
        runtimeActiveBuffs = {};
        buffToggle.isBuffActive.mockReturnValue(false);
    });

    describe('Flesh to Stone prompt', () => {
        beforeEach(() => {
            runtimeState.useRuntimeValue.mockImplementation((campaignName, key) => {
                if (key === 'targetEffects') return [];
                if (key === '_fleshToStone_Alice') return { successes: 1, failures: 1 };
                return null;
            });
        });

        it('should render flesh to stone prompt when data exists for localhost', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            expect(screen.getByText('Flesh to Stone')).toBeInTheDocument();
            expect(screen.getByText('Saves: 1/3 | Failures: 1/3')).toBeInTheDocument();
        });

        it('should not render flesh to stone prompt for non-localhost', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.queryByText('Flesh to Stone')).not.toBeInTheDocument();
        });

        it('should call sendFleshToStoneResult with success when success button clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const fleshToStonePrompt = screen.getByText('Flesh to Stone').closest('.flesh-to-stone-prompt');
            fireEvent.click(fleshToStonePrompt.querySelector('.flesh-to-stone-btn.success'));
            expect(savePromptService.sendFleshToStoneResult).toHaveBeenCalledWith('test-campaign', 'Alice', { success: true });
        });

        it('should call sendFleshToStoneResult with failure when failure button clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const fleshToStonePrompt = screen.getByText('Flesh to Stone').closest('.flesh-to-stone-prompt');
            fireEvent.click(fleshToStonePrompt.querySelector('.flesh-to-stone-btn.failure'));
            expect(savePromptService.sendFleshToStoneResult).toHaveBeenCalledWith('test-campaign', 'Alice', { success: false });
        });
    });

    describe('Prismatic Spray prompts', () => {
        beforeEach(() => {
            runtimeState.useRuntimeValue.mockImplementation((campaignName, key) => {
                if (key === 'targetEffects') return [];
                if (key === '_prismaticSprayIndigo_Alice') return { successes: 2, failures: 0 };
                if (key === '_prismaticSprayViolet_Alice') return { successes: 0, failures: 0 };
                return null;
            });
        });

        it('should render prismatic spray indigo prompt when data exists', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            expect(screen.getByText('Prismatic Spray (Indigo)')).toBeInTheDocument();
            expect(screen.getByText('CON Saves: 2/3 | Failures: 0/3')).toBeInTheDocument();
        });

        it('should render prismatic spray violet prompt when data exists', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            expect(screen.getByText('Prismatic Spray (Violet)')).toBeInTheDocument();
            expect(screen.getByText('WIS Save (caster\'s next turn)')).toBeInTheDocument();
        });

        it('should not render prismatic prompts for non-localhost', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.queryByText('Prismatic Spray (Indigo)')).not.toBeInTheDocument();
            expect(screen.queryByText('Prismatic Spray (Violet)')).not.toBeInTheDocument();
        });

        it('should call sendPrismaticSprayIndigoResult with success when success button clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const indigoSection = screen.getByText('Prismatic Spray (Indigo)').closest('.flesh-to-stone-prompt');
            fireEvent.click(indigoSection.querySelector('.flesh-to-stone-btn.success'));
            expect(savePromptService.sendPrismaticSprayIndigoResult).toHaveBeenCalledWith('test-campaign', 'Alice', { success: true });
        });

        it('should call sendPrismaticSprayVioletResult with success when success button clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const violetSection = screen.getByText('Prismatic Spray (Violet)').closest('.flesh-to-stone-prompt');
            fireEvent.click(violetSection.querySelector('.flesh-to-stone-btn.success'));
            expect(savePromptService.sendPrismaticSprayVioletResult).toHaveBeenCalledWith('test-campaign', 'Alice', { success: true });
        });

        it('should call sendPrismaticSprayIndigoResult with failure when failure button clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const indigoSection = screen.getByText('Prismatic Spray (Indigo)').closest('.flesh-to-stone-prompt');
            fireEvent.click(indigoSection.querySelector('.flesh-to-stone-btn.failure'));
            expect(savePromptService.sendPrismaticSprayIndigoResult).toHaveBeenCalledWith('test-campaign', 'Alice', { success: false });
        });

        it('should call sendPrismaticSprayVioletResult with failure when failure button clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const violetSection = screen.getByText('Prismatic Spray (Violet)').closest('.flesh-to-stone-prompt');
            fireEvent.click(violetSection.querySelector('.flesh-to-stone-btn.failure'));
            expect(savePromptService.sendPrismaticSprayVioletResult).toHaveBeenCalledWith('test-campaign', 'Alice', { success: false });
        });
    });
});
