import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar.jsx';

const baseProps = {
  campaignName: 'Test Campaign',
  characters: [],
  activeCharacter: null,
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
  isLocalhost: true,
};

function renderSidebar(props = {}) {
  return render(<Sidebar {...baseProps} {...props} />);
}

describe('Sidebar', () => {
  describe('rendering', () => {
    it('displays the campaign name', () => {
      renderSidebar();
      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    });

    it('renders Maps label on localhost, Map label on non-localhost', () => {
      renderSidebar({ isLocalhost: true });
      expect(screen.getByText('Maps')).toBeInTheDocument();

      renderSidebar({ isLocalhost: false });
      expect(screen.getByText('Map')).toBeInTheDocument();
    });

    it.each([
      { label: /Encounters/ },
      { label: /Factions/ },
      { label: /NPCs/ },
      { label: /Quests/ },
      { label: /Settlements/ },
    ])('renders %s button on localhost', ({ label }) => {
      renderSidebar({ isLocalhost: true });
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it.each([
      { label: /Encounters/ },
      { label: /Factions/ },
      { label: /NPCs/ },
      { label: /Quests/ },
      { label: /Settlements/ },
    ])('does not render %s button on non-localhost', ({ label }) => {
      renderSidebar({ isLocalhost: false });
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });

    it('renders character names when characters exist', () => {
      renderSidebar({
        characters: [{ name: 'Aragorn' }, { name: 'Legolas' }],
      });
      expect(screen.getByText('Aragorn')).toBeInTheDocument();
      expect(screen.getByText('Legolas')).toBeInTheDocument();
    });

    it('renders without character buttons when characters list is empty', () => {
      renderSidebar({ characters: [] });
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.queryByText('Aragorn')).not.toBeInTheDocument();
    });

    it.each([
      { label: /Initiative/ },
      { label: /Log/ },
      { label: /Notes/ },
      { label: /Rules/ },
    ])('always renders %s regardless of localhost', ({ label }) => {
      renderSidebar({ isLocalhost: false });
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('event handlers', () => {
    it('calls onBackToCampaigns when Campaigns button is clicked', () => {
      renderSidebar();
      fireEvent.click(screen.getByText(/Campaigns/));
      expect(baseProps.onBackToCampaigns).toHaveBeenCalledTimes(1);
    });

    it('calls onAddCharacter when Add Character button is clicked', () => {
      renderSidebar();
      fireEvent.click(screen.getByText(/Add Character/));
      expect(baseProps.onAddCharacter).toHaveBeenCalledTimes(1);
    });

    it('calls onInitiativeClick when Initiative button is clicked', () => {
      renderSidebar();
      fireEvent.click(screen.getByText(/Initiative/));
      expect(baseProps.onInitiativeClick).toHaveBeenCalledTimes(1);
    });

    it('calls onLogClick when Log button is clicked', () => {
      renderSidebar();
      fireEvent.click(screen.getByText(/Log/));
      expect(baseProps.onLogClick).toHaveBeenCalledTimes(1);
    });

    it('calls onMapsClick when Map/Maps button is clicked', () => {
      renderSidebar({ isLocalhost: true });
      fireEvent.click(screen.getByText('Maps'));
      expect(baseProps.onMapsClick).toHaveBeenCalledTimes(1);

      baseProps.onMapsClick.mockClear();
      renderSidebar({ isLocalhost: false });
      fireEvent.click(screen.getByText('Map'));
      expect(baseProps.onMapsClick).toHaveBeenCalledTimes(1);
    });

    it('calls onNotesClick when Notes button is clicked', () => {
      renderSidebar();
      fireEvent.click(screen.getByText(/Notes/));
      expect(baseProps.onNotesClick).toHaveBeenCalledTimes(1);
    });

    it('calls onRepairClick when Admin button is clicked on localhost', () => {
      renderSidebar({ isLocalhost: true });
      fireEvent.click(screen.getByText(/Admin/));
      expect(baseProps.onRepairClick).toHaveBeenCalledTimes(1);
    });

    it('does not render Admin button on non-localhost', () => {
      renderSidebar({ isLocalhost: false });
      expect(screen.queryByText(/Admin/)).not.toBeInTheDocument();
    });

    it('calls localhost-only handlers when those buttons are clicked', () => {
      renderSidebar({ isLocalhost: true });

      fireEvent.click(screen.getByText(/Encounters/));
      expect(baseProps.onEncounterClick).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Factions/));
      expect(baseProps.onFactionsClick).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/NPCs/));
      expect(baseProps.onNPCsClick).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Quests/));
      expect(baseProps.onQuestsClick).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Settlements/));
      expect(baseProps.onSettlementsClick).toHaveBeenCalledTimes(1);
    });

    it('opens rules URL in new tab when Rules clicked', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderSidebar();
      fireEvent.click(screen.getByText(/Rules/));
      expect(openSpy).toHaveBeenCalledWith(
        'https://paulgilchrist.github.io/dnd-tools/rules/general',
        '_blank'
      );
      openSpy.mockRestore();
    });
  });

  describe('button states', () => {
    it('does not render rename button in header', () => {
      renderSidebar({ isLocalhost: true });
      expect(screen.queryByTitle('Rename Campaign')).not.toBeInTheDocument();
    });

    it('does not render delete button in header', () => {
      renderSidebar({ isLocalhost: true });
      expect(screen.queryByTitle('Delete Campaign')).not.toBeInTheDocument();
    });
  });

  describe('active highlighting', () => {
    it('highlights active character button when charSheet is active', () => {
      renderSidebar({
        characters: [{ name: 'Aragorn' }, { name: 'Legolas' }],
        activeCharacter: { name: 'Legolas' },
        activeView: 'charSheet',
      });

      const buttons = Array.from(document.querySelectorAll('button.sidebar-link'));
      const legolasBtn = buttons.find(
        (btn) => btn.textContent === 'Legolas'
      );
      expect(legolasBtn).toHaveClass('active');

      const aragornBtn = buttons.find(
        (btn) => btn.textContent === 'Aragorn'
      );
      expect(aragornBtn).not.toHaveClass('active');
    });

    it('does not highlight character buttons when charSheet is not active', () => {
      renderSidebar({
        characters: [{ name: 'Aragorn' }, { name: 'Legolas' }],
        activeCharacter: { name: 'Legolas' },
        activeView: 'initiative',
      });

      const buttons = Array.from(document.querySelectorAll('button.sidebar-link'));
      buttons.forEach((btn) => {
        expect(btn).not.toHaveClass('active');
      });
    });

    it.each([
      { activeView: 'encounter', label: /Encounters/ },
      { activeView: 'factions', label: /Factions/ },
      { activeView: 'initiative', label: /Initiative/ },
      { activeView: 'campaignLog', label: /Log/ },
      { activeView: 'mapsManager', label: /Maps/ },
      { activeView: 'npcs', label: /NPCs/ },
      { activeView: 'notes', label: /Notes/ },
      { activeView: 'quests', label: /Quests/ },
      { activeView: 'settlements', label: /Settlements/ },
    ])(
      'shows active class on $label button when activeView is $activeView',
      ({ activeView, label }) => {
        renderSidebar({ isLocalhost: true, activeView });
        const buttons = Array.from(
          document.querySelectorAll('button.sidebar-section-header')
        );
        const matchingBtn = buttons.find((btn) => label.test(btn.textContent));
        expect(matchingBtn).toHaveClass('active');
      }
    );

    it('does not highlight buttons when activeView is not set', () => {
      renderSidebar({ isLocalhost: true, activeView: null });
      const buttons = Array.from(
        document.querySelectorAll('button.sidebar-section-header')
      );
      buttons.forEach((btn) => {
        expect(btn).not.toHaveClass('active');
      });
    });
  });

  describe('active view indicator', () => {
    it('shows the active view label in the indicator', () => {
      const { container } = renderSidebar({ activeView: 'initiative' });
      const indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator.textContent).toContain('Initiative');
    });

    it('shows the character name in the indicator when charSheet is active', () => {
      const { container } = renderSidebar({
        activeView: 'charSheet',
        activeCharacter: { name: 'Frodo' },
      });
      const indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator.textContent).toContain('Frodo');
    });

    it('does not render the indicator when activeView is null', () => {
      const { container } = renderSidebar({ activeView: null });
      expect(container.querySelector('.sidebar-active-indicator')).not.toBeInTheDocument();
    });

    it('shows the correct icon in the indicator for each view', () => {
      const { container, rerender } = renderSidebar({ activeView: 'initiative' });
      let indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator.querySelector('.fa-shield-alt')).toBeInTheDocument();

      rerender(<Sidebar {...baseProps} activeView="charSheet" activeCharacter={{ name: 'Test' }} />);
      indicator = container.querySelector('.sidebar-active-indicator');
      expect(indicator.querySelector('.fa-user')).toBeInTheDocument();
    });
  });

  describe('characters section', () => {
    it('always shows the characters section header', () => {
      renderSidebar({ characters: [] });
      expect(screen.getByText('Characters')).toBeInTheDocument();
    });

    it('calls onCharacterClick with the character object when clicked', () => {
      renderSidebar({
        characters: [{ name: 'Gandalf' }, { name: 'Saruman' }],
      });
      fireEvent.click(screen.getByText('Gandalf'));
      expect(baseProps.onCharacterClick).toHaveBeenCalledWith({ name: 'Gandalf' });
      expect(baseProps.onCharacterClick).toHaveBeenCalledTimes(1);
    });

    it('calls onCharacterClick with the correct character when multiple exist', () => {
      renderSidebar({
        characters: [{ name: 'Gimli' }, { name: 'Legolas' }],
      });
      fireEvent.click(screen.getByText('Legolas'));
      expect(baseProps.onCharacterClick).toHaveBeenCalledWith({ name: 'Legolas' });
    });
  });

  describe('dice tray integration', () => {
    it('renders dice tray buttons for all die types', () => {
      renderSidebar();
      const diceLabels = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
      for (const label of diceLabels) {
        expect(screen.getByTitle(`Roll ${label}`)).toBeInTheDocument();
      }
    });

    it('renders DicePopup overlay when a die is rolled', () => {
      const { container } = renderSidebar();
      const d20Btn = screen.getByTitle('Roll d20');
      fireEvent.click(d20Btn);
      expect(container.querySelector('.dice-tray-popup-overlay')).toBeInTheDocument();
    });

    it('closes DicePopup when overlay is clicked', () => {
      const { container } = renderSidebar();
      const d20Btn = screen.getByTitle('Roll d20');
      fireEvent.click(d20Btn);
      expect(container.querySelector('.dice-tray-popup-overlay')).toBeInTheDocument();

      const overlay = container.querySelector('.dice-tray-popup-overlay');
      fireEvent.click(overlay);
      expect(container.querySelector('.dice-tray-popup-overlay')).not.toBeInTheDocument();
    });
  });
});
