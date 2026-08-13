import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NPCListItem from './NPCListItem.jsx';

vi.mock('../../services/encounters/npcStatBlockUtils.js', () => ({
  npcHasStatBlock: vi.fn(),
}));

vi.mock('../../services/npcs/npcFormUtils.js', () => ({
  getAttitudeStyle: vi.fn((_attitude) => ({
    backgroundColor: '#1b4332',
    color: '#b7e4c7',
    borderColor: '#40916c',
  })),
}));

vi.mock('../common/AvatarImage.jsx', () => ({
  default: vi.fn(({ name, campaignName }) => (
    <div data-testid="avatar-image" data-name={name} data-campaign={campaignName}>
      <img alt={`${name} avatar`} />
    </div>
  )),
}));

import { npcHasStatBlock } from '../../services/encounters/npcStatBlockUtils.js';
import AvatarImage from '../common/AvatarImage.jsx';

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic Rendering ───────────────────────────────────────────────

  describe('Basic rendering', () => {
    it('renders NPC name', () => {
      renderListItem();
      expect(screen.getByText('Gandalf')).toBeInTheDocument();
    });

    it('renders as a clickable element with accessibility attributes', () => {
      renderListItem();
      const listItem = screen.getByRole('button', { name: 'Edit NPC: Gandalf' });
      expect(listItem).toBeInTheDocument();
      expect(listItem).toHaveClass('ct-list-item');
      expect(listItem).toHaveAttribute('aria-label', 'Edit NPC: Gandalf');
      expect(listItem).toHaveAttribute('tabIndex', '0');
    });

    it('updates aria-label when NPC name changes', () => {
      renderListItem({ name: 'Aragorn' });
      expect(screen.getByRole('button', { name: 'Edit NPC: Aragorn' })).toBeInTheDocument();
    });

    it('renders as an li element', () => {
      renderListItem();
      const listItem = screen.getByRole('button');
      expect(listItem.tagName).toBe('LI');
    });
  });

  // ── Avatar Image ──────────────────────────────────────────────────

  describe('Avatar image', () => {
    it('does not render AvatarImage when no imagePath', () => {
      renderListItem();
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
      expect(AvatarImage).not.toHaveBeenCalled();
    });

    it('renders AvatarImage with correct name when imagePath provided', () => {
      renderListItem({ name: 'Aragorn', imagePath: '/images/aragorn.png' });
      expect(AvatarImage).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'Aragorn', imagePath: '/images/aragorn.png', size: 36, campaignName: 'test-campaign' }),
        undefined
      );
    });

    it('passes campaignName to AvatarImage', () => {
      renderListItem({ imagePath: '/img.png' }, { campaignName: 'my-campaign' });
      expect(AvatarImage).toHaveBeenLastCalledWith(
        expect.objectContaining({ campaignName: 'my-campaign' }),
        undefined
      );
    });
  });

  // ── Stat Block Badge ──────────────────────────────────────────────

  describe('Stat block badge', () => {
    it('does not render badge when npc has no stat block', () => {
      npcHasStatBlock.mockReturnValue(false);
      renderListItem();
      expect(screen.queryByTitle('Has stat block')).not.toBeInTheDocument();
    });

    it('renders badge with icon when npc has stat block', () => {
      npcHasStatBlock.mockReturnValue(true);
      renderListItem({ armorClass: 15 });
      const badge = screen.getByTitle('Has stat block');
      expect(badge).toBeInTheDocument();
      expect(badge.querySelector('i.fa-solid.fa-shield')).toBeInTheDocument();
    });
  });

  // ── Attitude Badge ────────────────────────────────────────────────

  describe('Attitude badge', () => {
    it('does not render badge when attitude is empty', () => {
      renderListItem({ attitude: '' });
      expect(screen.queryByLabelText('')).not.toBeInTheDocument();
      expect(document.querySelector('.ct-list-attitude')).not.toBeInTheDocument();
    });

    it('renders badge with attitude text and title when set', () => {
      renderListItem({ attitude: 'positive' });
      const badge = document.querySelector('.ct-list-attitude');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('positive');
      expect(badge).toHaveAttribute('title', 'positive');
    });

    it('applies attitude styles from getAttitudeStyle', () => {
      renderListItem({ attitude: 'positive' });
      const badge = document.querySelector('.ct-list-attitude');
      expect(badge.style.backgroundColor).toBe('rgb(27, 67, 50)');
    });
  });

  // ── Subtitle (Race / ClassRole) ──────────────────────────────────

  describe('Subtitle', () => {
    it('does not render subtitle when race and classRole are empty', () => {
      renderListItem({ race: '', classRole: '' });
      expect(document.querySelector('.npcs-list-subtitle')).not.toBeInTheDocument();
    });

    it('renders race and classRole with separator when both are provided', () => {
      renderListItem({ race: 'Elf', classRole: 'Archer' });
      const subtitle = document.querySelector('.npcs-list-subtitle');
      expect(subtitle).toHaveTextContent('Elf');
      expect(subtitle).toHaveTextContent('Archer');
      expect(document.querySelector('.npcs-list-separator')).toBeInTheDocument();
    });

    it.each([
      ['race only', { race: 'Human', classRole: '' }, 'Human'],
      ['classRole only', { race: '', classRole: 'Wizard' }, 'Wizard'],
    ])('renders %s', (_, subProps, expectedText) => {
      renderListItem(subProps);
      const subtitle = document.querySelector('.npcs-list-subtitle');
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveTextContent(expectedText);
    });
  });

  // ── Tags ──────────────────────────────────────────────────────────

  describe('Tags', () => {
    it('does not render tags when tags is empty', () => {
      renderListItem({ tags: '' });
      expect(document.querySelector('.npcs-list-tags')).not.toBeInTheDocument();
    });

    it('renders tags with icon when tags provided', () => {
      renderListItem({ tags: 'ally, quest-giver' });
      const tagsEl = document.querySelector('.npcs-list-tags');
      expect(tagsEl).toBeInTheDocument();
      expect(tagsEl).toHaveTextContent('ally, quest-giver');
      expect(tagsEl.querySelector('i.fa-solid.fa-tags')).toBeInTheDocument();
    });
  });

  // ── Add to Initiative Button ──────────────────────────────────────

  describe('Add to Initiative button', () => {
    it('does not render button when npc has no stat block', () => {
      npcHasStatBlock.mockReturnValue(false);
      renderListItem();
      expect(screen.queryByTitle('Add to Initiative')).not.toBeInTheDocument();
    });

    it('renders button when npc has stat block', () => {
      npcHasStatBlock.mockReturnValue(true);
      renderListItem({ armorClass: 15 });
      expect(screen.getByTitle('Add to Initiative')).toBeInTheDocument();
    });

    it('calls onAddToInitiative when clicked', () => {
      npcHasStatBlock.mockReturnValue(true);
      renderListItem({ armorClass: 15 });
      const btn = screen.getByTitle('Add to Initiative');
      fireEvent.click(btn);
      expect(mockOnAddToInitiative).toHaveBeenCalledWith({ ...baseNPC, armorClass: 15 });
    });

    it('stops propagation when clicked to prevent parent edit trigger', () => {
      npcHasStatBlock.mockReturnValue(true);
      renderListItem({ armorClass: 15 });
      const btn = screen.getByTitle('Add to Initiative');
      fireEvent.click(btn);
      expect(mockOnEdit).not.toHaveBeenCalled();
    });
  });

  // ── Edit Callback ─────────────────────────────────────────────────

  describe('Edit callback', () => {
    it('calls onEdit with the npc object when clicked', () => {
      renderListItem();
      const listItem = screen.getByRole('button', { name: 'Edit NPC: Gandalf' });
      fireEvent.click(listItem);
      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gandalf', race: '', classRole: '', attitude: '', tags: '', armorClass: undefined })
      );
    });
  });

  // ── Keyboard Accessibility ────────────────────────────────────────

  describe('Keyboard accessibility', () => {
    it.each(['Enter', ' '])('calls onEdit on %s key press', (key) => {
      renderListItem();
      const listItem = screen.getByRole('button', { name: 'Edit NPC: Gandalf' });
      fireEvent.keyDown(listItem, { key });
      expect(mockOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gandalf' })
      );
    });

    it('does not call onEdit for other keys', () => {
      renderListItem();
      const listItem = screen.getByRole('button', { name: 'Edit NPC: Gandalf' });
      fireEvent.keyDown(listItem, { key: 'Escape' });
      expect(mockOnEdit).not.toHaveBeenCalled();
    });
  });
});
