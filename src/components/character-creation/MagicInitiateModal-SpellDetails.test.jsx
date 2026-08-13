// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagicInitiateModal, createProps } from './MagicInitiateModal.fixtures.js';
import { renderMarkdown } from '../../services/ui/sanitize.js';

vi.mock('../../services/ui/sanitize.js', () => ({
  renderMarkdown: vi.fn((md) => `<p>${md}</p>`),
}));

const findSelectByLabel = (labelText) => {
  const label = screen.getByText(new RegExp(`^${labelText}:$`));
  return label.nextElementSibling;
};

describe('MagicInitiateModal - SpellDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMarkdown).mockReturnValue('<p>mocked</p>');
  });

  const setupWithSpell = (classValue, spellSelector) => {
    const props = createProps();
    render(<MagicInitiateModal {...props} />);
    fireEvent.click(screen.getByText('Add Another Instance'));
    const classSelect = document.querySelectorAll('.mi-selector-select')[0];
    fireEvent.change(classSelect, { target: { value: classValue } });
    const spellSelect = findSelectByLabel(spellSelector);
    fireEvent.change(spellSelect, { target: { value: spellSelect.querySelector('option:not([value=""])')?.value } });
    return props;
  };

  describe('SpellDetails subcomponent', () => {
    it('should not render spell details toggle when no spell is selected', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      expect(screen.queryByText(/details$/)).not.toBeInTheDocument();
    });

    it('should not render spell details toggle when class is selected but no spell is chosen', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      expect(screen.queryByText(/details$/)).not.toBeInTheDocument();
    });

    it('should toggle spell details expanded/collapsed', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      const toggleBtn = screen.getByText('Burning Hands details');
      // Initially collapsed
      expect(screen.queryByText('School: Evocation')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(toggleBtn);
      expect(screen.getByText('School: Evocation')).toBeInTheDocument();

      // Collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('School: Evocation')).not.toBeInTheDocument();
    });

    it('should show caret icon reflecting expanded state', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      const toggleBtn = screen.getByText('Burning Hands details');
      // Collapsed state shows right caret
      expect(toggleBtn.querySelector('.fa-caret-right')).toBeInTheDocument();
      expect(toggleBtn.querySelector('.fa-caret-down')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(toggleBtn);
      expect(toggleBtn.querySelector('.fa-caret-down')).toBeInTheDocument();
      expect(toggleBtn.querySelector('.fa-caret-right')).not.toBeInTheDocument();
    });

    it('should render spell school in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('School: Evocation')).toBeInTheDocument();
    });

    it('should render casting_time in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.getByText('Casting: 1 action')).toBeInTheDocument();
    });

    it('should render casting_time with bonus action value', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Sorcerer' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Expeditious Retreat' } });

      fireEvent.click(screen.getByText('Expeditious Retreat details'));
      expect(screen.getByText('Casting: bonus action')).toBeInTheDocument();
    });

    it('should render casting_time with reaction value', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Sorcerer' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Shield' } });

      fireEvent.click(screen.getByText('Shield details'));
      expect(screen.getByText('Casting: reaction')).toBeInTheDocument();
    });

    it('should NOT render Concentration when spell concentration is false', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.queryByText('Concentration')).not.toBeInTheDocument();
    });

    it('should render Concentration when spell concentration is true', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.getByText('Concentration')).toBeInTheDocument();
    });

    it('should render duration in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('Duration: Instantaneous')).toBeInTheDocument();
    });

    it('should render duration with concentration duration text', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.getByText('Duration: Concentration, up to 1 minute')).toBeInTheDocument();
    });

    it('should render components in details', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('Components: V, S')).toBeInTheDocument();
    });

    it('should NOT render components when spell has no components', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Command' } });

      fireEvent.click(screen.getByText('Command details'));
      expect(screen.queryByText(/Components/)).not.toBeInTheDocument();
    });

    it('should render damage type when spell has damage', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.getByText('Damage: Fire')).toBeInTheDocument();
    });

    it('should NOT render damage when spell has no damage', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Cleric' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Bless' } });

      fireEvent.click(screen.getByText('Bless details'));
      expect(screen.queryAllByText(/Damage:/).length).toBe(0);
    });

    it('should render material when spell has material', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Alarm' } });

      fireEvent.click(screen.getByText('Alarm details'));
      expect(screen.getByText(/Material.*bell/)).toBeInTheDocument();
    });

    it('should NOT render material when spell has no material', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.queryAllByText(/Material:/).length).toBe(0);
    });

    it('should render Ritual badge when spell has ritual=true', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Alarm' } });

      fireEvent.click(screen.getByText('Alarm details'));
      expect(screen.getByText('Ritual')).toBeInTheDocument();
    });

    it('should NOT render Ritual badge when spell has ritual=false', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(screen.queryByText('Ritual')).not.toBeInTheDocument();
    });

    it('should render spell description via renderMarkdown', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      fireEvent.click(screen.getByText('Burning Hands details'));
      expect(renderMarkdown).toHaveBeenCalledWith('Burst of flame.');
    });

    it('should render details for cantrips too', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));
      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      const cantrip1Select = findSelectByLabel('Cantrip 1');
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      expect(screen.getByText('Acid Splash details')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Acid Splash details'));
      expect(screen.getByText('School: Conjuration')).toBeInTheDocument();
    });

    it('should only allow one spell details panel to be expanded at a time', () => {
      const props = createProps();
      render(<MagicInitiateModal {...props} />);
      fireEvent.click(screen.getByText('Add Another Instance'));

      const classSelect = document.querySelectorAll('.mi-selector-select')[0];
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      // Select cantrip 1
      const cantrip1Select = findSelectByLabel('Cantrip 1');
      fireEvent.change(cantrip1Select, { target: { value: 'Acid Splash' } });

      // Select cantrip 2
      const cantrip2Select = findSelectByLabel('Cantrip 2');
      fireEvent.change(cantrip2Select, { target: { value: 'Chill Touch' } });

      // Select level 1 spell
      const level1Select = findSelectByLabel('Level 1 Spell');
      fireEvent.change(level1Select, { target: { value: 'Burning Hands' } });

      // Expand Acid Splash
      fireEvent.click(screen.getByText('Acid Splash details'));
      expect(screen.getByText('School: Conjuration')).toBeInTheDocument();
      // Other panels are collapsed
      expect(screen.queryByText('School: Necromancy')).not.toBeInTheDocument();
      expect(screen.queryByText('School: Evocation')).not.toBeInTheDocument();

      // Expand Chill Touch — Acid Splash should collapse
      fireEvent.click(screen.getByText('Chill Touch details'));
      expect(screen.getByText('School: Necromancy')).toBeInTheDocument();
      expect(screen.queryByText('School: Conjuration')).not.toBeInTheDocument();
    });
  });
});
