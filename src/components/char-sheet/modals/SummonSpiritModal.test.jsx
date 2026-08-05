import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SummonSpiritModal from './SummonSpiritModal.jsx';

const baseProps = {
    action: {
        name: 'Summon Beast',
        automation: {
            type: 'summon_spirit',
            typeLabel: 'Bestial Spirit',
            variants: [
                { name: 'Bestial Spirit (Air)', description: 'Flies at 60 ft.' },
                { name: 'Bestial Spirit (Land)', description: 'Walks and climbs at 30 ft.' },
                { name: 'Bestial Spirit (Water)', description: 'Swims at 30 ft.' },
            ],
        },
    },
    onConfirm: vi.fn(),
    onClose: vi.fn(),
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

describe('SummonSpiritModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the spell name and all variants', () => {
        render(<SummonSpiritModal {...makeProps()} />);

        expect(screen.getByText('Summon Beast')).toBeInTheDocument();
        expect(screen.getByText('Bestial Spirit (Air)')).toBeInTheDocument();
        expect(screen.getByText('Bestial Spirit (Land)')).toBeInTheDocument();
        expect(screen.getByText('Bestial Spirit (Water)')).toBeInTheDocument();
        expect(screen.getByText('Flies at 60 ft.')).toBeInTheDocument();
    });

    it('summons the selected variant on confirm', () => {
        render(<SummonSpiritModal {...makeProps()} />);

        fireEvent.click(screen.getByText('Bestial Spirit (Land)'));
        fireEvent.click(screen.getByRole('button', { name: /Summon/ }));

        expect(baseProps.onConfirm).toHaveBeenCalledWith('Bestial Spirit (Land)');
    });

    it('does not confirm without a selection', () => {
        render(<SummonSpiritModal {...makeProps()} />);

        const confirmButton = screen.getByRole('button', { name: /Summon/ });
        fireEvent.click(confirmButton);

        expect(baseProps.onConfirm).not.toHaveBeenCalled();
    });

    it('closes on cancel', () => {
        render(<SummonSpiritModal {...makeProps()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(baseProps.onClose).toHaveBeenCalled();
    });
});
