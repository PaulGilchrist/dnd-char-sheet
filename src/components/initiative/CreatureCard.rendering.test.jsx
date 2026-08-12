import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureCard from './CreatureCard.jsx';
import * as buffToggle from '../../services/automation/common/buffToggle.js';
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

vi.mock('../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableMajestySaveDc: vi.fn(() => 0),
    clearUnbreakableMajesty: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationPassives.js', () => ({
    isResilientSphereActive: vi.fn(() => false),
    getResilientSphereSource: vi.fn(() => null),
}));

vi.mock('../../services/automation/handlers/class-druid/wildShapeCreatureBuilder.js', () => ({
    cleanupWildShape: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/polymorphService.js', () => ({
    revertPolymorph: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/animalShapesService.js', () => ({
    revertAnimalShapes: vi.fn(),
}));

vi.mock('../../services/automation/handlers/spells/shapechangeService.js', () => ({
    revertShapechange: vi.fn(),
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

    const defaultNpcCreature = {
        name: 'Goblin',
        type: 'npc',
        currentHp: 7,
        maxHp: 7,
        initiative: 10,
        initiativeBonus: 2,
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

    describe('rendering - player creatures', () => {
        it.each`
            currentHp | expectUnconscious
            ${0}      | ${true}
            ${-5}     | ${true}
            ${1}      | ${false}
        `('should $expectUnconscious class when currentHp is $currentHp', ({ currentHp, expectUnconscious }) => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, currentHp }} />);
            const card = document.querySelector('.creature-card');
            if (expectUnconscious) {
                expect(card).toHaveClass('creature-unconscious');
            } else {
                expect(card).not.toHaveClass('creature-unconscious');
            }
        });

        it('should populate target select options from allCreatures excluding self', () => {
            const allCreatures = [
                defaultPlayerCreature,
                { name: 'Bob', type: 'player' },
                { name: 'Charlie', type: 'player' },
            ];
            render(<CreatureCard {...props} allCreatures={allCreatures} />);
            const targetSelect = document.querySelector('.creature-target select');
            expect(targetSelect.querySelector('option[value="Bob"]')).toBeInTheDocument();
            expect(targetSelect.querySelector('option[value="Charlie"]')).toBeInTheDocument();
            expect(targetSelect.querySelector('option[value="Alice"]')).not.toBeInTheDocument();
        });

        it('should include overlay options in target select when overlays exist', () => {
            const overlays = [
                { id: 'overlay1', shape: 'sphere', radiusFt: 15, label: 'Fireball' },
            ];
            render(<CreatureCard {...props} overlays={overlays} />);
            const targetSelect = document.querySelector('.creature-target select');
            expect(targetSelect.querySelector('option[value="overlay-overlay1"]')).toBeInTheDocument();
        });
    });

    describe('rendering - NPC creatures', () => {
        it.each`
            npcName     | campaignNpcName | expectBadge
            ${'Goblin'} | ${'Goblin'}     | ${true}
            ${'Goblin'} | ${'goblin'}     | ${true}
            ${'Goblin'} | ${'Orc'}        | ${false}
        `('should $expectBadge NPC match badge when NPC name is "$npcName" and campaignNpcName is "$campaignNpcName"', ({ npcName, campaignNpcName, expectBadge }) => {
            const creature = { ...defaultNpcCreature, name: npcName };
            const campaignNpcs = [{ name: campaignNpcName }];
            render(<CreatureCard {...props} creature={creature} campaignNpcs={campaignNpcs} />);
            if (expectBadge) {
                expect(screen.getByTestId('npc-match-badge')).toBeInTheDocument();
            } else {
                expect(screen.queryByTestId('npc-match-badge')).not.toBeInTheDocument();
            }
        });
    });

    describe('polymorphObject rendering', () => {
        it('should display polymorphObject type as name when present', () => {
            const creature = {
                ...defaultNpcCreature,
                polymorphObject: { type: 'giant_toad', icon: 'fa-toad' },
            };
            render(<CreatureCard {...props} creature={creature} />);
            expect(screen.getByText('Giant Toad')).toBeInTheDocument();
        });
    });
});
