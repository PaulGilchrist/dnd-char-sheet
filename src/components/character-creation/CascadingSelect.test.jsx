// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CascadingSelect from './CascadingSelect.jsx';

const makeOptions = () => [
  { name: 'Human', subraces: [{ index: 'hill', name: 'Hill' }, { index: 'high', name: 'High' }] },
  { name: 'Elf', subraces: [{ index: 'wood', name: 'Wood' }] },
];

const makeSubOptionsSelector = (options) => (selectedParentValue) => {
  const found = options.find((r) => r.name === selectedParentValue);
  return found ? found.subraces : [];
};

const baseProps = {
  label: 'Race',
  options: makeOptions(),
  subOptionsSelector: makeSubOptionsSelector(makeOptions()),
  fieldName: 'race',
  childFieldName: 'subrace',
  errorKey: 'subrace',
  loadingText: 'Loading races...',
  ruleset: '5e',
  formData: { race: { name: 'Human', subrace: { name: 'Hill', description: '' } } },
  onInputChange: vi.fn(),
  errors: {},
  childExtraFields: { description: '' },
};

describe('CascadingSelect', () => {
  describe('rendering', () => {
    it('should render parent dropdown with all options', () => {
      render(<CascadingSelect {...baseProps} />);
      expect(screen.getByRole('option', { name: 'Human' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Elf' })).toBeInTheDocument();
    });

    it('should render a placeholder option in the parent select', () => {
      const { container } = render(<CascadingSelect {...baseProps} formData={{ race: {} }} />);
      const [parentSelect] = container.querySelectorAll('select');
      expect(parentSelect.querySelector('option[value=""]')).toHaveTextContent('Select a race');
    });

    it('should render child dropdown when subOptions exist', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      expect(container.querySelectorAll('select').length).toBe(2);
      expect(screen.getByRole('option', { name: 'Hill' })).toBeInTheDocument();
    });

    it('should hide child dropdown when subOptions are empty', () => {
      const { container } = render(
        <CascadingSelect
          {...baseProps}
          formData={{ race: { name: 'Elf' } }}
          options={[{ name: 'Elf', subraces: [] }]}
          subOptionsSelector={makeSubOptionsSelector([{ name: 'Elf', subraces: [] }])}
        />
      );
      expect(container.querySelectorAll('select').length).toBe(1);
    });

    it('should select the correct parent value from formData', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      const [parentSelect] = container.querySelectorAll('select');
      expect(parentSelect.value).toBe('Human');
    });

    it('should select the correct child value from formData', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      const [, childSelect] = container.querySelectorAll('select');
      expect(childSelect.value).toBe('Hill');
    });

    it('should show empty parent select when formData has no race key', () => {
      const { container } = render(<CascadingSelect {...baseProps} formData={{}} />);
      const [parentSelect] = container.querySelectorAll('select');
      expect(parentSelect.value).toBe('');
    });

    it('should show empty child select when formData has no childFieldName', () => {
      const { container } = render(
        <CascadingSelect {...baseProps} formData={{ race: { name: 'Human' } }} />
      );
      const [, childSelect] = container.querySelectorAll('select');
      expect(childSelect.value).toBe('');
    });

    it('should append (Major) suffix to child label for 2024 ruleset using default label', () => {
      const { container } = render(<CascadingSelect {...baseProps} ruleset="2024" />);
      const labels = container.querySelectorAll('label');
      expect(labels[1].textContent).toContain('Race (Major)');
    });

    it('should append (Major) suffix to child label for 2024 ruleset using custom childLabel', () => {
      render(<CascadingSelect {...baseProps} childLabel="Subrace Type" ruleset="2024" />);
      expect(screen.getByText('Subrace Type (Major) *')).toBeInTheDocument();
    });

    it('should not append (Major) suffix for 5e ruleset', () => {
      const { container } = render(<CascadingSelect {...baseProps} ruleset="5e" />);
      const labels = container.querySelectorAll('label');
      expect(labels[1].textContent).toBe('Race *');
    });

    it('should use custom optionsKey for parent option values and display text', () => {
      const options = [
        { id: 'human', displayName: 'Humanoid' },
        { id: 'elf', displayName: 'Elven' },
      ];
      render(
        <CascadingSelect
          {...baseProps}
          options={options}
          optionsKey="displayName"
          subOptionsSelector={() => []}
        />
      );
      expect(screen.getByRole('option', { name: 'Humanoid' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Elven' })).toBeInTheDocument();
    });

    it('should use custom childOptionsKey for child option values and display text', () => {
      render(
        <CascadingSelect
          {...baseProps}
          options={[{ name: 'Human', subraces: [{ key: 'hill', label: 'Hill Dwarf' }] }]}
          subOptionsSelector={() => [{ key: 'hill', label: 'Hill Dwarf' }]}
          childOptionsKey="label"
        />
      );
      expect(screen.getByRole('option', { name: 'Hill Dwarf' })).toBeInTheDocument();
    });

    it('should use childOptionsIndexKey fallback for child option values', () => {
      render(
        <CascadingSelect
          {...baseProps}
          options={[{ name: 'Human', subraces: [{ index: 'hill', name: 'Hill' }] }]}
          subOptionsSelector={() => [{ index: 'hill', name: 'Hill' }]}
          childOptionsKey="nonexistent"
        />
      );
      expect(screen.getByRole('option', { name: 'hill' })).toBeInTheDocument();
    });

    it('should use optionsKey fallback to index for parent option values', () => {
      render(
        <CascadingSelect
          {...baseProps}
          options={[{ index: 'human', name: 'Human' }]}
          subOptionsSelector={() => []}
          optionsKey="nonexistent"
        />
      );
      expect(screen.getByRole('option', { name: 'human' })).toBeInTheDocument();
    });

    it('should display loading text when options array is empty', () => {
      render(
        <CascadingSelect
          {...baseProps}
          options={[]}
          subOptionsSelector={() => []}
        />
      );
      expect(screen.getByText('Loading races...')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onInputChange with parent value when parent changes', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      const [parentSelect] = container.querySelectorAll('select');

      fireEvent.change(parentSelect, { target: { value: 'Elf' } });
      expect(baseProps.onInputChange).toHaveBeenCalledWith('race', { name: 'Elf' });
    });

    it('should call onInputChange with empty name when parent is cleared', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      const [parentSelect] = container.querySelectorAll('select');

      fireEvent.change(parentSelect, { target: { value: '' } });
      expect(baseProps.onInputChange).toHaveBeenCalledWith('race', { name: '' });
    });

    it('should call onInputChange with child value merged with extraFields when child changes', () => {
      const options = [
        { name: 'Elf', subraces: [{ index: 'wood', name: 'Wood' }] },
      ];
      const props = {
        ...baseProps,
        options,
        subOptionsSelector: makeSubOptionsSelector(options),
        formData: { race: { name: 'Elf' } },
        childExtraFields: { description: '', feat: '' },
      };
      const { container } = render(<CascadingSelect {...props} />);
      const [, childSelect] = container.querySelectorAll('select');

      fireEvent.change(childSelect, { target: { value: 'Wood' } });
      expect(baseProps.onInputChange).toHaveBeenCalledWith(
        'race',
        expect.objectContaining({
          subrace: expect.objectContaining({ name: 'Wood', description: '', feat: '' }),
        })
      );
    });

    it('should clear child value when parent changes', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      const [parentSelect] = container.querySelectorAll('select');

      fireEvent.change(parentSelect, { target: { value: 'Elf' } });
      expect(baseProps.onInputChange).toHaveBeenCalledWith('race', { name: 'Elf' });
    });
  });

  describe('error display', () => {
    it('should display error messages for both parent and child fields', () => {
      render(
        <CascadingSelect
          {...baseProps}
          errors={{ race: 'Race is required', subrace: 'Subrace is required' }}
        />
      );
      expect(screen.getByText('Race is required')).toBeInTheDocument();
      expect(screen.getByText('Subrace is required')).toBeInTheDocument();
    });

    it('should apply error class to parent select when parent has error', () => {
      const { container } = render(
        <CascadingSelect {...baseProps} errors={{ race: 'Race is required' }} />
      );
      const [parentSelect] = container.querySelectorAll('select');
      expect(parentSelect).toHaveClass('error');
    });

    it('should apply error class to child select when child has error', () => {
      const { container } = render(
        <CascadingSelect {...baseProps} errors={{ subrace: 'Subrace is required' }} />
      );
      const [, childSelect] = container.querySelectorAll('select');
      expect(childSelect).toHaveClass('error');
    });

    it('should not apply error class when there are no errors', () => {
      const { container } = render(<CascadingSelect {...baseProps} />);
      const selects = container.querySelectorAll('select');
      expect(selects[0]).not.toHaveClass('error');
      expect(selects[1]).not.toHaveClass('error');
    });

    it('should not display error message when error key is absent', () => {
      render(<CascadingSelect {...baseProps} errors={{ race: 'Race is required' }} />);
      expect(screen.queryByText('Subrace is required')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle subOptionsSelector returning null', () => {
      render(
        <CascadingSelect
          {...baseProps}
          subOptionsSelector={() => null}
        />
      );
      expect(screen.queryByRole('option', { name: /Hill|Wood/ })).not.toBeInTheDocument();
    });

    it('should handle subOptionsSelector returning undefined', () => {
      render(
        <CascadingSelect
          {...baseProps}
          subOptionsSelector={() => undefined}
        />
      );
      expect(screen.queryByRole('option', { name: /Hill|Wood/ })).not.toBeInTheDocument();
    });

    it('should render with undefined formData field gracefully', () => {
      const { container } = render(
        <CascadingSelect {...baseProps} formData={{ race: undefined }} />
      );
      const [parentSelect] = container.querySelectorAll('select');
      expect(parentSelect.value).toBe('');
    });
  });
});
