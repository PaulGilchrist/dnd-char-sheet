import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ConditionChoiceModal from './ConditionChoiceModal.jsx';

describe('ConditionChoiceModal', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function showModal(detail) {
        act(() => {
            window.dispatchEvent(new CustomEvent('condition-choice-show', { detail }));
        });
    }

    it('renders nothing when no event received', () => {
        const { container } = render(<ConditionChoiceModal />);
        expect(container.innerHTML).toBe('');
    });

    it('displays condition buttons matching the event detail', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'frightened'],
        });

        expect(screen.getByText('Charmed')).toBeInTheDocument();
        expect(screen.getByText('Frightened')).toBeInTheDocument();
        expect(screen.getByText('Goblin')).toBeInTheDocument();
    });

    it('dispatches condition-choice-selected with chosen condition on button click', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'frightened'],
        });

        fireEvent.click(screen.getByText('Frightened'));

        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'condition-choice-selected',
                detail: { promptId: 'test-id', condition: 'frightened' },
            })
        );
    });

    it('dispatches condition-choice-skipped on skip button click', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'frightened'],
        });

        fireEvent.click(screen.getByText('Skip (No Effect)'));

        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'condition-choice-skipped',
                detail: { promptId: 'test-id' },
            })
        );
    });

    it('renders the full modal DOM structure with correct classes', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'frightened'],
        });

        expect(document.querySelector('.cc-overlay')).toBeInTheDocument();
        expect(document.querySelector('.cc-modal')).toBeInTheDocument();
        expect(document.querySelector('.cc-header')).toBeInTheDocument();
        expect(document.querySelector('.cc-body')).toBeInTheDocument();
        expect(document.querySelector('.cc-actions')).toBeInTheDocument();
    });

    it('deduplicates conditions using Set', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'charmed', 'frightened', 'frightened'],
        });

        const buttons = document.querySelectorAll('.cc-choice-btn');
        expect(buttons).toHaveLength(2);
        expect(screen.getByText('Charmed')).toBeInTheDocument();
        expect(screen.getByText('Frightened')).toBeInTheDocument();
    });

    it('clears current state after selection', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'frightened'],
        });

        expect(document.querySelector('.cc-overlay')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Charmed'));

        expect(dispatchSpy).toHaveBeenCalled();
        expect(document.querySelector('.cc-overlay')).not.toBeInTheDocument();
    });

    it('clears current state after skip', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed', 'frightened'],
        });

        expect(document.querySelector('.cc-overlay')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Skip (No Effect)'));

        expect(dispatchSpy).toHaveBeenCalled();
        expect(document.querySelector('.cc-overlay')).not.toBeInTheDocument();
    });

    it('renders single condition button when only one condition provided', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Orc',
            conditions: ['poisoned'],
        });

        expect(screen.getByText('Poisoned')).toBeInTheDocument();
        expect(screen.queryByText('Charmed')).not.toBeInTheDocument();
    });

    it('renders header with icon and text', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed'],
        });

        expect(document.querySelector('.cc-header')).toHaveTextContent('Choose Condition');
        expect(document.querySelector('.cc-header i.fa-solid.fa-magic')).toBeInTheDocument();
    });

    it('displays target name and saving throw message in body', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Dragon',
            conditions: ['frightened'],
        });

        const body = document.querySelector('.cc-body p');
        expect(body).toHaveTextContent('Dragon');
        expect(body).toHaveTextContent('failed the saving throw');
        expect(body).toHaveTextContent('1 minute');
    });

    it('renders skip button with icon', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: ['charmed'],
        });

        const skipBtn = screen.getByText('Skip (No Effect)');
        expect(skipBtn).toBeInTheDocument();
        expect(skipBtn.querySelector('i.fa-solid.fa-ban')).toBeInTheDocument();
    });

    it('handles empty conditions array gracefully', () => {
        render(<ConditionChoiceModal />);

        showModal({
            promptId: 'test-id',
            targetName: 'Goblin',
            conditions: [],
        });

        expect(document.querySelector('.cc-overlay')).toBeInTheDocument();
        expect(document.querySelector('.cc-body p')).toHaveTextContent('Goblin');
        expect(document.querySelectorAll('.cc-choice-btn')).toHaveLength(0);
    });


});
