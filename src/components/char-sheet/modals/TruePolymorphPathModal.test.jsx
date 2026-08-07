import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TruePolymorphPathModal from './TruePolymorphPathModal.jsx';

const baseProps = {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
};

// ── Initial render ──

describe('TruePolymorphPathModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial render', () => {
        it('renders the modal overlay with correct classes', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const overlay = document.querySelector('.sp-overlay');
            expect(overlay).toHaveClass('sp-overlay');
            expect(overlay).toHaveClass('sp-overlay--evasion');
        });

        it('renders the modal with correct classes', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const modal = document.querySelector('.sp-modal');
            expect(modal).toHaveClass('sp-modal');
            expect(modal).toHaveClass('sp-modal--wide');
        });

        it('renders the True Polymorph header with paw icon', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(screen.getByText('True Polymorph')).toBeInTheDocument();
            const header = document.querySelector('.sp-header');
            expect(header.querySelector('i.fa-solid.fa-paw')).toBeInTheDocument();
        });

        it('renders the prompt text', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(screen.getByText('Choose the type of transformation:')).toBeInTheDocument();
        });

        it('renders all three transformation path buttons', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(screen.getByText('Creature into Creature')).toBeInTheDocument();
            expect(screen.getByText('Object into Creature')).toBeInTheDocument();
            expect(screen.getByText('Creature into Object')).toBeInTheDocument();
        });

        it('renders the Creature into Creature button with correct icon', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const icons = document.querySelectorAll('i.fa-solid.fa-users');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('renders the Object into Creature button with correct icon', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const icons = document.querySelectorAll('i.fa-solid.fa-cube');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('renders the Creature into Object button with correct icon', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const icons = document.querySelectorAll('i.fa-solid.fa-gem');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('renders descriptions for all three paths', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(
                screen.getByText(/Transform a creature into another creature/)
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Transform a nonmagical object into a creature/)
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Transform a creature into a nonmagical object/)
            ).toBeInTheDocument();
        });

        it('renders the tp-path-grid container', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(document.querySelector('.tp-path-grid')).toBeInTheDocument();
        });

        it('renders all buttons with tp-path-btn class', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const buttons = document.querySelectorAll('.tp-path-btn');
            expect(buttons).toHaveLength(3);
        });

        it('renders the Cancel button', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('renders the sp-actions area', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('renders the sp-dismiss-btn for cancel', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            expect(document.querySelector('.sp-dismiss-btn')).toBeInTheDocument();
        });
    });

    // ── Creature into Creature path ──

    describe('Creature into Creature path', () => {
        it('calls onConfirm with creature_to_creature when clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByText('Creature into Creature'));
            expect(baseProps.onConfirm).toHaveBeenCalledWith('creature_to_creature');
        });

        it('does not call onCancel when Creature into Creature is clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByText('Creature into Creature'));
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });
    });

    // ── Object into Creature path ──

    describe('Object into Creature path', () => {
        it('calls onConfirm with object_into_creature when clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByText('Object into Creature'));
            expect(baseProps.onConfirm).toHaveBeenCalledWith('object_into_creature');
        });

        it('does not call onCancel when Object into Creature is clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByText('Object into Creature'));
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });
    });

    // ── Creature into Object path ──

    describe('Creature into Object path', () => {
        it('calls onConfirm with creature_to_object when clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByText('Creature into Object'));
            expect(baseProps.onConfirm).toHaveBeenCalledWith('creature_to_object');
        });

        it('does not call onCancel when Creature into Object is clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByText('Creature into Object'));
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });
    });

    // ── Cancel / close behavior ──

    describe('close behavior', () => {
        it('calls onCancel when Cancel button is clicked', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
        });

        it('calls onCancel when clicking the overlay background', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
        });

        it('does not call onCancel when clicking the modal content', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not call onCancel when clicking the header', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const header = document.querySelector('.sp-header');
            fireEvent.click(header);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not call onCancel when clicking the body', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const body = document.querySelector('.sp-body');
            fireEvent.click(body);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('does not call onCancel when clicking the actions area', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            const actions = document.querySelector('.sp-actions');
            fireEvent.click(actions);
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });
    });

    // ── Escape key behavior ──

    describe('escape key', () => {
        it('calls onCancel when Escape key is pressed', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
        });

        it('does not call onCancel when other keys are pressed', () => {
            render(<TruePolymorphPathModal {...baseProps} />);
            fireEvent.keyDown(document, { key: 'Enter' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();

            fireEvent.keyDown(document, { key: ' ' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();

            fireEvent.keyDown(document, { key: 'a' });
            expect(baseProps.onCancel).not.toHaveBeenCalled();
        });

        it('removes the event listener on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
            const { unmount } = render(<TruePolymorphPathModal {...baseProps} />);
            unmount();
            expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
            removeEventListenerSpy.mockRestore();
        });
    });
});
