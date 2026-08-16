// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PreviewToggle from './PreviewToggle.jsx';

describe('PreviewToggle', () => {
    describe('initial render', () => {
        it('renders a textarea with the initial value and default rows', () => {
            render(<PreviewToggle value="Hello world" onChange={() => {}} />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveValue('Hello world');
            expect(textarea).toHaveAttribute('rows', '4');
        });

        it('renders the toggle button with Preview label and correct aria-label', () => {
            render(<PreviewToggle value="" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            expect(button).toHaveTextContent('Preview');
            expect(button).toHaveAttribute('aria-label', 'Switch to preview mode');
        });

        it('does not show the preview div initially', () => {
            render(<PreviewToggle value="**bold**" onChange={() => {}} />);
            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv).toHaveClass('preview-toggle-preview--hidden');
        });

        it('does not render MarkdownPreview when value is empty', () => {
            render(<PreviewToggle value="" onChange={() => {}} />);
            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv.querySelector('.markdown-preview')).toBeNull();
        });

        it('does not render a label when none is provided', () => {
            render(<PreviewToggle value="" onChange={() => {}} />);
            expect(document.querySelector('.preview-toggle-label')).toBeNull();
        });

        it('renders textarea with type=button toggle', () => {
            render(<PreviewToggle value="" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            expect(button).toHaveAttribute('type', 'button');
        });
    });

    describe('label and placeholder', () => {
        it('renders a label element with the provided text', () => {
            render(
                <PreviewToggle
                    value=""
                    onChange={() => {}}
                    id="description"
                    label="Description"
                />
            );
            expect(screen.getByText('Description')).toBeInTheDocument();
            expect(document.querySelector('.preview-toggle-label')).toBeInTheDocument();
        });

        it('associates the label with the textarea via htmlFor', () => {
            render(
                <PreviewToggle
                    value=""
                    onChange={() => {}}
                    id="my-id"
                    label="My Label"
                />
            );
            const label = document.querySelector('.preview-toggle-label');
            expect(label).toHaveAttribute('for', 'my-id');
        });

        it('renders textarea with placeholder', () => {
            render(
                <PreviewToggle
                    value=""
                    onChange={() => {}}
                    placeholder="Enter text..."
                />
            );
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveAttribute('placeholder', 'Enter text...');
        });
    });

    describe('props passthrough', () => {
        it('passes the id prop to the textarea', () => {
            render(
                <PreviewToggle
                    value=""
                    onChange={() => {}}
                    id="my-textarea"
                />
            );
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveAttribute('id', 'my-textarea');
        });

        it('applies custom rows to textarea', () => {
            render(
                <PreviewToggle
                    value=""
                    onChange={() => {}}
                    rows={8}
                />
            );
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveAttribute('rows', '8');
        });

        it('applies custom minHeight to textarea', () => {
            render(<PreviewToggle value="text" onChange={() => {}} minHeight="200px" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveStyle({ minHeight: '200px' });
        });

        it('applies custom minHeight to preview when in preview mode', () => {
            render(<PreviewToggle value="text" onChange={() => {}} minHeight="200px" />);
            const button = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(button);

            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv).toHaveStyle({ minHeight: '200px' });
        });

        it('passes className to the textarea', () => {
            render(<PreviewToggle value="" onChange={() => {}} className="custom-class" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('custom-class');
        });

        it('preserves base textarea class alongside custom className', () => {
            render(<PreviewToggle value="" onChange={() => {}} className="custom-class" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('preview-toggle-textarea');
        });
    });

    describe('toggle behavior', () => {
        it('toggles to preview mode on first click', () => {
            render(<PreviewToggle value="**bold text**" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(button);

            expect(screen.getByRole('textbox')).toHaveClass('preview-toggle-textarea--hidden');
            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv).not.toHaveClass('preview-toggle-preview--hidden');
        });

        it('toggles back to edit mode on second click', () => {
            render(<PreviewToggle value="text" onChange={() => {}} />);
            const toggleButton = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(toggleButton);
            fireEvent.click(toggleButton);

            expect(screen.getByRole('textbox')).not.toHaveClass('preview-toggle-textarea--hidden');
            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv).toHaveClass('preview-toggle-preview--hidden');
        });

        it('changes button label from Preview to Edit and updates aria-label', () => {
            render(<PreviewToggle value="text" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            expect(button).toHaveTextContent('Preview');
            expect(button).toHaveAttribute('aria-label', 'Switch to preview mode');

            fireEvent.click(button);
            expect(button).toHaveTextContent('Edit');
            expect(button).toHaveAttribute('aria-label', 'Switch to edit mode');
        });

        it('toggles correctly when value is empty', () => {
            render(<PreviewToggle value="" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(button);

            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv).not.toHaveClass('preview-toggle-preview--hidden');
            // MarkdownPreview should not render when value is empty
            expect(previewDiv.querySelector('.markdown-preview')).toBeNull();

            fireEvent.click(button);
            expect(previewDiv).toHaveClass('preview-toggle-preview--hidden');
        });
    });

    describe('markdown preview', () => {
        it('renders bold and italic markdown as HTML in preview mode', () => {
            render(<PreviewToggle value="**bold text**" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(button);

            const html = document.querySelector('.markdown-preview');
            expect(html).toHaveTextContent('bold text');
            expect(html.querySelector('strong')).toBeTruthy();
        });

        it('renders empty preview when value is empty string', () => {
            render(<PreviewToggle value="" onChange={() => {}} />);
            const button = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(button);

            const previewDiv = document.querySelector('.preview-toggle-preview');
            expect(previewDiv).not.toHaveClass('preview-toggle-preview--hidden');
            expect(previewDiv.innerHTML).toBe('');
        });
    });

    describe('onChange', () => {
        it('calls onChange with the new value when textarea changes', () => {
            const handleChange = vi.fn();
            render(<PreviewToggle value="initial" onChange={handleChange} />);
            const textarea = screen.getByRole('textbox');
            fireEvent.change(textarea, { target: { value: 'updated' } });
            expect(handleChange).toHaveBeenCalledWith('updated');
        });

        it('does not call onChange when toggling preview', () => {
            const handleChange = vi.fn();
            render(<PreviewToggle value="text" onChange={handleChange} />);
            const button = screen.getByRole('button', { name: /preview/i });
            fireEvent.click(button);
            fireEvent.click(button);

            expect(handleChange).not.toHaveBeenCalled();
        });
    });
});
