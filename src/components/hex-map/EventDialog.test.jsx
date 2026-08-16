// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventDialog from './EventDialog.jsx';

const baseEvent = {
    type: 'combat',
    title: 'Goblin Ambush',
    description: 'A group of goblins ambushes the party.',
    terrain: 'Forest',
};

const eventWithEncounter = {
    ...baseEvent,
    encounter: {
        difficultyLabel: 'Hard',
        totalXP: 400,
        monsters: [
            { qty: 3, name: 'Goblin' },
            { qty: 1, name: 'Goblin Boss' },
        ],
    },
};

describe('EventDialog', () => {
    let onAccept, onSkip, onReroll;

    beforeEach(() => {
        onAccept = vi.fn();
        onSkip = vi.fn();
        onReroll = vi.fn();
    });

    const renderDialog = (event, rerollsRemaining = 2) =>
        render(
            <EventDialog
                event={event}
                rerollsRemaining={rerollsRemaining}
                onAccept={onAccept}
                onSkip={onSkip}
                onReroll={onReroll}
            />
        );

    describe('no event', () => {
        it.each`
            value         | label
            ${null}       | ${'null'}
            ${undefined}  | ${'undefined'}
            ${false}      | ${'false'}
        `('renders nothing when event is $label', ({ value }) => {
            const { container } = renderDialog(value, 0);
            expect(container.firstChild).toBeNull();
        });
    });

    describe('content rendering', () => {
        it('renders the title, description, and terrain', () => {
            renderDialog(baseEvent);
            expect(screen.getByText('Goblin Ambush')).toBeInTheDocument();
            expect(screen.getByText('A group of goblins ambushes the party.')).toBeInTheDocument();
            expect(screen.getByText('Terrain: Forest')).toBeInTheDocument();
        });
    });

    describe('action buttons', () => {
        it('renders accept, skip, and reroll buttons', () => {
            renderDialog(baseEvent);
            expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /re-roll/i })).toBeInTheDocument();
        });

        it('calls only onAccept when accept is clicked', () => {
            renderDialog(baseEvent);
            fireEvent.click(screen.getByRole('button', { name: /accept/i }));
            expect(onAccept).toHaveBeenCalledTimes(1);
            expect(onSkip).not.toHaveBeenCalled();
            expect(onReroll).not.toHaveBeenCalled();
        });

        it('calls only onSkip when skip is clicked', () => {
            renderDialog(baseEvent);
            fireEvent.click(screen.getByRole('button', { name: /skip/i }));
            expect(onSkip).toHaveBeenCalledTimes(1);
            expect(onAccept).not.toHaveBeenCalled();
            expect(onReroll).not.toHaveBeenCalled();
        });

        it('calls only onReroll when reroll is clicked', () => {
            renderDialog(baseEvent);
            fireEvent.click(screen.getByRole('button', { name: /re-roll/i }));
            expect(onReroll).toHaveBeenCalledTimes(1);
            expect(onAccept).not.toHaveBeenCalled();
            expect(onSkip).not.toHaveBeenCalled();
        });
    });

    describe('reroll button state', () => {
        it('is disabled when no re-rolls remain', () => {
            renderDialog(baseEvent, 0);
            expect(screen.getByRole('button', { name: /re-roll/i })).toBeDisabled();
        });

        it('is disabled when re-rolls remaining is negative', () => {
            renderDialog(baseEvent, -1);
            expect(screen.getByRole('button', { name: /re-roll/i })).toBeDisabled();
        });

        it('is enabled when re-rolls remain', () => {
            renderDialog(baseEvent, 1);
            expect(screen.getByRole('button', { name: /re-roll/i })).toBeEnabled();
        });

        it('shows the remaining count inside the button when re-rolls remain', () => {
            renderDialog(baseEvent, 3);
            expect(screen.getByRole('button', { name: /re-roll/i })).toHaveTextContent(/Re-roll\s*\(3\)/);
        });

        it('omits the count when no re-rolls remain', () => {
            renderDialog(baseEvent, 0);
            expect(screen.getByRole('button', { name: /re-roll/i })).toHaveTextContent(/^Re-roll$/);
        });

        it('does not fire onReroll when disabled and clicked', () => {
            renderDialog(baseEvent, 0);
            fireEvent.click(screen.getByRole('button', { name: /re-roll/i }));
            expect(onReroll).not.toHaveBeenCalled();
        });

        it.each`
            rerollsRemaining | expectedTitle
            ${2}             | ${'Re-roll (2 remaining)'}
            ${0}             | ${'No re-rolls remaining'}
        `('sets the reroll tooltip to "$expectedTitle" when $rerollsRemaining re-rolls remain', ({ rerollsRemaining, expectedTitle }) => {
            renderDialog(baseEvent, rerollsRemaining);
            expect(screen.getByRole('button', { name: /re-roll/i })).toHaveAttribute('title', expectedTitle);
        });
    });

    describe('event type icons', () => {
        it.each`
            type             | iconClass
            ${'combat'}      | ${'fa-crosshairs'}
            ${'discovery'}   | ${'fa-gem'}
            ${'hazard'}      | ${'fa-triangle-exclamation'}
            ${'npc'}         | ${'fa-handshake'}
            ${'weatherChange'} | ${'fa-cloud-rain'}
            ${'navigation'}  | ${'fa-compass'}
            ${'unknown'}     | ${'fa-circle'}
        `('renders the $type icon for a $type event', ({ type, iconClass }) => {
            const { container } = renderDialog({ ...baseEvent, type });
            expect(container.querySelector(`.${iconClass}`)).toBeInTheDocument();
        });
    });

    describe('event type names', () => {
        it.each`
            type             | expectedName
            ${'combat'}      | ${'Combat Encounter'}
            ${'discovery'}   | ${'Discovery'}
            ${'hazard'}      | ${'Hazard'}
            ${'npc'}         | ${'NPC Encounter'}
            ${'weatherChange'} | ${'Weather Change'}
            ${'navigation'}  | ${'Navigation'}
            ${'unknown'}     | ${'Event'}
        `('renders "$expectedName" for a $type event', ({ type, expectedName }) => {
            renderDialog({ ...baseEvent, type });
            expect(screen.getByText(expectedName)).toBeInTheDocument();
        });
    });

    describe('encounter info', () => {
        it('does not render encounter info when the event has no encounter', () => {
            const { container } = renderDialog(baseEvent);
            expect(container.querySelector('.event-encounter-info')).not.toBeInTheDocument();
        });

        it('renders the difficulty, XP, and each monster row when an encounter is present', () => {
            renderDialog(eventWithEncounter);
            expect(screen.getByText('Hard')).toBeInTheDocument();
            expect(screen.getByText('400 XP')).toBeInTheDocument();
            expect(screen.getByText('3x')).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('1x')).toBeInTheDocument();
            expect(screen.getByText('Goblin Boss')).toBeInTheDocument();
        });

        it('renders every monster row for encounters with many monsters', () => {
            const event = {
                ...baseEvent,
                encounter: {
                    ...eventWithEncounter.encounter,
                    monsters: [
                        { qty: 5, name: 'Skeleton' },
                        { qty: 3, name: 'Zombie' },
                        { qty: 2, name: 'Wight' },
                    ],
                },
            };
            renderDialog(event);
            expect(screen.getByText('Skeleton')).toBeInTheDocument();
            expect(screen.getByText('Zombie')).toBeInTheDocument();
            expect(screen.getByText('Wight')).toBeInTheDocument();
            expect(screen.getByText('5x')).toBeInTheDocument();
            expect(screen.getByText('3x')).toBeInTheDocument();
            expect(screen.getByText('2x')).toBeInTheDocument();
        });

        it('renders difficulty and XP but no monster rows for an empty monster list', () => {
            const event = {
                ...baseEvent,
                encounter: {
                    difficultyLabel: 'Easy',
                    totalXP: 0,
                    monsters: [],
                },
            };
            const { container } = renderDialog(event);
            expect(screen.getByText('Easy')).toBeInTheDocument();
            expect(screen.getByText('0 XP')).toBeInTheDocument();
            expect(container.querySelector('.event-monster-item')).not.toBeInTheDocument();
        });
    });
});
