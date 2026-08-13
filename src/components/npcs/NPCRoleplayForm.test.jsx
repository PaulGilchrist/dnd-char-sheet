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
    it('renders race and tags inputs with correct labels, htmlFor, and id pairs', () => {
      renderForm();
      const raceInput = screen.getByLabelText('Race');
      expect(raceInput).toHaveAttribute('id', 'npc-race');

      const label = document.querySelector('label[for="npc-race"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Race');
    });

    it('renders text inputs with correct placeholder text', () => {
      renderForm();
      expect(screen.getByLabelText('Race')).toHaveAttribute('placeholder', 'e.g., Human, Elf, Dwarf');
      expect(screen.getByLabelText('Class / Role')).toHaveAttribute('placeholder', 'e.g., Fighter, Wizard, Merchant');
      expect(screen.getByLabelText(/Tags/)).toHaveAttribute('placeholder', 'e.g., ally, enemy, quest-giver');
    });

    it('renders text inputs with correct CSS classes', () => {
      renderForm();
      expect(screen.getByLabelText('Race')).toHaveClass('ct-input');
      expect(screen.getByLabelText('Class / Role')).toHaveClass('ct-input');
      expect(screen.getByLabelText(/Tags/)).toHaveClass('ct-input');
    });

    it('reports field changes for race', () => {
      renderForm();
      const raceInput = screen.getByLabelText('Race');
      fireEvent.change(raceInput, { target: { value: 'Elf' } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('race', 'Elf');
    });

    it('reports field changes for classRole', () => {
      renderForm();
      const classRoleInput = screen.getByLabelText('Class / Role');
      fireEvent.change(classRoleInput, { target: { value: 'Rogue' } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('classRole', 'Rogue');
    });

    it('reports field changes for tags', () => {
      renderForm();
      const tagsInput = screen.getByLabelText(/Tags/);
      fireEvent.change(tagsInput, { target: { value: 'boss, dragon' } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('tags', 'boss, dragon');
    });

    it('handles empty string input changes', () => {
      renderForm();
      const raceInput = screen.getByLabelText('Race');
      fireEvent.change(raceInput, { target: { value: '' } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('race', '');
    });

    it('handles special characters in text inputs', () => {
      renderForm();
      const raceInput = screen.getByLabelText('Race');
      fireEvent.change(raceInput, { target: { value: "O'Brien" } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('race', "O'Brien");
    });

    it('displays initial values in text inputs', () => {
      renderForm({ ...defaultFormData, race: '', classRole: '', tags: '' });
      expect(screen.getByLabelText('Race')).toHaveValue('');
      expect(screen.getByLabelText('Class / Role')).toHaveValue('');
      expect(screen.getByLabelText(/Tags/)).toHaveValue('');
    });
  });

  // ── Attitude select ─────────────────────────────────────────────────

  describe('Attitude select', () => {
    it('renders with correct label and CSS class', () => {
      renderForm();
      const select = screen.getByLabelText('Attitude');
      expect(select).toHaveClass('ct-select');
    });

    it('defaults to neutral attitude value', () => {
      renderForm();
      expect(screen.getByLabelText('Attitude').value).toBe('neutral');
    });

    it('renders all attitude options from ATTITUDE_OPTIONS', () => {
      renderForm();
      const select = screen.getByLabelText('Attitude');
      const options = Array.from(select.querySelectorAll('option'));
      expect(options).toHaveLength(ATTITUDE_OPTIONS.length);
      for (const option of ATTITUDE_OPTIONS) {
        expect(options.find((o) => o.value === option.value)).toHaveTextContent(option.label);
      }
    });

    it('reports attitude changes', () => {
      renderForm();
      const select = screen.getByLabelText('Attitude');
      fireEvent.change(select, { target: { value: 'positive' } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('attitude', 'positive');
    });
  });

  // ── PreviewToggle fields ────────────────────────────────────────────

  describe('PreviewToggle fields', () => {
    const previewFields = [
      { label: 'Appearance', key: 'appearance', placeholder: 'Physical description…' },
      { label: 'Personality', key: 'personality', placeholder: 'Personality traits, ideals, bonds, flaws…' },
      { label: 'Goals', key: 'goals', placeholder: 'What does this NPC want?' },
      { label: 'Secrets', key: 'secrets', placeholder: 'Hidden truths about this NPC…' },
      { label: 'Notes', key: 'notes', placeholder: 'Additional notes…' },
    ];

    it('renders all PreviewToggle fields with labels and textareas', () => {
      renderForm();
      for (const field of previewFields) {
        expect(screen.getByText(field.label)).toBeInTheDocument();
      }
    });

    it('renders textareas with correct placeholders', () => {
      renderForm();
      for (const field of previewFields) {
        const textarea = screen.getByPlaceholderText(field.placeholder);
        expect(textarea).toBeInTheDocument();
      }
    });

    it('reports textarea changes', () => {
      renderForm();
      const textarea = screen.getByDisplayValue('Tall with a long beard');
      fireEvent.change(textarea, { target: { value: 'Short and stout' } });
      expect(mockOnFieldChange).toHaveBeenCalledWith('appearance', 'Short and stout');
    });

    it('renders empty textareas when values are empty', () => {
      renderForm({
        ...defaultFormData,
        appearance: '',
        personality: '',
        goals: '',
        secrets: '',
        notes: '',
      });
      const textareas = document.querySelectorAll('.preview-toggle-textarea');
      expect(textareas).toHaveLength(5);
      for (const textarea of textareas) {
        expect(textarea).toHaveValue('');
      }
    });

    it('displays initial values in textareas', () => {
      renderForm();
      expect(screen.getByDisplayValue('Tall with a long beard')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Wise and mysterious')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Defeat Sauron')).toBeInTheDocument();
      expect(screen.getByDisplayValue('He is a Maia')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Carries a staff')).toBeInTheDocument();
    });

    it('toggles between preview and edit modes', () => {
      renderForm();
      const textarea = screen.getByDisplayValue('Tall with a long beard');
      const wrapper = textarea.closest('.preview-toggle-wrapper');
      const previewButton = wrapper.querySelector('.preview-toggle-button');

      expect(textarea).not.toHaveClass('preview-toggle-textarea--hidden');
      expect(previewButton).toHaveTextContent('Preview');

      fireEvent.click(previewButton);

      expect(textarea).toHaveClass('preview-toggle-textarea--hidden');
      expect(previewButton).toHaveTextContent('Edit');

      fireEvent.click(previewButton);

      expect(textarea).not.toHaveClass('preview-toggle-textarea--hidden');
      expect(previewButton).toHaveTextContent('Preview');
    });

    it('shows rendered markdown preview when toggled', () => {
      renderForm();
      const textarea = screen.getByDisplayValue('Tall with a long beard');
      const wrapper = textarea.closest('.preview-toggle-wrapper');
      const previewButton = wrapper.querySelector('.preview-toggle-button');

      fireEvent.click(previewButton);

      const previewDiv = wrapper.querySelector('.preview-toggle-preview');
      expect(previewDiv).not.toHaveClass('preview-toggle-preview--hidden');
      expect(previewDiv.querySelector('.markdown-preview')).toBeInTheDocument();
    });

    it('shows nothing in preview when value is empty', () => {
      renderForm({
        ...defaultFormData,
        appearance: '',
      });
      const textarea = screen.getByDisplayValue('');
      const wrapper = textarea.closest('.preview-toggle-wrapper');
      const previewButton = wrapper?.querySelector('.preview-toggle-button');

      fireEvent.click(previewButton);

      const previewDiv = wrapper?.querySelector('.preview-toggle-preview');
      expect(previewDiv).not.toHaveClass('preview-toggle-preview--hidden');
      expect(previewDiv?.querySelector('.markdown-preview')).not.toBeInTheDocument();
    });

    it('toggles each PreviewToggle independently', () => {
      renderForm();
      const appearanceTextarea = screen.getByDisplayValue('Tall with a long beard');
      const personalityTextarea = screen.getByDisplayValue('Wise and mysterious');

      const appearanceWrapper = appearanceTextarea.closest('.preview-toggle-wrapper');
      const personalityWrapper = personalityTextarea.closest('.preview-toggle-wrapper');

      const appearanceButton = appearanceWrapper.querySelector('.preview-toggle-button');
      const personalityButton = personalityWrapper.querySelector('.preview-toggle-button');

      // Toggle Appearance to preview
      fireEvent.click(appearanceButton);
      expect(appearanceTextarea).toHaveClass('preview-toggle-textarea--hidden');
      expect(personalityTextarea).not.toHaveClass('preview-toggle-textarea--hidden');

      // Toggle Personality to preview
      fireEvent.click(personalityButton);
      expect(appearanceTextarea).toHaveClass('preview-toggle-textarea--hidden');
      expect(personalityTextarea).toHaveClass('preview-toggle-textarea--hidden');

      // Toggle Appearance back to edit
      const appearanceEditButton = appearanceWrapper.querySelector('.preview-toggle-button');
      fireEvent.click(appearanceEditButton);
      expect(appearanceTextarea).not.toHaveClass('preview-toggle-textarea--hidden');
      expect(personalityTextarea).toHaveClass('preview-toggle-textarea--hidden');
    });
  });
});
