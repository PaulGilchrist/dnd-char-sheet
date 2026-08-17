// @cleaned-by-ai

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

describe('App.css', () => {
  let css;

  beforeEach(() => {
    css = readFileSync(join(__dirname, 'App.css'), 'utf-8');
  });

  describe('file integrity', () => {
    it('should not contain !important declarations outside print media queries', () => {
      const printSection = css.match(/@media print\s*\{[\s\S]*?\n\}/)?.[0] || '';
      const nonPrintCss = css.replace(printSection, '');
      const importantMatches = nonPrintCss.match(/!important/g);
      const count = importantMatches ? importantMatches.length : 0;
      expect(count).toBe(0);
    });
  });

  describe('CSS custom properties', () => {
    it('should define all required CSS variables', () => {
      const requiredVars = [
        '--color-body', '--color-header', '--color-text', '--color-text-muted',
        '--color-text-secondary', '--color-text-inverse', '--color-primary',
        '--color-primary-hover', '--color-primary-rgb', '--color-secondary',
        '--color-hover', '--color-error', '--border-color', '--background-color',
        '--background-color-button-secondary', '--background-color-button-secondary-hover',
        '--background-color-card', '--background-color-card-hover',
        '--background-color-input', '--background-color-surface', '--background-color-error',
      ];
      for (const variable of requiredVars) {
        expect(css).toContain(variable);
      }
    });
  });

  describe('layout', () => {
    it('should define core layout with flex column, body with left padding, half-line spacing, and char-btn-group', () => {
      expect(css).toMatch(/\.app\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/);
      expect(css).toMatch(/\.app-body\s*\{[^}]*padding-left:\s*180px/);
      expect(css).toMatch(/\.half-line\s*\{[^}]*height:\s*0\.5em/);
      expect(css).toMatch(/\.char-btn-group\s*\{[^}]*display:\s*flex/);
    });
  });

  describe('icon button', () => {
    it('should define .icon-button with pointer cursor, transition, hover, and disabled states', () => {
      expect(css).toMatch(/\.icon-button\s*\{[^}]*cursor:\s*pointer/);
      expect(css).toMatch(/\.icon-button\s*\{[^}]*transition:\s*opacity\s*0\.2s\s*ease/);
      expect(css).toMatch(/\.icon-button:hover:not\(:disabled\)/);
      expect(css).toContain('opacity: 1');
      expect(css).toMatch(/\.icon-button:disabled\s*\{[^}]*cursor:\s*not-allowed/);
      expect(css).toMatch(/\.icon-button:disabled\s*\{[^}]*opacity:\s*0\.3/);
    });
  });

  describe('campaign action buttons', () => {
    it('should define .rename-campaign-btn, .delete-campaign-btn, and .back-to-campaigns-btn', () => {
      expect(css).toMatch(/\.rename-campaign-btn\s*\{[^}]*color:\s*var\(--color-body\)/);
      expect(css).toMatch(/\.delete-campaign-btn\s*\{[^}]*color:\s*darkred/);
      expect(css).toMatch(/\.back-to-campaigns-btn\s*\{[^}]*color:\s*var\(--color-body\)/);
    });
  });

  describe('character summary buttons', () => {
    it('should define .char-btn with border, pointer cursor, and hover opacity', () => {
      expect(css).toMatch(/\.char-btn\s*\{[^}]*border:\s*1px\s+solid\s+var\(--border-color\)/);
      expect(css).toMatch(/\.char-btn\s*\{[^}]*cursor:\s*pointer/);
      expect(css).toMatch(/\.char-btn:hover\s*\{[^}]*opacity:\s*1/);
    });
  });

  describe('utility elements', () => {
    it('should define .download, .hidden, and .theme-toggle-btn', () => {
      expect(css).toMatch(/button\.download\s*\{[^}]*background-color:\s*darkgreen/);
      expect(css).toMatch(/button\.hidden\s*\{[^}]*display:\s*none/);
      expect(css).toMatch(/\.theme-toggle-btn\s*\{[^}]*margin-left:\s*auto/);
    });
  });

  describe('campaign tool container', () => {
    it('should define .ct-container with flex layout and padding', () => {
      expect(css).toMatch(/\.ct-container\s*\{[^}]*flex:\s*1/);
      expect(css).toMatch(/\.ct-container\s*\{[^}]*padding:\s*20px/);
    });

    it('should define .ct-header with flex row layout', () => {
      expect(css).toMatch(/\.ct-container \.ct-header\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.ct-container \.ct-header\s*\{[^}]*justify-content:\s*space-between/);
    });

    it('should define .ct-title with header styling', () => {
      expect(css).toMatch(/\.ct-container \.ct-title\s*\{[^}]*color:\s*var\(--color-header\)/);
      expect(css).toMatch(/\.ct-container \.ct-title\s*\{[^}]*font-size:\s*1\.6em/);
    });

    it('should define .ct-new-btn with primary color scheme', () => {
      expect(css).toMatch(/\.ct-container \.ct-new-btn\s*\{[^}]*background:\s*var\(--color-primary\)/);
      expect(css).toMatch(/\.ct-container \.ct-new-btn\s*\{[^}]*color:\s*var\(--color-text-inverse\)/);
    });

    it('should define .ct-search-row with flex layout and rounded border', () => {
      expect(css).toMatch(/\.ct-container \.ct-search-row\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.ct-container \.ct-search-row\s*\{[^}]*border-radius:\s*6px/);
    });

    it('should define .ct-search-input with flex layout', () => {
      expect(css).toMatch(/\.ct-container \.ct-search-input\s*\{[^}]*flex:\s*1/);
    });

    it('should define .ct-empty-state with centered text', () => {
      expect(css).toMatch(/\.ct-container \.ct-empty-state\s*\{[^}]*text-align:\s*center/);
    });

    it('should define .ct-list with flex column layout', () => {
      expect(css).toMatch(/\.ct-container \.ct-list\s*\{[^}]*display:\s*flex/);
      expect(css).toMatch(/\.ct-container \.ct-list\s*\{[^}]*flex-direction:\s*column/);
    });

    it('should define .ct-list-item with hover state', () => {
      expect(css).toMatch(/\.ct-container \.ct-list-item\s*\{[^}]*cursor:\s*pointer/);
    });

    it('should define list sub-elements (.ct-list-item-header, .ct-list-name, .ct-list-meta, .ct-list-details, .ct-list-preview)', () => {
      expect(css).toMatch(/\.ct-container \.ct-list-item-header\s*\{/);
      expect(css).toMatch(/\.ct-container \.ct-list-name\s*\{[^}]*font-weight:\s*600/);
      expect(css).toMatch(/\.ct-container \.ct-list-meta\s*\{/);
      expect(css).toMatch(/\.ct-container \.ct-list-details\s*\{[^}]*flex-wrap:\s*wrap/);
      expect(css).toMatch(/\.ct-container \.ct-list-preview\s*\{[^}]*color:\s*var\(--color-text-secondary\)/);
    });
  });

  describe('modal', () => {
    it('should define .ct-modal-overlay with fixed positioning and z-index', () => {
      expect(css).toMatch(/\.ct-container \.ct-modal-overlay\s*\{[^}]*position:\s*fixed/);
      expect(css).toMatch(/\.ct-container \.ct-modal-overlay\s*\{[^}]*z-index:\s*1000/);
    });

    it('should define .ct-modal with max-width constraint', () => {
      expect(css).toMatch(/\.ct-container \.ct-modal\s*\{[^}]*max-width:\s*90vw/);
    });

    it('should define .ct-modal-header, .ct-modal-close, .ct-modal-body, and .ct-modal-footer', () => {
      expect(css).toMatch(/\.ct-container \.ct-modal-header\s*\{[^}]*border-bottom:\s*1px\s+solid/);
      expect(css).toMatch(/\.ct-container \.ct-modal-close\s*\{[^}]*cursor:\s*pointer/);
      expect(css).toMatch(/\.ct-container \.ct-modal-body\s*\{[^}]*overflow-y:\s*auto/);
      expect(css).toMatch(/\.ct-container \.ct-modal-footer\s*\{[^}]*border-top:\s*1px\s+solid/);
    });

    it('should define .ct-modal-actions and .ct-modal-buttons with flex layout', () => {
      expect(css).toMatch(/\.ct-container \.ct-modal-actions\s*\{/);
      expect(css).toMatch(/\.ct-container \.ct-modal-buttons\s*\{/);
      expect(css).toContain('display: flex');
    });
  });

  describe('form fields', () => {
    it('should define .ct-label and .ct-required with proper text colors', () => {
      expect(css).toMatch(/\.ct-container \.ct-label\s*\{[^}]*color:\s*var\(--color-text-secondary\)/);
      expect(css).toMatch(/\.ct-container \.ct-required\s*\{[^}]*color:\s*var\(--color-error\)/);
    });

    it('should define .ct-input with box-sizing and focus state', () => {
      expect(css).toMatch(/\.ct-container \.ct-input\s*\{[^}]*box-sizing:\s*border-box/);
      expect(css).toMatch(/\.ct-container \.ct-input:focus\s*\{/);
      expect(css).toMatch(/\.ct-container \.ct-input:focus\s*\{[^}]*border-color:\s*var\(--color-primary\)/);
      expect(css).toMatch(/\.ct-container \.ct-input:focus\s*\{[^}]*box-shadow/);
    });

    it('should define .ct-textarea with resize and focus state', () => {
      expect(css).toMatch(/\.ct-container \.ct-textarea\s*\{[^}]*resize:\s*vertical/);
      expect(css).toMatch(/\.ct-container \.ct-textarea:focus\s*\{/);
      expect(css).toMatch(/\.ct-container \.ct-textarea:focus\s*\{[^}]*border-color:\s*var\(--color-primary\)/);
      expect(css).toMatch(/\.ct-container \.ct-textarea:focus\s*\{[^}]*box-shadow/);
    });

    it('should define .ct-select with pointer cursor and focus state', () => {
      expect(css).toMatch(/\.ct-container \.ct-select\s*\{[^}]*cursor:\s*pointer/);
      expect(css).toMatch(/\.ct-container \.ct-select:focus\s*\{/);
      expect(css).toMatch(/\.ct-container \.ct-select:focus\s*\{[^}]*border-color:\s*var\(--color-primary\)/);
      expect(css).toMatch(/\.ct-container \.ct-select:focus\s*\{[^}]*box-shadow/);
    });
  });

  describe('buttons', () => {
    it('should define .ct-btn, .ct-btn-primary, and .ct-btn-danger', () => {
      expect(css).toMatch(/\.ct-container \.ct-btn\s*\{[^}]*background:\s*var\(--background-color-button-secondary\)/);
      expect(css).toMatch(/\.ct-container \.ct-btn-primary\s*\{[^}]*background:\s*var\(--color-primary\)/);
      expect(css).toMatch(/\.ct-container \.ct-btn-danger\s*\{[^}]*color:\s*var\(--color-error\)/);
    });

    it('should disable .ct-btn with reduced opacity and not-allowed cursor', () => {
      expect(css).toMatch(/\.ct-container \.ct-btn:disabled\s*\{[^}]*cursor:\s*not-allowed/);
      expect(css).toMatch(/\.ct-container \.ct-btn:disabled\s*\{[^}]*opacity:\s*0\.5/);
    });
  });

  describe('responsive styles', () => {
    it('should include responsive breakpoints with flex-wrap and adjusted modal width', () => {
      expect(css).toContain('@media (max-width: 600px)');
      const responsiveMatch = css.match(/@media \(max-width:\s*600px\)\s*\{([\s\S]*?)\n\}/);
      expect(responsiveMatch).not.toBeNull();
      const responsiveSection = responsiveMatch ? responsiveMatch[1] : '';
      expect(responsiveSection).toContain('flex-wrap');
      expect(responsiveSection).toContain('95vw');
    });
  });

  describe('print styles', () => {
    it('should include print media query with modal visibility', () => {
      expect(css).toContain('@media print');
      const printSection = css.match(/@media print\s*\{([\s\S]*?)\n\}/);
      expect(printSection).not.toBeNull();
      const printContent = printSection ? printSection[1] : '';
      expect(printContent).toContain(':has(.ct-modal)');
      expect(printContent).toContain('display: none');
      expect(printContent).toContain('max-width: 100%');
      expect(printContent).toContain('width: 100%');
    });
  });
});
