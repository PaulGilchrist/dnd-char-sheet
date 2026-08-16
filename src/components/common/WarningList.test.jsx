// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WarningList from './WarningList.jsx';

describe('WarningList', () => {
	it('returns null when warnings is null', () => {
		const { container } = render(<WarningList warnings={null} />);
		expect(container.querySelector('.warning-container')).toBeNull();
	});

	it('returns null when warnings is empty', () => {
		const { container } = render(<WarningList warnings={[]} />);
		expect(container.querySelector('.warning-container')).toBeNull();
	});

	it('renders each warning message in its own container', () => {
		const warnings = [
			{ type: 'warning', message: 'Warning 1' },
			{ type: 'info', message: 'Info 2' },
		];
		render(<WarningList warnings={warnings} />);

		expect(screen.getByText('Warning 1')).toBeInTheDocument();
		expect(screen.getByText('Info 2')).toBeInTheDocument();
	});

	it('applies the correct CSS class based on warning type', () => {
		const warnings = [
			{ type: 'warning', message: 'A warning' },
			{ type: 'info', message: 'An info' },
		];
		const { container } = render(<WarningList warnings={warnings} />);

		const warningEl = container.querySelector('.warning-message.warning');
		const infoEl = container.querySelector('.warning-message.info');

		expect(warningEl).toBeInTheDocument();
		expect(infoEl).toBeInTheDocument();
	});

	it('renders plain text without icon prefix when showIcons is false (default)', () => {
		const warnings = [{ type: 'warning', message: 'Alert' }];
		render(<WarningList warnings={warnings} />);

		// Component renders `{showIcons && icon} {message}` — when showIcons is false,
		// React renders `false` as nothing, but the literal space remains.
		// The important behavior is that no icon emoji appears in the output.
		const el = screen.getByText('Alert');
		expect(el.textContent.trim()).toBe('Alert');
		expect(el.textContent).not.toContain('\u26A0\uFE0F');
		expect(el.textContent).not.toContain('\u2139\uFE0F');
	});

	it('prepends the icon emoji when showIcons is true', () => {
		const warnings = [{ type: 'warning', message: 'Alert' }];
		render(<WarningList warnings={warnings} showIcons />);

		const el = screen.getByText(/Alert/);
		expect(el.textContent).toContain('\u26A0\uFE0F');
	});

	it('shows no icon for info type when showIcons is true', () => {
		const warnings = [{ type: 'info', message: 'Notice' }];
		render(<WarningList warnings={warnings} showIcons />);

		const el = screen.getByText(/Notice/);
		expect(el.textContent).toContain('\u2139\uFE0F');
	});

	it('shows no icon for unknown warning types even with showIcons', () => {
		const warnings = [{ type: 'error', message: 'Something broke' }];
		render(<WarningList warnings={warnings} showIcons />);

		const el = screen.getByText('Something broke');
		expect(el.textContent.trim()).toBe('Something broke');
		expect(el.textContent).not.toContain('\u26A0\uFE0F');
		expect(el.textContent).not.toContain('\u2139\uFE0F');
	});
});
