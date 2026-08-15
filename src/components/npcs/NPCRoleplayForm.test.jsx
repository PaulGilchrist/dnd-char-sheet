// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NPCRoleplayForm from './NPCRoleplayForm.jsx';
import { ATTITUDE_OPTIONS } from '../../services/npcs/npcFormUtils.js';

describe('NPCRoleplayForm', () => {
  const mockOnFieldChange = vi.fn();

  const defaultFormData = {
    race: 'Human',
    classRole: 'Wizard',
    attitude: 'neutral',
    appearance: 'Tall with a long beard',
    personality: 'Wise and mysterious',
    goals: 'Defeat Sauron',
    secrets: 'He is a Maia',
    notes: 'Carries a staff',
    tags: 'ally, quest-giver',
  };

  const renderForm = (formData = defaultFormData) =>
    render(<NPCRoleplayForm formData={formData} onFieldChange={mockOnFieldChange} />);

  beforeEach(() => {
    mockOnFieldChange.mockClear();
  });

  // ── Mount behavior ──────────────────────────────────────────────────

  describe('Mount behavior', () => {
    it('does not call onFieldChange on initial render', () => {
      renderForm();
      expect(mockOnFieldChange).not.toHaveBeenCalled();
    });
  });

  // ── Text inputs ─────────────────────────────────────────────────────

  describe('Text inputs', () => {
    const textFields = [
      { label: 'Race', id: 'npc-race', key: 'race', placeholder: 'e.g., Human, Elf, Dwarf', value: 'Human' },
      { label: 'Class / Role', id: 'npc-classRole', key: 'classRole', placeholder: 'e.g., Fighter, Wizard, Merchant', value: 'Wizard' },
      { label: 'Tags (comma separated)', id: 'npc-tags', key: 'tags', placeholder: 'e.g., ally, enemy, quest-giver', value: 'ally, quest-giver' },
    ];

    it.each(textFields)('associates the "$label" label with its input', ({ label, id }) => {
      renderForm();
      expect(screen.getByLabelText(label)).toHaveAttribute('id', id);
    });

    it.each(textFields)('renders the "$label" input with its placeholder', ({ label, placeholder }) => {
      renderForm();
      expect(screen.getByLabelText(label)).toHaveAttribute('placeholder', placeholder);
    });

    it.each(textFields)('displays the current "$key" value in the "$label" input', ({ label, value }) => {
      renderForm();
      expect(screen.getByLabelText(label)).toHaveValue(value);
    });

    it('renders empty text inputs when formData values are empty', () => {
      renderForm({ ...defaultFormData, race: '', classRole: '', tags: '' });
      for (const { label } of textFields) {
        expect(screen.getByLabelText(label)).toHaveValue('');
      }
    });

    it.each([
      { label: 'Race', key: 'race', typed: 'Elf' },
      { label: 'Class / Role', key: 'classRole', typed: 'Rogue' },
      { label: 'Tags (comma separated)', key: 'tags', typed: 'boss, dragon' },
      { label: 'Race', key: 'race', typed: '' },
      { label: 'Class / Role', key: 'classRole', typed: "O'Brien" },
    ])('reports only the "$label" change with the "$key" key', ({ label, key, typed }) => {
      renderForm();
      fireEvent.change(screen.getByLabelText(label), { target: { value: typed } });
      expect(mockOnFieldChange).toHaveBeenCalledTimes(1);
      expect(mockOnFieldChange).toHaveBeenCalledWith(key, typed);
    });
  });

  // ── Attitude select ─────────────────────────────────────────────────

  describe('Attitude select', () => {
    it('renders a select labeled "Attitude"', () => {
      renderForm();
      expect(screen.getByLabelText('Attitude')).toHaveAttribute('id', 'npc-attitude');
    });

    it('shows the initial attitude value', () => {
      renderForm();
      expect(screen.getByLabelText('Attitude')).toHaveValue('neutral');
    });

    it('shows a provided non-default attitude value', () => {
      renderForm({ ...defaultFormData, attitude: 'negative' });
      expect(screen.getByLabelText('Attitude')).toHaveValue('negative');
    });

    it('renders every option from ATTITUDE_OPTIONS', () => {
      renderForm();
      const options = Array.from(screen.getByLabelText('Attitude').querySelectorAll('option'));
      expect(options).toHaveLength(ATTITUDE_OPTIONS.length);
      for (const option of ATTITUDE_OPTIONS) {
        expect(options.find((o) => o.value === option.value)).toHaveTextContent(option.label);
      }
    });

    it('reports only the attitude change', () => {
      renderForm();
      fireEvent.change(screen.getByLabelText('Attitude'), { target: { value: 'positive' } });
      expect(mockOnFieldChange).toHaveBeenCalledTimes(1);
      expect(mockOnFieldChange).toHaveBeenCalledWith('attitude', 'positive');
    });
  });

  // ── PreviewToggle fields ────────────────────────────────────────────

  describe('PreviewToggle fields', () => {
    const previewFields = [
      { label: 'Appearance', key: 'appearance', placeholder: 'Physical description…', value: 'Tall with a long beard' },
      { label: 'Personality', key: 'personality', placeholder: 'Personality traits, ideals, bonds, flaws…', value: 'Wise and mysterious' },
      { label: 'Goals', key: 'goals', placeholder: 'What does this NPC want?', value: 'Defeat Sauron' },
      { label: 'Secrets', key: 'secrets', placeholder: 'Hidden truths about this NPC…', value: 'He is a Maia' },
      { label: 'Notes', key: 'notes', placeholder: 'Additional notes…', value: 'Carries a staff' },
    ];

    it.each(previewFields)('renders the "$label" field with its current value', ({ label, value }) => {
      renderForm();
      expect(screen.getByLabelText(label)).toHaveValue(value);
    });

    it.each(previewFields)('renders the "$label" textarea with its placeholder', ({ label, placeholder }) => {
      renderForm();
      expect(screen.getByLabelText(label)).toHaveAttribute('placeholder', placeholder);
    });

    it('renders empty textareas when preview values are empty', () => {
      renderForm({
        ...defaultFormData,
        appearance: '',
        personality: '',
        goals: '',
        secrets: '',
        notes: '',
      });
      for (const { label } of previewFields) {
        expect(screen.getByLabelText(label)).toHaveValue('');
      }
    });

    it.each(previewFields)('reports only the "$key" change from the "$label" textarea', ({ label, key }) => {
      renderForm();
      fireEvent.change(screen.getByLabelText(label), { target: { value: 'Updated text' } });
      expect(mockOnFieldChange).toHaveBeenCalledTimes(1);
      expect(mockOnFieldChange).toHaveBeenCalledWith(key, 'Updated text');
    });
  });
});
