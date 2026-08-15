// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Sidebar from './Sidebar.jsx';

const LOCALHOST_ONLY_BUTTONS = ['Encounters', 'Factions', 'NPCs', 'Quests', 'Settlements', 'Admin'];
const ALWAYS_VISIBLE_BUTTONS = ['Campaigns', 'Add Character', 'Initiative', 'Log', 'Notes', 'Rules'];

const RULES_URL = 'https://paulgilchrist.github.io/dnd-tools/rules/general';

function createProps(overrides = {}) {
  return {
    campaignName: 'Test Campaign',
    characters: [],
    activeCharacter: null,
    isLocalhost: true,
    onBackToCampaigns: vi.fn(),
    onAddCharacter: vi.fn(),
    onCharacterClick: vi.fn(),
    onInitiativeClick: vi.fn(),
    onEncounterClick: vi.fn(),
    onFactionsClick: vi.fn(),
    onMapsClick: vi.fn(),
    onNotesClick: vi.fn(),
    onQuestsClick: vi.fn(),
    onNPCsClick: vi.fn(),
    onSettlementsClick: vi.fn(),
    onLogClick: vi.fn(),
    onRepairClick: vi.fn(),
    ...overrides,
  };
}

function renderSidebar(overrides = {}) {
  const props = createProps(overrides);
  return { props, ...render(<Sidebar {...props} />) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Sidebar', () => {
  describe('rendering', () => {
    it('displays the campaign name', () => {
      renderSidebar();
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    });

    it('renders Maps on localhost and Map on non-localhost', () => {
      const { rerender } = renderSidebar({ isLocalhost: true });
      expect(screen.getByRole('button', { name: 'Maps' })).toBeInTheDocument();

      rerender(<Sidebar {...createProps({ isLocalhost: false })} />);
      expect(screen.getByRole('button', { name: 'Map' })).toBeInTheDocument();
    });

    it.each(LOCALHOST_ONLY_BUTTONS)('renders the %s button on localhost', (label) => {
      renderSidebar({ isLocalhost: true });
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });

    it.each(LOCALHOST_ONLY_BUTTONS)('does not render the %s button on non-localhost', (label) => {
      renderSidebar({ isLocalhost: false });
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    });

    it.each(ALWAYS_VISIBLE_BUTTONS)('renders the %s button regardless of localhost', (label) => {
      renderSidebar({ isLocalhost: false });
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });

    it('renders a character button for each character', () => {
      renderSidebar({ characters: [{ name: 'Aragorn' }, { name: 'Legolas' }] });
      expect(screen.getByRole('button', { name: 'Aragorn' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Legolas' })).toBeInTheDocument();
    });

    it('renders the characters header but no character buttons when the list is empty', () => {
      renderSidebar({ characters: [] });
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aragorn' })).not.toBeInTheDocument();
    });

    it('does not render rename or delete campaign controls', () => {
      renderSidebar({ onRenameCampaign: vi.fn(), onDeleteCampaign: vi.fn() });
      expect(screen.queryByTitle('Rename Campaign')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete Campaign')).not.toBeInTheDocument();
    });
  });

  describe('event handlers', () => {
    it('calls onBackToCampaigns when the Campaigns button is clicked', () => {
      const { props } = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Campaigns' }));
      expect(props.onBackToCampaigns).toHaveBeenCalledTimes(1);
    });

    it('calls onAddCharacter when the Add Character button is clicked', () => {
      const { props } = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Add Character' }));
      expect(props.onAddCharacter).toHaveBeenCalledTimes(1);
    });

    it('calls onInitiativeClick when the Initiative button is clicked', () => {
      const { props } = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Initiative' }));
      expect(props.onInitiativeClick).toHaveBeenCalledTimes(1);
    });

    it('calls onLogClick when the Log button is clicked', () => {
      const { props } = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Log' }));
      expect(props.onLogClick).toHaveBeenCalledTimes(1);
    });

    it('calls onNotesClick when the Notes button is clicked', () => {
      const { props } = renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
      expect(props.onNotesClick).toHaveBeenCalledTimes(1);
    });

    it('calls onMapsClick when Map/Maps is clicked on localhost and non-localhost', () => {
      const { props, rerender } = renderSidebar({ isLocalhost: true });
      fireEvent.click(screen.getByRole('button', { name: 'Maps' }));
      rerender(<Sidebar {...props} isLocalhost={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Map' }));
      expect(props.onMapsClick).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['onEncounterClick', 'Encounters'],
      ['onFactionsClick', 'Factions'],
      ['onNPCsClick', 'NPCs'],
      ['onQuestsClick', 'Quests'],
      ['onSettlementsClick', 'Settlements'],
    ])('calls %s when the %s button is clicked on localhost', (handler, label) => {
      const { props } = renderSidebar({ isLocalhost: true });
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(props[handler]).toHaveBeenCalledTimes(1);
    });

    it('calls onRepairClick when the Admin button is clicked on localhost', () => {
      const { props } = renderSidebar({ isLocalhost: true });
      fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
      expect(props.onRepairClick).toHaveBeenCalledTimes(1);
    });

    it('opens the rules URL in a new tab when the Rules button is clicked', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
      expect(openSpy).toHaveBeenCalledWith(RULES_URL, '_blank');
    });
  });

  describe('active view highlighting', () => {
    it('highlights the active character when charSheet is active', () => {
      renderSidebar({
        characters: [{ name: 'Aragorn' }, { name: 'Legolas' }],
        activeCharacter: { name: 'Legolas' },
        activeView: 'charSheet',
      });
      expect(screen.getByRole('button', { name: 'Legolas' })).toHaveClass('active');
      expect(screen.getByRole('button', { name: 'Aragorn' })).not.toHaveClass('active');
    });

    it('does not highlight any character when charSheet is not active', () => {
      renderSidebar({
        characters: [{ name: 'Aragorn' }, { name: 'Legolas' }],
        activeCharacter: { name: 'Legolas' },
        activeView: 'initiative',
      });
      expect(screen.getByRole('button', { name: 'Aragorn' })).not.toHaveClass('active');
      expect(screen.getByRole('button', { name: 'Legolas' })).not.toHaveClass('active');
    });

    it.each([
      ['Encounters', 'encounter'],
      ['Factions', 'factions'],
      ['Initiative', 'initiative'],
      ['Log', 'campaignLog'],
      ['Maps', 'mapsManager'],
      ['NPCs', 'npcs'],
      ['Notes', 'notes'],
      ['Quests', 'quests'],
      ['Settlements', 'settlements'],
      ['Admin', 'campaignRepair'],
    ])('highlights the %s button when activeView is %s', (label, activeView) => {
      renderSidebar({ isLocalhost: true, activeView });
      expect(screen.getByRole('button', { name: label })).toHaveClass('active');
    });

    it('does not highlight any button when activeView is not set', () => {
      const { container } = renderSidebar({ isLocalhost: true, activeView: null });
      Array.from(container.querySelectorAll('button')).forEach((btn) => {
        expect(btn).not.toHaveClass('active');
      });
    });
  });

  describe('active view indicator', () => {
    it('shows the active view label in the indicator', () => {
      const { container } = renderSidebar({ activeView: 'initiative' });
      expect(container.querySelector('.sidebar-active-indicator')).toHaveTextContent('Initiative');
    });

    it('shows the active character name in the indicator when charSheet is active', () => {
      const { container } = renderSidebar({
        activeView: 'charSheet',
        activeCharacter: { name: 'Frodo' },
      });
      expect(container.querySelector('.sidebar-active-indicator')).toHaveTextContent('Frodo');
    });

    it('shows the generic label when charSheet is active without a character', () => {
      const { container } = renderSidebar({ activeView: 'charSheet', activeCharacter: null });
      expect(container.querySelector('.sidebar-active-indicator')).toHaveTextContent('Character');
    });

    it('renders an empty indicator for an unknown active view', () => {
      const { container } = renderSidebar({ activeView: 'unknown' });
      const indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator.textContent.trim()).toBe('');
    });

    it('does not render the indicator when activeView is null', () => {
      const { container } = renderSidebar({ activeView: null });
      expect(container.querySelector('.sidebar-active-indicator')).not.toBeInTheDocument();
    });

    it('shows the matching icon in the indicator for each view', () => {
      const { container, rerender } = renderSidebar({ activeView: 'initiative' });
      let indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator.querySelector('.fa-shield-alt')).toBeInTheDocument();

      rerender(
        <Sidebar
          {...createProps({ activeView: 'charSheet', activeCharacter: { name: 'Test' } })}
        />
      );
      indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator.querySelector('.fa-user')).toBeInTheDocument();
    });
  });

  describe('characters section', () => {
    it('calls onCharacterClick with the clicked character object', () => {
      const { props } = renderSidebar({
        characters: [{ name: 'Gandalf' }, { name: 'Saruman' }],
      });
      fireEvent.click(screen.getByRole('button', { name: 'Saruman' }));
      expect(props.onCharacterClick).toHaveBeenCalledTimes(1);
      expect(props.onCharacterClick).toHaveBeenCalledWith({ name: 'Saruman' });
    });
  });

  describe('dice tray integration', () => {
    it('renders the dice tray inside the sidebar', () => {
      renderSidebar();
      expect(screen.getByTitle('Roll d20')).toBeInTheDocument();
    });

    it('opens the DicePopup overlay when a die is rolled', () => {
      const { container } = renderSidebar();
      fireEvent.click(screen.getByTitle('Roll d20'));
      expect(container.querySelector('.dice-tray-popup-overlay')).toBeInTheDocument();
    });

    it('closes the DicePopup when the overlay is clicked', () => {
      const { container } = renderSidebar();
      fireEvent.click(screen.getByTitle('Roll d20'));
      expect(container.querySelector('.dice-tray-popup-overlay')).toBeInTheDocument();

      fireEvent.click(container.querySelector('.dice-tray-popup-overlay'));
      expect(container.querySelector('.dice-tray-popup-overlay')).not.toBeInTheDocument();
    });
  });
});
