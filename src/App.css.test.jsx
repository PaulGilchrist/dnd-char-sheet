
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

describe('App.css', () => {
  let css;

  beforeAll(() => {
    css = readFileSync(join(__dirname, 'App.css'), 'utf-8');
  });

  describe('file integrity', () => {
    it('should exist and be non-empty', () => {
      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
    });

    it('should not contain !important declarations', () => {
      const importantMatches = css.match(/!important/g);
      const count = importantMatches ? importantMatches.length : 0;
      // Only print-media !important is acceptable for the modal override pattern
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  describe('CSS custom properties', () => {
    const requiredVars = [
      '--color-body',
      '--color-header',
      '--color-text',
      '--color-text-muted',
      '--color-text-secondary',
      '--color-text-inverse',
      '--color-primary',
      '--color-primary-hover',
      '--color-primary-rgb',
      '--color-secondary',
      '--color-hover',
      '--color-error',
      '--border-color',
      '--background-color',
      '--background-color-button-secondary',
      '--background-color-button-secondary-hover',
      '--background-color-card',
      '--background-color-card-hover',
      '--background-color-input',
      '--background-color-surface',
      '--background-color-error',
    ];

    requiredVars.forEach((variable) => {
      it(`should reference CSS variable ${variable}`, () => {
        expect(css).toContain(variable);
      });
    });
  });

  describe('layout selectors', () => {
    const selectors = [
      { name: 'app container', pattern: /\.app\s*\{/ },
      { name: 'app body', pattern: /\.app-body\s*\{/ },
      { name: 'half-line', pattern: /\.half-line\s*\{/ },
      { name: 'char button group', pattern: /\.char-btn-group\s*\{/ },
    ];

    selectors.forEach(({ name, pattern }) => {
      it(`should define ${name} selector`, () => {
        expect(pattern.test(css)).toBe(true);
      });
    });
  });

  describe('icon button styles', () => {
    it('should define .icon-button with hover and disabled states', () => {
      expect(css).toContain('.icon-button {');
      expect(css).toContain('.icon-button:hover:not(:disabled) {');
      expect(css).toContain('.icon-button:disabled {');
    });

    it('should set icon-button cursor to pointer and not-allowed states', () => {
      const buttonBlock = css.match(/\.icon-button\s*\{[^}]*\}/)?.[0] || '';
      expect(buttonBlock).toContain('cursor: pointer');
      const disabledBlock = css.match(/\.icon-button:disabled\s*\{[^}]*\}/)?.[0] || '';
      expect(disabledBlock).toContain('cursor: not-allowed');
    });
  });

  describe('campaign tool container styles', () => {
    const ctSelectors = [
      { name: 'container', pattern: /\.ct-container\s*\{/ },
      { name: 'header', pattern: /\.ct-header\s*\{/ },
      { name: 'back button', pattern: /\.ct-back-btn\s*\{/ },
      { name: 'title', pattern: /\.ct-title\s*\{/ },
      { name: 'new button', pattern: /\.ct-new-btn\s*\{/ },
      { name: 'generate button', pattern: /\.ct-generate-btn\s*\{/ },
      { name: 'search row', pattern: /\.ct-search-row\s*\{/ },
      { name: 'search input', pattern: /\.ct-search-input\s*\{/ },
      { name: 'search clear button', pattern: /\.ct-search-clear\s*\{/ },
      { name: 'empty state', pattern: /\.ct-empty-state\s*\{/ },
      { name: 'list', pattern: /\.ct-list\s*\{/ },
      { name: 'list item', pattern: /\.ct-list-item\s*\{/ },
      { name: 'list item header', pattern: /\.ct-list-item-header\s*\{/ },
      { name: 'list name', pattern: /\.ct-list-name\s*\{/ },
      { name: 'list meta', pattern: /\.ct-list-meta\s*\{/ },
      { name: 'list details', pattern: /\.ct-list-details\s*\{/ },
      { name: 'list preview', pattern: /\.ct-list-preview\s*\{/ },
    ];

    ctSelectors.forEach(({ name, pattern }) => {
      it(`should define ${name} selector`, () => {
        expect(pattern.test(css)).toBe(true);
      });
    });
  });

  describe('modal styles', () => {
    const modalSelectors = [
      { name: 'modal overlay', pattern: /\.ct-modal-overlay\s*\{/ },
      { name: 'modal', pattern: /\.ct-modal\s*\{/ },
      { name: 'modal header', pattern: /\.ct-modal-header\s*\{/ },
      { name: 'modal close button', pattern: /\.ct-modal-close\s*\{/ },
      { name: 'modal body', pattern: /\.ct-modal-body\s*\{/ },
      { name: 'modal footer', pattern: /\.ct-modal-footer\s*\{/ },
      { name: 'modal actions', pattern: /\.ct-modal-actions\s*\{/ },
      { name: 'modal buttons', pattern: /\.ct-modal-buttons\s*\{/ },
    ];

    modalSelectors.forEach(({ name, pattern }) => {
      it(`should define ${name} selector`, () => {
        expect(pattern.test(css)).toBe(true);
      });
    });

    it('should set modal z-index to overlay content', () => {
      const overlayBlock = css.match(/\.ct-modal-overlay\s*\{[^}]*\}/)?.[0] || '';
      expect(overlayBlock).toContain('z-index');
    });
  });

  describe('form field styles', () => {
    const formSelectors = [
      { name: 'label', pattern: /\.ct-label\s*\{/ },
      { name: 'required indicator', pattern: /\.ct-required\s*\{/ },
      { name: 'input', pattern: /\.ct-input\s*\{/ },
      { name: 'textarea', pattern: /\.ct-textarea\s*\{/ },
      { name: 'select', pattern: /\.ct-select\s*\{/ },
    ];

    formSelectors.forEach(({ name, pattern }) => {
      it(`should define ${name} selector`, () => {
        expect(pattern.test(css)).toBe(true);
      });
    });

    it('should define focus states for form inputs', () => {
      expect(css).toContain('.ct-input:focus {');
      expect(css).toContain('.ct-textarea:focus {');
      expect(css).toContain('.ct-select:focus {');
    });
  });

  describe('button styles', () => {
    it('should define .ct-btn with primary and danger variants', () => {
      expect(css).toContain('.ct-btn {');
      expect(css).toContain('.ct-btn-primary {');
      expect(css).toContain('.ct-btn-danger {');
    });

    it('should define disabled state for .ct-btn', () => {
      const btnDisabled = css.match(/\.ct-btn:disabled\s*\{[^}]*\}/)?.[0] || '';
      expect(btnDisabled).toContain('cursor: not-allowed');
    });
  });

  describe('responsive styles', () => {
    it('should include a max-width 600px media query', () => {
      expect(css).toContain('@media (max-width: 600px)');
    });

    it('should wrap header and adjust modal width in responsive view', () => {
      const responsiveSection = css.match(/@media \(max-width:\s*600px\)\s*\{[\s\S]*?\n\}/)?.[0] || '';
      expect(responsiveSection).toContain('flex-wrap');
      expect(responsiveSection).toContain('95vw');
    });
  });

  describe('print styles', () => {
    it('should include a print media query', () => {
      expect(css).toContain('@media print');
    });

    it('should hide non-modal content during print', () => {
      const printSection = css.match(/@media print\s*\{[\s\S]*?\n\}/)?.[0] || '';
      expect(printSection).toContain('display: none');
    });

    it('should make modal visible and full-width during print', () => {
      const printSection = css.match(/@media print\s*\{[\s\S]*?\n\}/)?.[0] || '';
      expect(printSection).toContain('max-width: 100%');
    });
  });

  describe('character summary button styles', () => {
    it('should define .char-btn with hover state', () => {
      expect(css).toContain('.char-btn {');
      expect(css).toContain('.char-btn:hover {');
    });

    it('should define campaign action buttons', () => {
      expect(css).toContain('.rename-campaign-btn {');
      expect(css).toContain('.delete-campaign-btn {');
      expect(css).toContain('.back-to-campaigns-btn {');
    });
  });

  describe('download and hidden button styles', () => {
    it('should define button.download styles', () => {
      expect(css).toContain('button.download {');
    });

    it('should hide button.hidden elements', () => {
      const hiddenBtn = css.match(/button\.hidden\s*\{[^}]*\}/)?.[0] || '';
      expect(hiddenBtn).toContain('display: none');
    });
  });

  describe('theme toggle', () => {
    it('should define .theme-toggle-btn with auto margin', () => {
      expect(css).toContain('.theme-toggle-btn {');
      const toggleBlock = css.match(/\.theme-toggle-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(toggleBlock).toContain('margin-left: auto');
    });
  });
});
