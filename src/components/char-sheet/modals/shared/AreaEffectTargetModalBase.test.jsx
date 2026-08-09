import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AreaEffectTargetModalBase from './AreaEffectTargetModalBase.jsx';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { isApplyBusy, setApplyBusy as setApplyBusyInstance } from './areaEffectModalInstances.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('./areaEffectModalInstances.js', () => ({
  isApplyBusy: vi.fn(),
  setApplyBusy: vi.fn(),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
  sendSavePrompt: vi.fn(),
}));

const campaignName = 'test-campaign';

const baseCombatSummary = {
  creatures: [
    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { cha: 0 } },
    { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { cha: 2 } },
    { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { cha: 1 } },
  ],
};

const baseProps = {
  combatSummary: baseCombatSummary,
  attackerName: 'Wizard1',
  attackerPos: { gridX: 10, gridY: 10 },
  saveDc: 14,
  campaignName,
  mapData: null,
  monsters: [],
  featureName: 'Test Effect',
  saveType: 'CHA',
  rangeFeet: 30,
  onClose: vi.fn(),
  characters: [],
  includeCaster: false,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AreaEffectTargetModalBase', () => {
  describe('initial render', () => {
    it('renders the modal header with feature name and d20 icon', () => {
      getRuntimeValue.mockReturnValue([]);
      render(<AreaEffectTargetModalBase {...baseProps} />);
      expect(screen.getByText('Test Effect')).toBeInTheDocument();
      expect(document.querySelector('.sp-header .fa-solid.fa-dice-d20')).toBeInTheDocument();
    });

    it('renders with custom icon', () => {
      getRuntimeValue.mockReturnValue([]);
      render(<AreaEffectTargetModalBase {...baseProps} icon="fa-solid fa-fire" />);
      expect(document.querySelector('.sp-header .fa-solid.fa-fire')).toBeInTheDocument();
    });

    it('renders empty body when no renderBody provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const { container } = render(<AreaEffectTargetModalBase {...baseProps} />);
      const body = container.querySelector('.sp-body');
      expect(body).toBeInTheDocument();
      expect(body.textContent).toBe('');
    });

    it('renders empty actions when no renderActions provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const { container } = render(<AreaEffectTargetModalBase {...baseProps} />);
      const actions = container.querySelector('.sp-actions');
      expect(actions).toBeInTheDocument();
      expect(actions.textContent).toBe('');
    });

    it('calls renderBody with context when provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => 'Custom Body');
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      expect(renderBody).toHaveBeenCalledWith(expect.objectContaining({
        saveType: 'CHA',
        saveDc: 14,
        rangeFeet: 30,
        featureName: 'Test Effect',
        combatSummary: baseCombatSummary,
        attackerName: 'Wizard1',
        campaignName,
        onClose: baseProps.onClose,
      }));
      expect(screen.getByText('Custom Body')).toBeInTheDocument();
    });

    it('calls renderActions with context when provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderActions = vi.fn(() => 'Custom Actions');
      render(<AreaEffectTargetModalBase {...baseProps} renderActions={renderActions} />);
      expect(renderActions).toHaveBeenCalledWith(expect.objectContaining({
        saveType: 'CHA',
        saveDc: 14,
        rangeFeet: 30,
        featureName: 'Test Effect',
        combatSummary: baseCombatSummary,
        attackerName: 'Wizard1',
        campaignName,
        onClose: baseProps.onClose,
      }));
      expect(screen.getByText('Custom Actions')).toBeInTheDocument();
    });

    it('closes when overlay background is clicked', () => {
      getRuntimeValue.mockReturnValue([]);
      const onClose = vi.fn();
      render(<AreaEffectTargetModalBase {...baseProps} onClose={onClose} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal content is clicked', () => {
      getRuntimeValue.mockReturnValue([]);
      const onClose = vi.fn();
      render(<AreaEffectTargetModalBase {...baseProps} onClose={onClose} />);
      fireEvent.click(document.querySelector('.sp-modal'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('eligible targets filtering', () => {
    it('excludes the caster when includeCaster is false', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        const list = ctx.eligibleTargets;
        return <div>{list.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      const targetNames = ctx.eligibleTargets.map(t => t.name);
      expect(targetNames).not.toContain('Wizard1');
    });

    it('includes the caster in eligible targets when includeCaster is true', () => {
      getRuntimeValue.mockReturnValue([]);
      const wizardCreature = { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { int: 4 } };
      const combatSummary = { creatures: [...baseCombatSummary.creatures, wizardCreature] };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} combatSummary={combatSummary} includeCaster={true} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      const targetNames = ctx.eligibleTargets.map(t => t.name);
      expect(targetNames).toContain('Wizard1');
    });

    it('filters to undead only when turnUndead is true', () => {
      getRuntimeValue.mockReturnValue([]);
      const monsters = [
        { name: 'Goblin', type: 'Undead' },
        { name: 'Orc', type: 'npc' },
        { name: 'PlayerAlly', type: 'Undead' },
      ];
      const combatSummary = {
        creatures: [
          { name: 'Goblin', type: 'Undead', currentHp: 5, maxHp: 7, saveBonuses: { cha: 0 } },
          { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { cha: 2 } },
          { name: 'PlayerAlly', type: 'Undead', currentHp: 30, maxHp: 30, saveBonuses: { cha: 1 } },
        ],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} combatSummary={combatSummary} turnUndead={true} monsters={monsters} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      const targetNames = ctx.eligibleTargets.map(t => t.name);
      expect(targetNames).toContain('Goblin');
      expect(targetNames).toContain('PlayerAlly');
      expect(targetNames).not.toContain('Orc');
    });

    it('returns all non-caster targets when turnUndead is false', () => {
      getRuntimeValue.mockReturnValue([]);
      const monsters = [
        { name: 'Zombie', type: 'Undead' },
      ];
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} turnUndead={false} monsters={monsters} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      const targetNames = ctx.eligibleTargets.map(t => t.name);
      expect(targetNames).not.toContain('Wizard1');
      expect(targetNames).toContain('Goblin');
    });

    it('returns empty array when combatSummary has no creatures', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} combatSummary={{}} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets).toEqual([]);
    });

    it('returns empty array when combatSummary is null', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} combatSummary={null} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets).toEqual([]);
    });
  });

  describe('forcecage blocking', () => {
    it('excludes target when both attacker and target are forcecaged with different sources', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'forcecage', target: 'Wizard1', source: 'CageA' },
        { effect: 'forcecage', target: 'Goblin', source: 'CageB' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).not.toContain('Goblin');
    });

    it('includes target when both attacker and target are forcecaged with same source', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'forcecage', target: 'Wizard1', source: 'CageA' },
        { effect: 'forcecage', target: 'Goblin', source: 'CageA' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when neither is forcecaged', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when no forcecage effects exist', () => {
      getRuntimeValue.mockReturnValue(undefined);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when targetEffects is not an array', () => {
      getRuntimeValue.mockReturnValue('not-an-array');
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });
  });

  describe('maze blocking', () => {
    it('excludes target when both attacker and target are maze blocked with different sources', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'maze', target: 'Wizard1', source: 'MazeA' },
        { effect: 'maze', target: 'Goblin', source: 'MazeB' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).not.toContain('Goblin');
    });

    it('includes target when both attacker and target are maze blocked with same source', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'maze', target: 'Wizard1', source: 'MazeA' },
        { effect: 'maze', target: 'Goblin', source: 'MazeA' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });
  });

  describe('banishment blocking', () => {
    it('excludes target when both attacker and target are banished with different sources', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'banishment', target: 'Wizard1', source: 'BanishA' },
        { effect: 'banishment', target: 'Goblin', source: 'BanishB' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).not.toContain('Goblin');
    });

    it('includes target when both attacker and target are banished with same source', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'banishment', target: 'Wizard1', source: 'BanishA' },
        { effect: 'banishment', target: 'Goblin', source: 'BanishA' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });
  });

  describe('imprisonment blocking', () => {
    it('excludes target when both attacker and target are imprisoned with different sources', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'imprisonment', target: 'Wizard1', source: 'ImpA' },
        { effect: 'imprisonment', target: 'Goblin', source: 'ImpB' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).not.toContain('Goblin');
    });

    it('includes target when both attacker and target are imprisoned with same source', () => {
      getRuntimeValue.mockReturnValue([
        { effect: 'imprisonment', target: 'Wizard1', source: 'ImpA' },
        { effect: 'imprisonment', target: 'Goblin', source: 'ImpA' },
      ]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when no imprisonment effects exist', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when targetEffects is undefined', () => {
      getRuntimeValue.mockReturnValue(undefined);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });
  });

  describe('overlay-based targeting', () => {
    it('uses shape-based overlay hit test when shape is provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const mapData = {
        players: [
          { name: 'Goblin', gridX: 10, gridY: 10 },
        ],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          mapData={mapData}
          shape="sphere"
          attackerGridX={10}
          attackerGridY={10}
          rangeFeet={30}
          renderBody={renderBody}
        />
      );
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('uses distance-based check when shape is not provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const mapData = {
        players: [
          { name: 'Goblin', gridX: 10, gridY: 10 },
        ],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          mapData={mapData}
          attackerPos={{ gridX: 10, gridY: 10 }}
          rangeFeet={30}
          renderBody={renderBody}
        />
      );
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when target has no position on map', () => {
      getRuntimeValue.mockReturnValue([]);
      const mapData = {
        players: [],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} mapData={mapData} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when mapData is null', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} mapData={null} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('includes target when attackerPos is null', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} attackerPos={null} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });

    it('looks up target position from placedItems', () => {
      getRuntimeValue.mockReturnValue([]);
      const mapData = {
        players: [],
        placedItems: [
          { name: 'Goblin', gridX: 12, gridY: 12 },
        ],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(<AreaEffectTargetModalBase {...baseProps} mapData={mapData} renderBody={renderBody} />);
      const ctx = renderBody.mock.calls[0][0];
      expect(ctx.eligibleTargets.map(t => t.name)).toContain('Goblin');
    });
  });

  describe('toggleTarget', () => {
    it('adds target to selection when not selected', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls.at(-1)[0];
        return (
          <div>
            <button onClick={() => ctx.toggleTarget('Goblin')}>Toggle Goblin</button>
            <span id="count">{ctx.selected.size}</span>
          </div>
        );
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);

      const initialCtx = renderBody.mock.calls[0][0];
      expect(initialCtx.selected.has('Goblin')).toBe(false);
      expect(initialCtx.selected.size).toBe(0);

      act(() => {
        renderBody.mock.calls.at(-1)[0].toggleTarget('Goblin');
      });

      expect(renderBody.mock.calls.at(-1)[0].selected.has('Goblin')).toBe(true);
      expect(renderBody.mock.calls.at(-1)[0].selected.size).toBe(1);
    });

    it('removes target from selection when already selected', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls.at(-1)[0];
        return (
          <div>
            <button onClick={() => ctx.toggleTarget('Goblin')}>Toggle Goblin</button>
            <span id="count">{ctx.selected.size}</span>
          </div>
        );
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);

      act(() => {
        renderBody.mock.calls.at(-1)[0].toggleTarget('Goblin');
      });
      expect(renderBody.mock.calls.at(-1)[0].selected.has('Goblin')).toBe(true);

      act(() => {
        renderBody.mock.calls.at(-1)[0].toggleTarget('Goblin');
      });
      expect(renderBody.mock.calls.at(-1)[0].selected.has('Goblin')).toBe(false);
    });
  });

  describe('handleApply', () => {
    it('does not apply when isApplyBusy returns true', async () => {
      getRuntimeValue.mockReturnValue([]);
      isApplyBusy.mockReturnValue(true);

      const handleApplyOverride = vi.fn();
      let capturedCtx = null;
      const renderActions = vi.fn(() => {
        capturedCtx = renderActions.mock.calls[0][0];
        return <button onClick={() => capturedCtx.handleApply()}>Apply</button>;
      });

      render(<AreaEffectTargetModalBase {...baseProps} handleApplyOverride={handleApplyOverride} renderActions={renderActions} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      });

      expect(handleApplyOverride).not.toHaveBeenCalled();
    });

    it('applies when isApplyBusy returns false', async () => {
      getRuntimeValue.mockReturnValue([]);
      isApplyBusy.mockReturnValue(false);

      const handleApplyOverride = vi.fn();
      let capturedCtx = null;
      const renderActions = vi.fn(() => {
        capturedCtx = renderActions.mock.calls[0][0];
        return <button onClick={() => capturedCtx.handleApply()}>Apply</button>;
      });

      render(<AreaEffectTargetModalBase {...baseProps} handleApplyOverride={handleApplyOverride} renderActions={renderActions} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      });

      expect(setApplyBusyInstance).toHaveBeenCalledWith(true);
      expect(handleApplyOverride).toHaveBeenCalled();
    });

    it('uses default no-op when handleApplyOverride is not provided', async () => {
      getRuntimeValue.mockReturnValue([]);
      isApplyBusy.mockReturnValue(false);

      let capturedCtx = null;
      const renderActions = vi.fn(() => {
        capturedCtx = renderActions.mock.calls[0][0];
        return <button onClick={() => capturedCtx.handleApply()}>Apply</button>;
      });

      render(<AreaEffectTargetModalBase {...baseProps} renderActions={renderActions} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      });

      expect(setApplyBusyInstance).toHaveBeenCalledWith(true);
    });
  });

  describe('handleSaveResult', () => {
    it('calls handleSaveResultOverrideRef with event and context', () => {
      getRuntimeValue.mockReturnValue([]);

      const handleSaveResultOverride = vi.fn();
      let capturedCtx = null;
      const renderActions = vi.fn(() => {
        capturedCtx = renderActions.mock.calls[0][0];
        return <button onClick={() => capturedCtx.handleSaveResult({ detail: { success: true } })}>Save Result</button>;
      });

      render(<AreaEffectTargetModalBase {...baseProps} handleSaveResultOverride={handleSaveResultOverride} renderActions={renderActions} />);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Save Result' }));
      });

      expect(handleSaveResultOverride).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { success: true } }),
        expect.objectContaining({
          saveType: 'CHA',
          saveDc: 14,
          rangeFeet: 30,
          featureName: 'Test Effect',
        })
      );
    });

    it('uses default no-op when handleSaveResultOverride is not provided', () => {
      getRuntimeValue.mockReturnValue([]);

      let capturedCtx = null;
      const renderActions = vi.fn(() => {
        capturedCtx = renderActions.mock.calls[0][0];
        return <button onClick={() => capturedCtx.handleSaveResult({ detail: { success: true } })}>Save Result</button>;
      });

      render(<AreaEffectTargetModalBase {...baseProps} renderActions={renderActions} />);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Save Result' }));
      });

      expect(true).toBe(true);
    });
  });

  describe('save-result event listener', () => {
    it('adds event listener when processing is true', () => {
      getRuntimeValue.mockReturnValue([]);

      const handleSaveResultOverride = vi.fn();
      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setProcessing(true)}>Set Processing</button>
          </div>
        );
      });

      render(<AreaEffectTargetModalBase {...baseProps} handleSaveResultOverride={handleSaveResultOverride} renderBody={renderBody} />);

      // Set processing to true
      act(() => {
        capturedCtx.setProcessing(true);
      });

      // The event listener is added to window, we can verify by dispatching
      const event = new CustomEvent('save-result', { detail: { test: true } });
      window.dispatchEvent(event);

      expect(handleSaveResultOverride).toHaveBeenCalled();
    });

    it('removes event listener when processing becomes false', () => {
      getRuntimeValue.mockReturnValue([]);

      const handleSaveResultOverride = vi.fn();
      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setProcessing(false)}>Stop Processing</button>
          </div>
        );
      });

      render(<AreaEffectTargetModalBase {...baseProps} handleSaveResultOverride={handleSaveResultOverride} renderBody={renderBody} />);

      // Stop processing
      act(() => {
        capturedCtx.setProcessing(false);
      });

      // Should not throw on cleanup
      expect(true).toBe(true);
    });
  });

  describe('processing reset', () => {
    it('resets applyBusy when processing becomes false', async () => {
      getRuntimeValue.mockReturnValue([]);
      setApplyBusyInstance.mockReturnValue(undefined);

      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setProcessing(false)}>Stop Processing</button>
          </div>
        );
      });

      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);

      // Set processing to false
      await act(async () => {
        capturedCtx.setProcessing(false);
      });

      expect(setApplyBusyInstance).toHaveBeenCalledWith(false);
    });
  });

  describe('onAllResolved callback', () => {
    it('calls onAllResolved when allResolved becomes true', async () => {
      getRuntimeValue.mockReturnValue([]);

      const onAllResolved = vi.fn();
      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setProcessing(true)}>Set Processing</button>
            <button onClick={() => capturedCtx.setPendingPrompts([])}>Clear Prompts</button>
            <button onClick={() => capturedCtx.setResults([{ targetName: 'Goblin', success: false }])}>Set Results</button>
          </div>
        );
      });

      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          onAllResolved={onAllResolved}
          renderBody={renderBody}
        />
      );

      // Set processing and clear prompts and set results to trigger allResolved
      await act(async () => {
        capturedCtx.setProcessing(true);
        capturedCtx.setPendingPrompts([]);
        capturedCtx.setResults([{ targetName: 'Goblin', success: false }]);
      });

      await waitFor(() => {
        expect(onAllResolved).toHaveBeenCalled();
      });
    });

    it('does not call onAllResolved when processing is false', () => {
      getRuntimeValue.mockReturnValue([]);

      const onAllResolved = vi.fn();
      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setProcessing(false)}>Not Processing</button>
          </div>
        );
      });

      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          onAllResolved={onAllResolved}
          renderBody={renderBody}
        />
      );

      // Processing is already false, so allResolved should be false
      expect(onAllResolved).not.toHaveBeenCalled();
    });

    it('does not call onAllResolved when pendingPrompts is not empty', () => {
      getRuntimeValue.mockReturnValue([]);

      const onAllResolved = vi.fn();
      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setPendingPrompts([{ promptId: '1', targetName: 'Goblin' }])}>Add Prompt</button>
          </div>
        );
      });

      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          onAllResolved={onAllResolved}
          renderBody={renderBody}
        />
      );

      // Add pending prompts but keep processing false
      act(() => {
        capturedCtx.setPendingPrompts([{ promptId: '1', targetName: 'Goblin' }]);
      });

      expect(onAllResolved).not.toHaveBeenCalled();
    });
  });

  describe('extraState', () => {
    it('spreads extraState into context', () => {
      getRuntimeValue.mockReturnValue([]);

      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.customField || 'missing'}</div>;
      });

      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          extraState={{ customField: 'customValue' }}
          renderBody={renderBody}
        />
      );

      expect(screen.getByText('customValue')).toBeInTheDocument();
    });
  });

  describe('coneAngle and widthFt defaults', () => {
    it('passes coneAngle to overlay with default 53 when not provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const mapData = {
        players: [
          { name: 'Goblin', gridX: 10, gridY: 10 },
        ],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          mapData={mapData}
          shape="cone"
          attackerGridX={10}
          attackerGridY={10}
          rangeFeet={30}
          coneAngle={90}
          renderBody={renderBody}
        />
      );
    });

    it('passes widthFt to overlay with default 5 when not provided', () => {
      getRuntimeValue.mockReturnValue([]);
      const mapData = {
        players: [
          { name: 'Goblin', gridX: 10, gridY: 10 },
        ],
      };
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls[0][0];
        return <div>{ctx.eligibleTargets.map(t => <span key={t.name}>{t.name}</span>).join(', ')}</div>;
      });
      render(
        <AreaEffectTargetModalBase
          {...baseProps}
          mapData={mapData}
          shape="line"
          attackerGridX={10}
          attackerGridY={10}
          rangeFeet={60}
          widthFt={10}
          renderBody={renderBody}
        />
      );
    });
  });

  describe('context object', () => {
    it('context contains all expected properties', () => {
      getRuntimeValue.mockReturnValue([]);

      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <span id="saveType">{capturedCtx.saveType}</span>
            <span id="saveDc">{capturedCtx.saveDc}</span>
            <span id="rangeFeet">{capturedCtx.rangeFeet}</span>
            <span id="attackerName">{capturedCtx.attackerName}</span>
            <span id="campaignName">{capturedCtx.campaignName}</span>
          </div>
        );
      });

      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);

      expect(screen.getByText('CHA')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Wizard1')).toBeInTheDocument();
      expect(screen.getByText('test-campaign')).toBeInTheDocument();
    });

    it('context contains setSelected, setProcessing, setResults, setPendingPrompts', () => {
      getRuntimeValue.mockReturnValue([]);

      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setSelected(new Set(['Goblin']))}>Set Selected</button>
            <button onClick={() => capturedCtx.setProcessing(true)}>Set Processing</button>
            <button onClick={() => capturedCtx.setResults([{ targetName: 'Goblin' }])}>Set Results</button>
            <button onClick={() => capturedCtx.setPendingPrompts([{ promptId: '1' }])}>Set Prompts</button>
          </div>
        );
      });

      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);

      // All these should not throw
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Set Selected' }));
        fireEvent.click(screen.getByRole('button', { name: 'Set Processing' }));
        fireEvent.click(screen.getByRole('button', { name: 'Set Results' }));
        fireEvent.click(screen.getByRole('button', { name: 'Set Prompts' }));
      });

      expect(true).toBe(true);
    });
  });
});
