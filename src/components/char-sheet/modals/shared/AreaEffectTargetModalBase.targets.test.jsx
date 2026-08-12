import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AreaEffectTargetModalBase from './AreaEffectTargetModalBase.jsx';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

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

describe('AreaEffectTargetModalBase - Eligible Targets', () => {
  describe('initial filtering', () => {
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
});
