// @cleaned-by-ai
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NPCListItem from './NPCListItem.jsx';

vi.mock('../common/AvatarImage.jsx', () => ({
  default: vi.fn(({ name, imagePath, size, campaignName }) => (
    <div
      data-testid="avatar-image"
      data-name={name}
      data-image={imagePath}
      data-size={size}
      data-campaign={campaignName}
    >
      <img alt={`${name} avatar`} />
    </div>
  )),
}));

describe('NPCListItem', () => {
  const mockOnEdit = vi.fn();
  const mockOnAddToInitiative = vi.fn();

  const baseNPC = {
    name: 'Gandalf',
    race: '',
    classRole: '',
    attitude: '',
    tags: '',
    armorClass: undefined,
  };

  const renderListItem = (npcProps = {}, extraProps = {}) => {
    const npc = { ...baseNPC, ...npcProps };
    return render(
      <NPCListItem
        npc={npc}
        onEdit={mockOnEdit}
        onAddToInitiative={mockOnAddToInitiative}
        campaignName="test-campaign"
        {...extraProps}
      />
    );
  };

  const listItemFor = (name = 'Gandalf') =>
    screen.getByRole('button', { name: `Edit NPC: ${name}` });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic Rendering ───────────────────────────────────────────────

  describe('Basic rendering', () => {
    it('renders NPC name', () => {
      renderListItem();
      expect(screen.getByText('Gandalf')).toBeInTheDocument();
    });

    it('updates aria-label when NPC name changes', () => {
      renderListItem({ name: 'Aragorn' });
      expect(listItemFor('Aragorn')).toBeInTheDocument();
    });
  });

  // ── Avatar Image ──────────────────────────────────────────────────

  describe('Avatar image', () => {
    it('does not render an avatar when no imagePath is provided', () => {
      renderListItem();
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });

    it('renders avatar with name, imagePath, size and campaign when imagePath is provided', () => {
      renderListItem({ name: 'Aragorn', imagePath: '/images/aragorn.png' });
      const avatar = screen.getByTestId('avatar-image');
      expect(avatar).toHaveAttribute('data-name', 'Aragorn');
      expect(avatar).toHaveAttribute('data-image', '/images/aragorn.png');
      expect(avatar).toHaveAttribute('data-size', '36');
      expect(avatar).toHaveAttribute('data-campaign', 'test-campaign');
    });
  });

  // ── Stat Block Badge ──────────────────────────────────────────────

  describe('Stat block badge', () => {
    it('does not render badge when npc has no stat block', () => {
      renderListItem();
      expect(within(listItemFor()).queryByTitle('Has stat block')).not.toBeInTheDocument();
    });

    it('renders badge with shield icon when armorClass is numeric', () => {
      renderListItem({ armorClass: 15 });
      const badge = within(listItemFor()).getByTitle('Has stat block');
      expect(badge.querySelector('i.fa-solid.fa-shield')).toBeInTheDocument();
    });

    it('does not treat a string armorClass as a stat block', () => {
      renderListItem({ armorClass: '15' });
      expect(within(listItemFor()).queryByTitle('Has stat block')).not.toBeInTheDocument();
    });
  });

  // ── Attitude Badge ────────────────────────────────────────────────

  describe('Attitude badge', () => {
    it('does not render badge when attitude is empty', () => {
      renderListItem({ attitude: '' });
      expect(listItemFor().querySelector('.ct-list-attitude')).not.toBeInTheDocument();
    });

    it('renders badge with attitude text and title when set', () => {
      renderListItem({ attitude: 'positive' });
      const badge = listItemFor().querySelector('.ct-list-attitude');
      expect(badge).toHaveTextContent('positive');
      expect(badge).toHaveAttribute('title', 'positive');
    });

    it('applies inline style for negative attitude', () => {
      renderListItem({ attitude: 'negative' });
      const badge = listItemFor().querySelector('.ct-list-attitude');
      expect(badge.style.backgroundColor).toBeTruthy();
    });
  });

  // ── Subtitle (Race / ClassRole) ──────────────────────────────────

  describe('Subtitle', () => {
    it('does not render subtitle when race and classRole are empty', () => {
      renderListItem({ race: '', classRole: '' });
      expect(listItemFor().querySelector('.npcs-list-subtitle')).not.toBeInTheDocument();
    });

    it('renders race and classRole with separator when both are provided', () => {
      renderListItem({ race: 'Elf', classRole: 'Archer' });
      const subtitle = listItemFor().querySelector('.npcs-list-subtitle');
      expect(subtitle).toHaveTextContent('Elf');
      expect(subtitle).toHaveTextContent('Archer');
      expect(subtitle.querySelector('.npcs-list-separator')).toBeInTheDocument();
    });

    it.each([
      ['race only', { race: 'Human', classRole: '' }, 'Human'],
      ['classRole only', { race: '', classRole: 'Wizard' }, 'Wizard'],
    ])('renders %s without a separator', (_, subProps, expectedText) => {
      renderListItem(subProps);
      const subtitle = listItemFor().querySelector('.npcs-list-subtitle');
      expect(subtitle).toHaveTextContent(expectedText);
      expect(subtitle.querySelector('.npcs-list-separator')).not.toBeInTheDocument();
    });
  });

  // ── Tags ──────────────────────────────────────────────────────────

  describe('Tags', () => {
    it('does not render tags when tags is empty', () => {
      renderListItem({ tags: '' });
      expect(listItemFor().querySelector('.npcs-list-tags')).not.toBeInTheDocument();
    });

    it('renders tags with icon when tags provided', () => {
      renderListItem({ tags: 'ally, quest-giver' });
      const tagsEl = listItemFor().querySelector('.npcs-list-tags');
      expect(tagsEl).toHaveTextContent('ally, quest-giver');
      expect(tagsEl.querySelector('i.fa-solid.fa-tags')).toBeInTheDocument();
    });
  });

  // ── Add to Initiative Button ──────────────────────────────────────

  describe('Add to Initiative button', () => {
    it('does not render button when npc has no stat block', () => {
      renderListItem();
      expect(within(listItemFor()).queryByTitle('Add to Initiative')).not.toBeInTheDocument();
    });

    it('renders button when npc has stat block', () => {
      renderListItem({ armorClass: 15 });
      expect(within(listItemFor()).getByTitle('Add to Initiative')).toBeInTheDocument();
    });

    it('calls onAddToInitiative with the npc when clicked', () => {
      renderListItem({ armorClass: 15 });
      fireEvent.click(within(listItemFor()).getByTitle('Add to Initiative'));
      expect(mockOnAddToInitiative).toHaveBeenCalledWith({ ...baseNPC, armorClass: 15 });
    });
  });

  // ── Edit Callback ─────────────────────────────────────────────────

  describe('Edit callback', () => {
    it('calls onEdit with the npc object when clicked', () => {
      renderListItem();
      fireEvent.click(listItemFor());
      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gandalf', race: '', classRole: '', attitude: '', tags: '', armorClass: undefined })
      );
    });
  });

  // ── Keyboard Accessibility ────────────────────────────────────────

  describe('Keyboard accessibility', () => {
    it.each(['Enter', ' '])('calls onEdit on %s key press', (key) => {
      renderListItem();
      fireEvent.keyDown(listItemFor(), { key });
      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gandalf' })
      );
    });

    it('does not call onEdit for other keys', () => {
      renderListItem();
      fireEvent.keyDown(listItemFor(), { key: 'Escape' });
      expect(mockOnEdit).not.toHaveBeenCalled();
    });
  });
});
