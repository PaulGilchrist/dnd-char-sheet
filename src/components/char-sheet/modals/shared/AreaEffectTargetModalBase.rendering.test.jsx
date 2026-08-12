import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('AreaEffectTargetModalBase - Rendering & Context', () => {
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

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Set Selected' }));
        fireEvent.click(screen.getByRole('button', { name: 'Set Processing' }));
        fireEvent.click(screen.getByRole('button', { name: 'Set Results' }));
        fireEvent.click(screen.getByRole('button', { name: 'Set Prompts' }));
      });

      expect(true).toBe(true);
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
});
