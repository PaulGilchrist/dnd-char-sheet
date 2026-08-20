// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NpcAvatar from './NpcAvatar.jsx';
import * as AvatarImageModule from '../common/AvatarImage.jsx';

vi.mock('../common/AvatarImage.jsx', () => ({
    default: vi.fn(({ name, imagePath }) => (
        <div data-testid={`avatar-${name}`} className="avatar-wrapper">
            <img src={imagePath} alt={name} />
        </div>
    )),
}));

describe('NpcAvatar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('image rendering', () => {
        it('renders AvatarImage when imageUrl is provided', () => {
            render(<NpcAvatar name="Goblin" imageUrl="https://example.com/goblin.png" />);
            expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/goblin.png');
        });

        it('uses imagePath over imageUrl when both are provided', () => {
            render(<NpcAvatar name="Goblin" imageUrl="https://example.com/old.png" imagePath="https://example.com/new.png" />);
            expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/new.png');
        });

        it('passes campaignName and size to AvatarImage', () => {
            render(<NpcAvatar name="Goblin" imageUrl="https://example.com/goblin.png" campaignName="my-campaign" />);
            const callArgs = AvatarImageModule.default.mock.calls[0][0];
            expect(callArgs).toHaveProperty('name', 'Goblin');
            expect(callArgs).toHaveProperty('imagePath', 'https://example.com/goblin.png');
            expect(callArgs).toHaveProperty('campaignName', 'my-campaign');
            expect(callArgs).toHaveProperty('size', 150);
        });
    });

    describe('initial rendering', () => {
        it('renders the first letter of the name when no image is provided', () => {
            render(<NpcAvatar name="Goblin" />);
            expect(screen.getByText('G')).toBeInTheDocument();
        });

        it('renders uppercase first letter regardless of input case', () => {
            render(<NpcAvatar name="goblin" />);
            expect(screen.getByText('G')).toBeInTheDocument();
        });

        it('renders a question mark when name is null', () => {
            render(<NpcAvatar name={null} />);
            expect(screen.getByText('?')).toBeInTheDocument();
        });

        it('renders a question mark when name is an empty string', () => {
            render(<NpcAvatar name="" />);
            expect(screen.getByText('?')).toBeInTheDocument();
        });
    });

    describe('interaction', () => {
        it('calls onClick when the avatar is clicked', () => {
            const onClickMock = vi.fn();
            const { container } = render(<NpcAvatar name="Goblin" onClick={onClickMock} />);
            fireEvent.click(container.querySelector('.npc-avatar'));
            expect(onClickMock).toHaveBeenCalledTimes(1);
        });

        it('renders without error when onClick is not provided', () => {
            render(<NpcAvatar name="Goblin" />);
            expect(screen.getByText('G')).toBeInTheDocument();
        });
    });
});
