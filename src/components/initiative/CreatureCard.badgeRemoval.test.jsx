import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureCard from './CreatureCard.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import * as buffToggle from '../../services/automation/common/buffToggle.js';
import * as automationPassives from '../../services/combat/automation/automationPassives.js';
import * as wildShapeBuilder from '../../services/automation/handlers/class-druid/wildShapeCreatureBuilder.js';
import * as polymorphService from '../../services/automation/handlers/spells/polymorphService.js';
import * as animalShapesService from '../../services/automation/handlers/spells/animalShapesService.js';
import * as shapechangeService from '../../services/automation/handlers/spells/shapechangeService.js';
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

    describe('Hunter\'s Mark badge removal', () => {
        it('should clear concentration on Hunter\'s Mark when remove clicked', () => {
            const allCreatures = [
                { name: 'Ranger', type: 'player', concentration: { spell: "Hunter's Mark", target: 'Alice' } },
                { ...defaultPlayerCreature },
            ];
            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            const allRemoves = Array.from(document.querySelectorAll('.creature-badge-remove'));
            expect(allRemoves.length).toBe(1);
            fireEvent.click(allRemoves[0]);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Ranger', 'concentration', null, 'test-campaign');
        });
    });

    describe('Polymorph badge removal', () => {
        it('should call revertPolymorph when remove clicked', () => {
            const targetEffects = [{ target: 'Alice', effect: 'polymorph' }];
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Polymorph')).toBeInTheDocument();
            const polyBadge = screen.getByText('Polymorph').closest('[class*="creature-badge"]');
            const removeBtn = polyBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(polymorphService.revertPolymorph).toHaveBeenCalledWith('Alice', 'test-campaign');
        });
    });

    describe('Animal Shapes badge removal', () => {
        it('should call revertAnimalShapes when remove clicked', () => {
            const targetEffects = [{ target: 'Alice', effect: 'animal_shapes' }];
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
            const asBadge = screen.getByText('Animal Shapes').closest('[class*="creature-badge"]');
            const removeBtn = asBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(animalShapesService.revertAnimalShapes).toHaveBeenCalledWith('Alice', 'test-campaign');
        });
    });

    describe('Shapechange badge removal', () => {
        it('should call revertShapechange when remove clicked', () => {
            const targetEffects = [{ target: 'Alice', effect: 'shapechange' }];
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Shapechange')).toBeInTheDocument();
            const scBadge = screen.getByText('Shapechange').closest('[class*="creature-badge"]');
            const removeBtn = scBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(shapechangeService.revertShapechange).toHaveBeenCalledWith('Alice', 'test-campaign');
        });
    });

    describe('Death Ward badge removal', () => {
        it('should remove Death Ward buff when remove clicked', () => {
            runtimeState.getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'activeBuffs' && target === 'Alice') {
                    return [{ name: 'Death Ward', effect: 'death_ward', sourceCharacter: 'Bob' }];
                }
                return undefined;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            const dwBadge = screen.getByText('Death Ward').closest('[class*="creature-badge"]');
            const removeBtn = dwBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeBuffs', expect.arrayContaining([]), 'test-campaign');
        });
    });

    describe('Resilient Sphere removal', () => {
        it('should remove resilient_sphere targetEffect when remove clicked', () => {
            automationPassives.isResilientSphereActive.mockReturnValue(true);
            automationPassives.getResilientSphereSource.mockReturnValue('Wizard');
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            const rsBadge = screen.getByText('Resilient Sphere').closest('[class*="creature-badge"]');
            const removeBtn = rsBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([]), 'test-campaign');
            automationPassives.isResilientSphereActive.mockReturnValue(false);
        });
    });

    describe('wild shape removal', () => {
        it('should call cleanupWildShape when Wild Shape remove clicked', () => {
            buffToggle.isBuffActive.mockReturnValue(true);
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={true} />);
            const wsBadge = screen.getByText('Wild Shape').closest('[class*="creature-badge"]');
            const removeBtn = wsBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(wildShapeBuilder.cleanupWildShape).toHaveBeenCalledWith('Alice', 'test-campaign');
        });
    });

    describe('Wrath of the Sea removal', () => {
        beforeEach(() => {
            runtimeState.getRuntimeValue.mockImplementation((target, key, _campaignName) => {
                if (key === 'wrathOfTheSeaActive') return wrathOfTheSeaMocks[target];
                return undefined;
            });
        });

        it('should set wrathOfTheSeaActive to false when remove clicked', () => {
            wrathOfTheSeaMocks = { Alice: true };
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            const wsBadge = screen.getByText('Wrath of the Sea').closest('[class*="creature-badge"]');
            const removeBtn = wsBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'wrathOfTheSeaActive', false, 'test-campaign');
        });
    });

    describe('Sanctuary removal', () => {
        beforeEach(() => {
            runtimeState.getRuntimeValue.mockImplementation((target, key, _campaignName) => {
                if (key === 'naturesSanctuaryActive') return sanctuaryMocks.naturesSanctuaryActive?.[target];
                if (key === 'naturesSanctuaryCreatures') return sanctuaryMocks.naturesSanctuaryCreatures?.[target];
                if (key === 'naturesSanctuaryResistance') return sanctuaryMocks.naturesSanctuaryResistance?.[target];
                return undefined;
            });
        });

        it('should remove creature from sanctuary list when remove clicked', () => {
            sanctuaryMocks.naturesSanctuaryActive = { Druid: true };
            sanctuaryMocks.naturesSanctuaryCreatures = { Druid: ['Alice', 'Bob'] };
            sanctuaryMocks.naturesSanctuaryResistance = { Druid: 'Fire' };

            const allCreatures = [
                { name: 'Druid', type: 'player' },
                { ...defaultPlayerCreature },
            ];

            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            const sanctuaryBadge = screen.getByText('Sanctuary').closest('[class*="creature-badge"]');
            const removeBtn = sanctuaryBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Druid', 'naturesSanctuaryCreatures', ['Bob'], 'test-campaign');
        });
    });

    describe('Reckless Attack removal', () => {
        it('should remove reckless_attack targetEffect when remove clicked', () => {
            const targetEffects = [{ target: 'Alice', effect: 'reckless_attack' }];
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            const raBadge = screen.getByText('Reckless Attack').closest('[class*="creature-badge"]');
            const removeBtn = raBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([]), 'test-campaign');
        });
    });

    describe('Summoned badge removal', () => {
        it('should remove specific summoned targetEffect when remove clicked', () => {
            const targetEffects = [
                { target: 'Goblin', effect: 'summoned', source: 'Alice' },
                { target: 'Goblin', effect: 'summoned', source: 'Bob' },
            ];
            const allCreatures = [
                { name: 'Alice', type: 'player' },
                { name: 'Bob', type: 'player' },
                { ...defaultNpcCreature, name: 'Goblin' },
            ];
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            render(<CreatureCard {...props} creature={allCreatures[2]} allCreatures={allCreatures} campaignName="test-campaign" />);
            // There should be 2 summoned badges with 2 remove buttons
            const allRemoves = Array.from(document.querySelectorAll('.creature-badge-remove'));
            // Click the first remove button (Alice's summon)
            fireEvent.click(allRemoves[0]);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.any(Array), 'test-campaign');
        });
    });
});
