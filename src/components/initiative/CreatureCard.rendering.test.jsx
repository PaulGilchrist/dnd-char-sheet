// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreatureCard from './CreatureCard.jsx';
import * as runtimeState from '../../hooks/runtime/useRuntimeState.js';
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
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
    listeners: new Map(),
}));

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

describe('CreatureCard - rendering', () => {
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
        runtimeState.getRuntimeValue.mockClear();
        runtimeState.useRuntimeValue.mockClear();
        runtimeState.useRuntimeValue.mockReturnValue(null);
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
        buffToggle.isBuffActive.mockReturnValue(false);
    });

    describe('creature-card class styling', () => {
        it('should apply creature-unconscious class when currentHp is 0', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, currentHp: 0 }} />);
            const card = document.querySelector('.creature-card');
            expect(card).toHaveClass('creature-unconscious');
        });

        it('should apply creature-unconscious class when currentHp is negative', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, currentHp: -5 }} />);
            const card = document.querySelector('.creature-card');
            expect(card).toHaveClass('creature-unconscious');
        });

        it('should not apply creature-unconscious class when currentHp is positive', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, currentHp: 1 }} />);
            const card = document.querySelector('.creature-card');
            expect(card).not.toHaveClass('creature-unconscious');
        });

        it('should apply active class when isActive is true', () => {
            render(<CreatureCard {...props} isActive={true} />);
            const card = document.querySelector('.creature-card');
            expect(card).toHaveClass('active');
        });

        it('should not apply active class when isActive is false', () => {
            render(<CreatureCard {...props} isActive={false} />);
            const card = document.querySelector('.creature-card');
            expect(card).not.toHaveClass('active');
        });

        it('should apply the creature type class', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            const card = document.querySelector('.creature-card');
            expect(card).toHaveClass('player');
        });

        it('should apply npc type class for npc creatures', () => {
            render(<CreatureCard {...props} creature={defaultNpcCreature} />);
            const card = document.querySelector('.creature-card');
            expect(card).toHaveClass('npc');
        });
    });

    describe('initiative rendering', () => {
        it('should render initiative input with the creature\'s initiative value', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            const initiativeInput = screen.getByTestId('initiative-input');
            expect(initiativeInput).toHaveValue(14);
        });

        it('should render initiative input with null value when initiative is null', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, initiative: null }} />);
            const initiativeInput = screen.getByTestId('initiative-input');
            expect(initiativeInput).toHaveValue(null);
        });

        it('should render initiative input with null value when initiative is undefined', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, initiative: undefined }} />);
            const initiativeInput = screen.getByTestId('initiative-input');
            expect(initiativeInput).toHaveValue(null);
        });
    });

    describe('target select rendering', () => {
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

        it('should render a default empty option in target select', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} />);
            const targetSelect = screen.getByTestId('target-select');
            expect(targetSelect.querySelector('option[value=""]')).toBeInTheDocument();
        });

        it('should not render overlay options when overlays array is empty', () => {
            render(<CreatureCard {...props} overlays={[]} />);
            const targetSelect = document.querySelector('.creature-target select');
            expect(targetSelect.querySelector('option[value="overlay-"]')).not.toBeInTheDocument();
        });
    });

    describe('NPC rendering', () => {
        it('should show NPC match badge when NPC name matches campaign npc (case-insensitive)', () => {
            const creature = { ...defaultNpcCreature, name: 'Goblin' };
            const campaignNpcs = [{ name: 'Goblin' }];
            render(<CreatureCard {...props} creature={creature} campaignNpcs={campaignNpcs} />);
            expect(screen.getByTestId('npc-match-badge')).toBeInTheDocument();
        });

        it('should show NPC match badge for case-insensitive match', () => {
            const creature = { ...defaultNpcCreature, name: 'Goblin' };
            const campaignNpcs = [{ name: 'goblin' }];
            render(<CreatureCard {...props} creature={creature} campaignNpcs={campaignNpcs} />);
            expect(screen.getByTestId('npc-match-badge')).toBeInTheDocument();
        });

        it('should not show NPC match badge when no match exists', () => {
            const creature = { ...defaultNpcCreature, name: 'Goblin' };
            const campaignNpcs = [{ name: 'Orc' }];
            render(<CreatureCard {...props} creature={creature} campaignNpcs={campaignNpcs} />);
            expect(screen.queryByTestId('npc-match-badge')).not.toBeInTheDocument();
        });
    });

    describe('polymorphObject rendering', () => {
        it('should display polymorphObject type as formatted name', () => {
            const creature = {
                ...defaultNpcCreature,
                polymorphObject: { type: 'giant_toad', icon: 'fa-toad' },
            };
            render(<CreatureCard {...props} creature={creature} />);
            expect(screen.getByText('Giant Toad')).toBeInTheDocument();
        });

        it('should display polymorphObject with underscores converted to spaces and title-cased', () => {
            const creature = {
                ...defaultNpcCreature,
                polymorphObject: { type: 'black_dragon', icon: 'fa-dragon' },
            };
            render(<CreatureCard {...props} creature={creature} />);
            expect(screen.getByText('Black Dragon')).toBeInTheDocument();
        });

        it('should render the polymorphObject icon when present', () => {
            const creature = {
                ...defaultNpcCreature,
                polymorphObject: { type: 'spider', icon: 'fa-spider' },
            };
            render(<CreatureCard {...props} creature={creature} />);
            expect(screen.getByText('Spider')).toBeInTheDocument();
        });
    });

    describe('edge cases - creature data', () => {
        it('should render the creature card when allCreatures is empty', () => {
            render(<CreatureCard {...props} creature={defaultPlayerCreature} allCreatures={[]} />);
            const card = document.querySelector('.creature-card');
            expect(card).toBeInTheDocument();
        });

        it('should render the creature card when conditions array is empty', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, conditions: [] }} />);
            const card = document.querySelector('.creature-card');
            expect(card).toBeInTheDocument();
        });

        it('should render the creature card when name is an empty string', () => {
            render(<CreatureCard {...props} creature={{ ...defaultPlayerCreature, name: '' }} />);
            const card = document.querySelector('.creature-card');
            expect(card).toBeInTheDocument();
        });
    });
});
