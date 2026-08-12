import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureCard from './CreatureCard.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
import * as buffToggle from '../../services/automation/common/buffToggle.js';
import * as automationPassives from '../../services/combat/automation/automationPassives.js';
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
    });

    describe('Resilient Sphere badge', () => {
        it('should render Resilient Sphere badge when active', () => {
            automationPassives.isResilientSphereActive.mockReturnValue(true);
            automationPassives.getResilientSphereSource.mockReturnValue('Wizard');
            render(<CreatureCard {...props} creature={defaultPlayerCreature} campaignName="test-campaign" />);
            expect(screen.getByText('Resilient Sphere')).toBeInTheDocument();
            automationPassives.isResilientSphereActive.mockReturnValue(false);
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
});
