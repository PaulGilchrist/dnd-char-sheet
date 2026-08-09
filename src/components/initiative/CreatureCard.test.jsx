import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureCard from './CreatureCard.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import * as buffToggle from '../../services/automation/common/buffToggle.js';
import * as savePromptService from '../../services/combat/conditions/savePromptService.js';
import * as automationPassives from '../../services/combat/automation/automationPassives.js';
import * as wildShapeBuilder from '../../services/automation/handlers/class-druid/wildShapeCreatureBuilder.js';
import * as polymorphService from '../../services/automation/handlers/spells/polymorphService.js';
import * as animalShapesService from '../../services/automation/handlers/spells/animalShapesService.js';
import * as shapechangeService from '../../services/automation/handlers/spells/shapechangeService.js';
import * as unbreakableMajesty from '../../services/combat/auras/unbreakableMajesty.js';
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

    describe('NPC remove button', () => {
        it('should render remove button for NPC when isLocalhost is true', () => {
            render(<CreatureCard {...props} creature={defaultNpcCreature} />);
            expect(screen.getByTitle('Remove NPC')).toBeInTheDocument();
        });

        it('should call onRemoveNpc when remove button is clicked', () => {
            render(<CreatureCard {...props} creature={defaultNpcCreature} />);
            fireEvent.click(screen.getByTitle('Remove NPC'));
            expect(props.onRemoveNpc).toHaveBeenCalledWith('Goblin');
        });

        it('should not render remove button for non-localhost or player creatures', () => {
            const npcCreature = { ...defaultNpcCreature };
            render(<CreatureCard {...props} creature={npcCreature} isLocalhost={false} />);
            expect(screen.queryByTitle('Remove NPC')).not.toBeInTheDocument();

            render(<CreatureCard {...props} creature={defaultPlayerCreature} isLocalhost={true} />);
            expect(screen.queryByTitle('Remove NPC')).not.toBeInTheDocument();
        });
    });

    describe('initiative display', () => {
        it('should show initiative value for player creatures', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, initiative: 18 }} />);
            const initiativeInput = document.querySelector('.creature-initiative input[type="number"]');
            expect(initiativeInput).toHaveValue(18);
        });

        it('should call onInitiativeChange when initiative input blurs for player', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            const initiativeInput = document.querySelector('.creature-initiative input[type="number"]');
            fireEvent.blur(initiativeInput, { target: { value: '20' } });
            expect(props.onInitiativeChange).toHaveBeenCalledWith('Alice', '20');
        });
    });

    describe('target select', () => {
        it('should call onTargetChange when target select changes for player', () => {
            const allCreatures = [defaultPlayerCreature, { name: 'Bob', type: 'player' }];
            render(<CreatureCard {...props} creature={defaultPlayerCreature} allCreatures={allCreatures} />);
            const targetSelect = document.querySelector('.creature-target select');
            fireEvent.change(targetSelect, { target: { value: 'Bob' } });
            expect(props.onTargetChange).toHaveBeenCalledWith('Alice', 'Bob');
        });

        it('should disable target select for NPC when not localhost', () => {
            render(<CreatureCard {...props} creature={defaultNpcCreature} isLocalhost={false} />);
            const targetSelect = document.querySelector('.creature-target select');
            expect(targetSelect).toBeDisabled();
        });

        it('should set selected value to creature.targetName', () => {
            const creature = { ...defaultPlayerCreature, targetName: 'Bob' };
            const allCreatures = [creature, { name: 'Bob', type: 'player' } ];
            render(<CreatureCard {...props} creature={creature} allCreatures={allCreatures} />);
            const targetSelect = document.querySelector('.creature-target select');
            expect(targetSelect).toHaveValue('Bob');
        });
    });

    describe('conditions', () => {
        it('should render condition badges when creature has conditions', () => {
            const conditions = [
                { id: 'c1', label: 'Blinded', dc: 12, ability: 'Wisdom' },
            ];
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions }} />);
            expect(screen.getByText('Blinded DC 12')).toBeInTheDocument();
        });

        it('should render condition label without DC when dc is null', () => {
            const conditions = [
                { id: 'c1', label: 'Prone', dc: null, ability: null },
            ];
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions }} />);
            const conditionBtn = document.querySelector('.creature-badge');
            expect(conditionBtn).toHaveTextContent('Prone');
        });

        it('should call onRollConditionSave when condition badge is clicked for player', () => {
            const conditions = [{ id: 'c1', label: 'Blinded', dc: 12, ability: 'Wisdom' }];
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions }} />);
            fireEvent.click(screen.getByText('Blinded DC 12'));
            expect(props.onRollConditionSave).toHaveBeenCalledWith('Alice', conditions[0]);
        });

        it('should render condition as span (not button) for non-localhost NPC', () => {
            const conditions = [{ id: 'c1', label: 'Blinded', dc: 12, ability: 'Wisdom' }];
            render(<CreatureCard {...props} creature={{ ...defaultNpcCreature, conditions }} isLocalhost={false} />);
            const conditionBadge = screen.getByText('Blinded DC 12');
            expect(conditionBadge.tagName).toBe('SPAN');
        });

        it('should call onBreakCondition when break button is clicked', () => {
            const conditions = [{ id: 'c1', label: 'Blinded' }];
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions }} />);
            fireEvent.click(screen.getByTitle('Remove effect'));
            expect(props.onBreakCondition).toHaveBeenCalledWith('Alice', conditions[0]);
        });

        it('should not render condition break button for non-localhost', () => {
            const conditions = [{ id: 'c1', label: 'Blinded' }];
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions }} isLocalhost={false} />);
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });

        it('should call onOpenEffectAdder when add effect button is clicked', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            fireEvent.click(screen.getByTitle('Add condition, effect, or concentration'));
            expect(props.onOpenEffectAdder).toHaveBeenCalledWith(defaultPlayerCreature, 'conditions');
        });

        it('should not render condition add button for non-localhost', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} isLocalhost={false} />);
            expect(screen.queryByTitle('Add condition, effect, or concentration')).not.toBeInTheDocument();
        });
    });

    describe('concentration', () => {
        it('should render concentration badge when creature has concentration', () => {
            const concentration = { spell: 'Fireball', dc: 15 };
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, concentration }} />);
            expect(screen.getByText(/Fireball DC 15/)).toBeInTheDocument();
        });

        it('should call onRollConcentrationSave when concentration badge is clicked', () => {
            const concentration = { spell: 'Fireball', dc: 15 };
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, concentration }} />);
            fireEvent.click(screen.getByText(/Fireball DC 15/));
            expect(props.onRollConcentrationSave).toHaveBeenCalledWith('Alice');
        });

        it('should call onBreakConcentration when break button is clicked', () => {
            const concentration = { spell: 'Fireball', dc: 15 };
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, concentration }} />);
            fireEvent.click(screen.getByTitle('Remove effect'));
            expect(props.onBreakConcentration).toHaveBeenCalledWith('Alice');
        });

        it('should render the unified add button', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            expect(screen.getByTitle('Add condition, effect, or concentration')).toBeInTheDocument();
        });
    });

    describe('NPC avatar click', () => {
        it('should call onNpcClick when NPC avatar is clicked', () => {
            render(<CreatureCard {...props} creature={defaultNpcCreature} />);
            const npcAvatar = screen.getByTestId('npc-avatar-Goblin');
            fireEvent.click(npcAvatar);
            expect(props.onNpcClick).toHaveBeenCalledWith(defaultNpcCreature, { allowNonLocalhost: true });
        });
    });

    describe('name change', () => {
        it('should call onNameChange with old name and new value', () => {
            render(<CreatureCard {...props} creature={defaultNpcCreature} />);
            const input = screen.getByTestId('monster-name-input');
            fireEvent.change(input, { target: { value: 'Kobold' } });
            expect(props.onNameChange).toHaveBeenCalledWith('Goblin', 'Kobold');
        });
    });

    describe('HP change', () => {
        it('should call onHpChange when HP input blurs for player', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            const hpInput = screen.getByTestId('hp-input-Alice');
            fireEvent.blur(hpInput, { target: { value: '15' } });
            expect(props.onHpChange).toHaveBeenCalledWith('Alice', 15);
        });

        it('should show current/max HP values', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, currentHp: 12, maxHp: 20 }} />);
            expect(screen.getByText('12/20')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle creature with null currentHp', () => {
            const creature = { ...defaultPlayerCreature, currentHp: null };
            render(<CreatureCard {...props} creature={creature} />);
            expect(screen.getByTestId('hp-input-Alice')).toHaveValue(0);
        });
    });

    describe('Nature\'s Sanctuary badge', () => {
        beforeEach(() => {
            sanctuaryMocks = {};
        });

        it('should not render sanctuary badge when no sanctuary is active', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            expect(screen.queryByText('Sanctuary')).not.toBeInTheDocument();
        });

        it('should render sanctuary badge when creature is in sanctuary list', () => {
            sanctuaryMocks.naturesSanctuaryActive = { Druid: true };
            sanctuaryMocks.naturesSanctuaryCreatures = { Druid: ['Alice', 'Goblin'] };
            sanctuaryMocks.naturesSanctuaryResistance = { Druid: 'Fire' };

            const allCreatures = [
                { name: 'Druid', type: 'player' },
                { ...defaultPlayerCreature },
                { name: 'Goblin', type: 'npc' },
            ];

            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.getByText('Sanctuary')).toBeInTheDocument();
        });

        it('should not render sanctuary badge when creature is not in sanctuary list', () => {
            sanctuaryMocks.naturesSanctuaryActive = { Druid: true };
            sanctuaryMocks.naturesSanctuaryCreatures = { Druid: ['Goblin', 'Wolf'] };

            const allCreatures = [
                { name: 'Druid', type: 'player' },
                { ...defaultPlayerCreature },
                { name: 'Goblin', type: 'npc' },
            ];

            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.queryByText('Sanctuary')).not.toBeInTheDocument();
        });

        it('should not render sanctuary badge when sanctuary is not active', () => {
            sanctuaryMocks.naturesSanctuaryActive = { Druid: false };
            sanctuaryMocks.naturesSanctuaryCreatures = { Druid: ['Alice'] };

            const allCreatures = [
                { name: 'Druid', type: 'player' },
                { ...defaultPlayerCreature },
            ];

            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.queryByText('Sanctuary')).not.toBeInTheDocument();
        });
    });

    describe('inline badge X buttons', () => {
        beforeEach(() => {
            sanctuaryMocks = {};
            vi.clearAllMocks();
        });

        it('should render Hunter\'s Mark badge with X button when creature is marked', () => {
            const allCreatures = [
                { name: 'Ranger', type: 'player', concentration: { spell: "Hunter's Mark", target: 'Alice' } },
                { ...defaultPlayerCreature },
            ];
            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.getByText("Hunter's Mark")).toBeInTheDocument();
            expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
        });

        it('should not render Hunter\'s Mark X button for non-localhost', () => {
            const allCreatures = [
                { name: 'Ranger', type: 'player', concentration: { spell: "Hunter's Mark", target: 'Alice' } },
                { ...defaultPlayerCreature },
            ];
            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.getByText("Hunter's Mark")).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });

        it('should render Wild Shape badge with X button when active', () => {
            buffToggle.isBuffActive.mockReturnValue(true);
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
        });

        it('should not render Wild Shape X button for non-localhost', () => {
            buffToggle.isBuffActive.mockReturnValue(true);
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.getByText('Wild Shape')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });

        it('should render Wrath of the Sea badge with X button when active', () => {
            wrathOfTheSeaMocks = { Alice: true };
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Wrath of the Sea')).toBeInTheDocument();
            expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
        });

        it('should not render Wrath of the Sea X button for non-localhost', () => {
            wrathOfTheSeaMocks = { Alice: true };
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.getByText('Wrath of the Sea')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });

        it('should render Nature\'s Sanctuary badge with X button when creature is in sanctuary', () => {
            sanctuaryMocks.naturesSanctuaryActive = { Druid: true };
            sanctuaryMocks.naturesSanctuaryCreatures = { Druid: ['Alice'] };
            sanctuaryMocks.naturesSanctuaryResistance = { Druid: 'Fire' };

            const allCreatures = [
                { name: 'Druid', type: 'player' },
                { ...defaultPlayerCreature },
            ];

            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.getByText('Sanctuary')).toBeInTheDocument();
            expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
        });

        it('should not render Sanctuary X button for non-localhost', () => {
            sanctuaryMocks.naturesSanctuaryActive = { Druid: true };
            sanctuaryMocks.naturesSanctuaryCreatures = { Druid: ['Alice'] };
            sanctuaryMocks.naturesSanctuaryResistance = { Druid: 'Fire' };

            const allCreatures = [
                { name: 'Druid', type: 'player' },
                { ...defaultPlayerCreature },
            ];

            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.getByText('Sanctuary')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });

        it('should render Reckless Attack badge with X button when active', () => {
            const targetEffects = [{ target: 'Alice', effect: 'reckless_attack' }];
            runtimeState.useRuntimeValue.mockImplementation((campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            const allCreatures = [defaultPlayerCreature];
            render(<CreatureCard {...props} creature={defaultPlayerCreature} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.getByText('Reckless Attack')).toBeInTheDocument();
            expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
        });

        it('should not render Reckless Attack X button for non-localhost', () => {
            const targetEffects = [{ target: 'Alice', effect: 'reckless_attack' }];
            runtimeState.useRuntimeValue.mockImplementation((campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            const allCreatures = [defaultPlayerCreature];
            render(<CreatureCard {...props} creature={defaultPlayerCreature} allCreatures={allCreatures} campaignName="test-campaign" isLocalhost={false} />);
            expect(screen.getByText('Reckless Attack')).toBeInTheDocument();
            expect(screen.queryByTitle('Remove effect')).not.toBeInTheDocument();
        });
    });

    describe('wild-shaped player card', () => {
        const wildShapeCreature = {
            name: 'Alice',
            type: 'player',
            wildShapeSource: 'Alice',
            beastIndex: 'giant-spider',
            beastName: 'Giant Spider',
            currentHp: 20,
            maxHp: 20,
            initiative: 14,
            targetName: '',
            conditions: [],
            concentration: null,
        };

        it('renders the beast name instead of the druid name', () => {
            render(<CreatureCard {...props} creature={wildShapeCreature} allCreatures={[wildShapeCreature]} />);
            expect(screen.getByText('Giant Spider')).toBeInTheDocument();
            expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        });

        it('renders a clickable beast avatar that opens the monster card', () => {
            render(<CreatureCard {...props} creature={wildShapeCreature} allCreatures={[wildShapeCreature]} />);
            const avatar = screen.getByTestId('npc-avatar-Giant Spider');
            expect(avatar).toBeInTheDocument();
            fireEvent.click(avatar);
            expect(props.onNpcClick).toHaveBeenCalledWith(wildShapeCreature, { allowNonLocalhost: true });
        });

        it('shows temp HP on the wild-shaped player card', () => {
            const original = runtimeState.getRuntimeValue.getMockImplementation();
            runtimeState.getRuntimeValue.mockImplementation((target, key) => (key === 'tempHp' ? 5 : original(target, key)));
            render(<CreatureCard {...props} creature={wildShapeCreature} allCreatures={[wildShapeCreature]} />);
            expect(screen.getByText(/Temp HP: 5/i)).toBeInTheDocument();
            runtimeState.getRuntimeValue.mockImplementation(original);
        });

        it('does not show temp HP on a normal player card', () => {
            const original = runtimeState.getRuntimeValue.getMockImplementation();
            runtimeState.getRuntimeValue.mockImplementation((target, key) => (key === 'tempHp' ? 5 : original(target, key)));
            render(<CreatureCard {...props} creature={defaultPlayerCreature} allCreatures={[defaultPlayerCreature]} />);
            expect(screen.queryByText(/Temp HP:/i)).not.toBeInTheDocument();
            runtimeState.getRuntimeValue.mockImplementation(original);
        });
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

    describe('Unbreakable Majesty badge', () => {
        it('should render majesty badge when active and call clearUnbreakableMajesty on remove', () => {
            unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(true);
            unbreakableMajesty.getUnbreakableMajestySaveDc.mockReturnValue(15);
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Majesty DC 15')).toBeInTheDocument();
            const majestyBadge = screen.getByText('Majesty DC 15').closest('[class*="creature-badge"]');
            const removeBtn = majestyBadge.parentElement?.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(unbreakableMajesty.clearUnbreakableMajesty).toHaveBeenCalledWith('Alice', 'test-campaign');
            unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(false);
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

    describe('Starry Form badge', () => {
        it('should render Starry Form badge with constellation when active', () => {
            runtimeState.getRuntimeValue.mockImplementation((target, key, _campaignName) => {
                if (key === 'activeBuffs' && target === 'Alice') {
                    return [{ name: 'Starry Form', constellation: 'Archer' }];
                }
                return undefined;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Starry Form - Archer')).toBeInTheDocument();
        });

        it('should remove Starry Form buff and targetEffect when remove clicked', () => {
            runtimeState.getRuntimeValue.mockImplementation((target, key, _campaignName) => {
                if (key === 'activeBuffs' && target === 'Alice') {
                    return [{ name: 'Starry Form', constellation: 'Chalice' }];
                }
                if (key === 'targetEffects') return [{ effect: 'starry_form', source: 'Alice' }];
                return undefined;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            const starryBadge = screen.getByText('Starry Form - Chalice').closest('[class*="creature-badge"]');
            const removeBtn = starryBadge.parentElement?.querySelector('.creature-badge-remove') || starryBadge.querySelector('.creature-badge-remove');
            fireEvent.click(removeBtn);
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Alice', 'activeBuffs', expect.arrayContaining([]), 'test-campaign');
            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([]), 'test-campaign', true);
        });
    });

    describe('Summoned badges', () => {
        it('should render summoned badge when targetEffect has summoned effect with player source', () => {
            const targetEffects = [{ target: 'Goblin', effect: 'summoned', source: 'Alice' }];
            const allCreatures = [
                { name: 'Alice', type: 'player' },
                { name: 'Goblin', type: 'npc' },
            ];
            runtimeState.useRuntimeValue.mockImplementation((campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            const npcCreature = { ...defaultNpcCreature, name: 'Goblin' };
            render(<CreatureCard {...props} creature={npcCreature} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.getByText('Summoned (Alice)')).toBeInTheDocument();
        });

        it('should render summoned badge without source when source is null', () => {
            const targetEffects = [{ target: 'Goblin', effect: 'summoned', source: null }];
            const allCreatures = [
                { name: 'Goblin', type: 'npc' },
            ];
            runtimeState.useRuntimeValue.mockImplementation((campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            const npcCreature = { ...defaultNpcCreature, name: 'Goblin' };
            render(<CreatureCard {...props} creature={npcCreature} allCreatures={allCreatures} campaignName="test-campaign" />);
            expect(screen.getByText('Summoned')).toBeInTheDocument();
        });
    });

    describe('Death Ward badge', () => {
        it('should render Death Ward badge when activeBuffs contains it', () => {
            runtimeState.getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'activeBuffs' && target === 'Alice') {
                    return [{ name: 'Death Ward', effect: 'death_ward', sourceCharacter: 'Bob' }];
                }
                return undefined;
            });
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Death Ward')).toBeInTheDocument();
        });

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

    describe('Resilient Sphere badge', () => {
        it('should render Resilient Sphere badge when active', () => {
            automationPassives.isResilientSphereActive.mockReturnValue(true);
            automationPassives.getResilientSphereSource.mockReturnValue('Wizard');
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Resilient Sphere')).toBeInTheDocument();
            automationPassives.isResilientSphereActive.mockReturnValue(false);
        });

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

    describe('initiative Enter key', () => {
        it('should blur input when Enter is pressed, triggering onInitiativeChange', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, initiative: 14 }} />);
            const initiativeInput = document.querySelector('.creature-initiative input[type="number"]');
            fireEvent.blur(initiativeInput, { target: { value: '20' } });
            expect(props.onInitiativeChange).toHaveBeenCalledWith('Alice', '20');
        });
    });

    describe('invalid conditions', () => {
        it('should skip invalid conditions in the conditions map', () => {
            const conditions = [
                null,
                'invalid',
                { id: 'c1', label: 'Blinded', dc: 12 },
            ];
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions }} />);
            expect(screen.getByText('Blinded DC 12')).toBeInTheDocument();
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

    describe('isPlayerSummoned avatar click', () => {
        it('should call onNpcClick for summoned creature even when not localhost', () => {
            const targetEffects = [{ target: 'Goblin', effect: 'summoned', source: 'Alice' }];
            const allCreatures = [
                { name: 'Alice', type: 'player' },
                { ...defaultNpcCreature, name: 'Goblin', wildShapeSource: null },
            ];
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return targetEffects;
                return null;
            });
            render(<CreatureCard {...props} creature={allCreatures[1]} allCreatures={allCreatures} campaignName="test-campaign" isLocalhost={false} />);
            const npcAvatar = screen.getByTestId('npc-avatar-Goblin');
            fireEvent.click(npcAvatar);
            expect(props.onNpcClick).toHaveBeenCalledWith(allCreatures[1], { allowNonLocalhost: true });
        });
    });

    describe('initiative Enter key handler', () => {
        it('should call blur on the input when Enter is pressed', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, initiative: 14 }} />);
            const initiativeInput = document.querySelector('.creature-initiative input[type="number"]');
            const blurSpy = vi.spyOn(initiativeInput, 'blur');
            fireEvent.keyDown(initiativeInput, { key: 'Enter' });
            expect(blurSpy).toHaveBeenCalled();
            blurSpy.mockRestore();
        });
    });

    describe('Prismatic Spray failure buttons', () => {
        beforeEach(() => {
            runtimeState.useRuntimeValue.mockImplementation((_campaignName, key) => {
                if (key === 'targetEffects') return [];
                if (key === '_prismaticSprayIndigo_Alice') return { successes: 2, failures: 0 };
                if (key === '_prismaticSprayViolet_Alice') return { successes: 0, failures: 0 };
                return null;
            });
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

    describe('Majesty onClick handler', () => {
        it('should call clearUnbreakableMajesty on onClick when localhost', () => {
            unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(true);
            unbreakableMajesty.getUnbreakableMajestySaveDc.mockReturnValue(15);
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            const majestyBadge = screen.getByText('Majesty DC 15').closest('[class*="creature-badge"]');
            fireEvent.click(majestyBadge);
            expect(unbreakableMajesty.clearUnbreakableMajesty).toHaveBeenCalledWith('Alice', 'test-campaign');
            unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(false);
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
});
