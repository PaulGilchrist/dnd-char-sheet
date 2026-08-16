// @improved-by-ai
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

describe('AreaEffectTargetModalBase - Interactions', () => {
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

    it('adds target to selection even when not in eligible targets list', () => {
      getRuntimeValue.mockReturnValue([]);
      const renderBody = vi.fn(() => {
        const ctx = renderBody.mock.calls.at(-1)[0];
        return (
          <div>
            <button onClick={() => ctx.toggleTarget('NonExistent')}>Toggle NonExistent</button>
            <span id="count">{ctx.selected.size}</span>
          </div>
        );
      });
      render(<AreaEffectTargetModalBase {...baseProps} renderBody={renderBody} />);

      act(() => {
        renderBody.mock.calls.at(-1)[0].toggleTarget('NonExistent');
      });

      expect(renderBody.mock.calls.at(-1)[0].selected.has('NonExistent')).toBe(true);
      expect(renderBody.mock.calls.at(-1)[0].selected.size).toBe(1);
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
      expect(setApplyBusyInstance).not.toHaveBeenCalledWith(true);
    });

    it('applies when isApplyBusy returns false and passes context to override', async () => {
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
      expect(handleApplyOverride).toHaveBeenCalledTimes(1);
      expect(handleApplyOverride).toHaveBeenCalledWith(expect.objectContaining({
        saveType: 'CHA',
        saveDc: 14,
        rangeFeet: 30,
        featureName: 'Test Effect',
      }));
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

    it('provides a callable handleSaveResult even when no override is given', () => {
      getRuntimeValue.mockReturnValue([]);

      let capturedCtx = null;
      const renderActions = vi.fn(() => {
        capturedCtx = renderActions.mock.calls[0][0];
        return <button onClick={() => capturedCtx.handleSaveResult({ detail: { success: true } })}>Save Result</button>;
      });

      render(<AreaEffectTargetModalBase {...baseProps} renderActions={renderActions} />);

      act(() => {
        capturedCtx.handleSaveResult({ detail: { success: true } });
      });

      expect(typeof capturedCtx.handleSaveResult).toBe('function');
    });
  });

  describe('save-result event listener lifecycle', () => {
    it('calls handleSaveResultOverride when save-result event fires during processing', () => {
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

      act(() => {
        capturedCtx.setProcessing(true);
      });

      const event = new CustomEvent('save-result', { detail: { targetName: 'Goblin', success: true } });
      window.dispatchEvent(event);

      expect(handleSaveResultOverride).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { targetName: 'Goblin', success: true } }),
        expect.objectContaining({ processing: true })
      );
    });

    it('does not call handleSaveResultOverride when processing is false', () => {
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

      const event = new CustomEvent('save-result', { detail: { targetName: 'Goblin', success: true } });
      window.dispatchEvent(event);

      expect(handleSaveResultOverride).not.toHaveBeenCalled();
    });
  });

  describe('processing reset', () => {
    it('resets applyBusy when processing becomes false', async () => {
      getRuntimeValue.mockReturnValue([]);

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

      await act(async () => {
        capturedCtx.setProcessing(false);
      });

      expect(setApplyBusyInstance).toHaveBeenCalledWith(false);
    });
  });

  describe('onAllResolved callback', () => {
    it('calls onAllResolved when processing is true, no pending prompts, and results cover all selected', async () => {
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

      expect(onAllResolved).not.toHaveBeenCalled();
    });

    it('does not call onAllResolved when pending prompts exist', () => {
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

      act(() => {
        capturedCtx.setPendingPrompts([{ promptId: '1', targetName: 'Goblin' }]);
      });

      expect(onAllResolved).not.toHaveBeenCalled();
    });

    it('does not call onAllResolved when results do not cover all selected targets', () => {
      getRuntimeValue.mockReturnValue([]);

      const onAllResolved = vi.fn();
      let capturedCtx = null;
      const renderBody = vi.fn(() => {
        capturedCtx = renderBody.mock.calls[0][0];
        return (
          <div>
            <button onClick={() => capturedCtx.setSelected(new Set(['Goblin', 'Orc']))}>Select Two</button>
            <button onClick={() => capturedCtx.setProcessing(true)}>Set Processing</button>
            <button onClick={() => capturedCtx.setPendingPrompts([])}>Clear Prompts</button>
            <button onClick={() => capturedCtx.setResults([{ targetName: 'Goblin', success: false }])}>Set One Result</button>
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

      act(() => {
        capturedCtx.setSelected(new Set(['Goblin', 'Orc']));
        capturedCtx.setProcessing(true);
        capturedCtx.setPendingPrompts([]);
        capturedCtx.setResults([{ targetName: 'Goblin', success: false }]);
      });

      expect(onAllResolved).not.toHaveBeenCalled();
    });
  });
});
