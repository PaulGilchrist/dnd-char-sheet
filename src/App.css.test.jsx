// @improved-by-ai

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
    it('should exist and be non-empty', () => {
      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
    });

    it('should not contain !important declarations outside print media queries', () => {
      const printSection = css.match(/@media print\s*\{[\s\S]*?\n\}/)?.[0] || '';
      const nonPrintCss = css.replace(printSection, '');
      const importantMatches = nonPrintCss.match(/!important/g);
      const count = importantMatches ? importantMatches.length : 0;
      expect(count).toBe(0);
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

    for (const variable of requiredVars) {
      it(`should define CSS variable ${variable}`, () => {
        expect(css).toContain(variable);
      });
    }
  });

  describe('layout selectors', () => {
    it('should define .app with flex column layout', () => {
      const appBlock = css.match(/\.app\s*\{[^}]*\}/)?.[0] || '';
      expect(appBlock).toContain('display: flex');
      expect(appBlock).toContain('flex-direction: column');
    });

    it('should define .app-body with flex layout and left padding', () => {
      const bodyBlock = css.match(/\.app-body\s*\{[^}]*\}/)?.[0] || '';
      expect(bodyBlock).toContain('display: flex');
      expect(bodyBlock).toContain('padding-left: 180px');
    });

    it('should define .half-line with half-height spacing', () => {
      const halfLineBlock = css.match(/\.half-line\s*\{[^}]*\}/)?.[0] || '';
      expect(halfLineBlock).toContain('height: 0.5em');
    });

    it('should define .char-btn-group with flex layout', () => {
      const btnGroupBlock = css.match(/\.char-btn-group\s*\{[^}]*\}/)?.[0] || '';
      expect(btnGroupBlock).toContain('display: flex');
    });
  });

  describe('icon button styles', () => {
    it('should define .icon-button with pointer cursor and transition', () => {
      const buttonBlock = css.match(/\.icon-button\s*\{[^}]*\}/)?.[0] || '';
      expect(buttonBlock).toContain('cursor: pointer');
      expect(buttonBlock).toContain('transition: opacity 0.2s ease');
    });

    it('should change .icon-button color and opacity on hover when enabled', () => {
      const hoverBlock = css.match(/\.icon-button:hover:not\(:disabled\)\s*\{[^}]*\}/)?.[0] || '';
      expect(hoverBlock).toContain('opacity: 1');
    });

    it('should set .icon-button:disabled to not-allowed cursor with reduced opacity', () => {
      const disabledBlock = css.match(/\.icon-button:disabled\s*\{[^}]*\}/)?.[0] || '';
      expect(disabledBlock).toContain('cursor: not-allowed');
      expect(disabledBlock).toContain('opacity: 0.3');
    });
  });

  describe('campaign action button styles', () => {
    it('should define .rename-campaign-btn with hover state', () => {
      const btnBlock = css.match(/\.rename-campaign-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(btnBlock).toContain('color: var(--color-body)');
    });

    it('should define .delete-campaign-btn with darkred color', () => {
      const btnBlock = css.match(/\.delete-campaign-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(btnBlock).toContain('color: darkred');
    });

    it('should define .back-to-campaigns-btn with hover state', () => {
      const btnBlock = css.match(/\.back-to-campaigns-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(btnBlock).toContain('color: var(--color-body)');
    });
  });

  describe('character summary button styles', () => {
    it('should define .char-btn with border and hover state', () => {
      const btnBlock = css.match(/\.char-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(btnBlock).toContain('border: 1px solid var(--border-color)');
      expect(btnBlock).toContain('cursor: pointer');
    });

    it('should increase .char-btn opacity on hover', () => {
      const hoverBlock = css.match(/\.char-btn:hover\s*\{[^}]*\}/)?.[0] || '';
      expect(hoverBlock).toContain('opacity: 1');
    });
  });

  describe('download and hidden button styles', () => {
    it('should define button.download with darkgreen background', () => {
      const downloadBtn = css.match(/button\.download\s*\{[^}]*\}/)?.[0] || '';
      expect(downloadBtn).toContain('background-color: darkgreen');
    });

    it('should hide button.hidden elements', () => {
      const hiddenBtn = css.match(/button\.hidden\s*\{[^}]*\}/)?.[0] || '';
      expect(hiddenBtn).toContain('display: none');
    });
  });

  describe('theme toggle', () => {
    it('should define .theme-toggle-btn with auto left margin', () => {
      const toggleBlock = css.match(/\.theme-toggle-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(toggleBlock).toContain('margin-left: auto');
    });
  });

  describe('campaign tool container styles', () => {
    it('should define .ct-container with flex and padding', () => {
      const containerBlock = css.match(/\.ct-container\s*\{[^}]*\}/)?.[0] || '';
      expect(containerBlock).toContain('flex: 1');
      expect(containerBlock).toContain('padding: 20px');
    });

    it('should define .ct-header with flex row layout', () => {
      const headerBlock = css.match(/\.ct-container \.ct-header\s*\{[^}]*\}/)?.[0] || '';
      expect(headerBlock).toContain('display: flex');
      expect(headerBlock).toContain('justify-content: space-between');
    });

    it('should define .ct-back-btn with hover state', () => {
      const backBtnBlock = css.match(/\.ct-container \.ct-back-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(backBtnBlock).toContain('cursor: pointer');
    });

    it('should define .ct-title with header color and font size', () => {
      const titleBlock = css.match(/\.ct-container \.ct-title\s*\{[^}]*\}/)?.[0] || '';
      expect(titleBlock).toContain('color: var(--color-header)');
      expect(titleBlock).toContain('font-size: 1.6em');
    });

    it('should define .ct-new-btn with primary color scheme', () => {
      const newBtnBlock = css.match(/\.ct-container \.ct-new-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(newBtnBlock).toContain('background: var(--color-primary)');
      expect(newBtnBlock).toContain('color: var(--color-text-inverse)');
    });

    it('should define .ct-generate-btn with secondary color scheme', () => {
      const genBtnBlock = css.match(/\.ct-container \.ct-generate-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(genBtnBlock).toContain('cursor: pointer');
    });

    it('should define .ct-search-row with flex layout and rounded border', () => {
      const searchRowBlock = css.match(/\.ct-container \.ct-search-row\s*\{[^}]*\}/)?.[0] || '';
      expect(searchRowBlock).toContain('display: flex');
      expect(searchRowBlock).toContain('border-radius: 6px');
    });

    it('should define .ct-search-icon with muted text color', () => {
      const searchIconBlock = css.match(/\.ct-container \.ct-search-icon\s*\{[^}]*\}/)?.[0] || '';
      expect(searchIconBlock).toContain('color: var(--color-text-muted)');
    });

    it('should define .ct-search-input with flex layout and focus state', () => {
      const searchInputBlock = css.match(/\.ct-container \.ct-search-input\s*\{[^}]*\}/)?.[0] || '';
      expect(searchInputBlock).toContain('flex: 1');
    });

    it('should define .ct-search-clear with hover state', () => {
      const clearBlock = css.match(/\.ct-container \.ct-search-clear\s*\{[^}]*\}/)?.[0] || '';
      expect(clearBlock).toContain('cursor: pointer');
    });

    it('should define .ct-empty-state with centered text', () => {
      const emptyBlock = css.match(/\.ct-container \.ct-empty-state\s*\{[^}]*\}/)?.[0] || '';
      expect(emptyBlock).toContain('text-align: center');
    });

    it('should define .ct-list with flex column layout', () => {
      const listBlock = css.match(/\.ct-container \.ct-list\s*\{[^}]*\}/)?.[0] || '';
      expect(listBlock).toContain('display: flex');
      expect(listBlock).toContain('flex-direction: column');
    });

    it('should define .ct-list-item with hover state', () => {
      const listItemBlock = css.match(/\.ct-container \.ct-list-item\s*\{[^}]*\}/)?.[0] || '';
      expect(listItemBlock).toContain('cursor: pointer');
    });

    it('should define .ct-list-item-header with flex layout', () => {
      const headerBlock = css.match(/\.ct-container \.ct-list-item-header\s*\{[^}]*\}/)?.[0] || '';
      expect(headerBlock).toContain('display: flex');
    });

    it('should define .ct-list-name with bold text', () => {
      const nameBlock = css.match(/\.ct-container \.ct-list-name\s*\{[^}]*\}/)?.[0] || '';
      expect(nameBlock).toContain('font-weight: 600');
    });

    it('should define .ct-list-meta with flex layout', () => {
      const metaBlock = css.match(/\.ct-container \.ct-list-meta\s*\{[^}]*\}/)?.[0] || '';
      expect(metaBlock).toContain('display: flex');
    });

    it('should define .ct-list-details with flex wrap', () => {
      const detailsBlock = css.match(/\.ct-container \.ct-list-details\s*\{[^}]*\}/)?.[0] || '';
      expect(detailsBlock).toContain('flex-wrap: wrap');
    });

    it('should define .ct-list-preview with secondary text color', () => {
      const previewBlock = css.match(/\.ct-container \.ct-list-preview\s*\{[^}]*\}/)?.[0] || '';
      expect(previewBlock).toContain('color: var(--color-text-secondary)');
    });
  });

  describe('modal styles', () => {
    it('should define .ct-modal-overlay with fixed positioning and z-index', () => {
      const overlayBlock = css.match(/\.ct-container \.ct-modal-overlay\s*\{[^}]*\}/)?.[0] || '';
      expect(overlayBlock).toContain('position: fixed');
      expect(overlayBlock).toContain('z-index: 1000');
    });

    it('should define .ct-modal with max-width constraint', () => {
      const modalBlock = css.match(/\.ct-container \.ct-modal\s*\{[^}]*\}/)?.[0] || '';
      expect(modalBlock).toContain('max-width: 90vw');
    });

    it('should define .ct-modal-header with border bottom', () => {
      const headerBlock = css.match(/\.ct-container \.ct-modal-header\s*\{[^}]*\}/)?.[0] || '';
      expect(headerBlock).toContain('border-bottom: 1px solid');
    });

    it('should define .ct-modal-close with hover state', () => {
      const closeBlock = css.match(/\.ct-container \.ct-modal-close\s*\{[^}]*\}/)?.[0] || '';
      expect(closeBlock).toContain('cursor: pointer');
    });

    it('should define .ct-modal-body with scrollable overflow', () => {
      const bodyBlock = css.match(/\.ct-container \.ct-modal-body\s*\{[^}]*\}/)?.[0] || '';
      expect(bodyBlock).toContain('overflow-y: auto');
    });

    it('should define .ct-modal-footer with border top', () => {
      const footerBlock = css.match(/\.ct-container \.ct-modal-footer\s*\{[^}]*\}/)?.[0] || '';
      expect(footerBlock).toContain('border-top: 1px solid');
    });

    it('should define .ct-modal-actions and .ct-modal-buttons with flex layout', () => {
      const actionsBlock = css.match(/\.ct-container \.ct-modal-actions\s*\{[^}]*\}/)?.[0] || '';
      const buttonsBlock = css.match(/\.ct-container \.ct-modal-buttons\s*\{[^}]*\}/)?.[0] || '';
      expect(actionsBlock).toContain('display: flex');
      expect(buttonsBlock).toContain('display: flex');
    });
  });

  describe('form field styles', () => {
    it('should define .ct-label with secondary text color', () => {
      const labelBlock = css.match(/\.ct-container \.ct-label\s*\{[^}]*\}/)?.[0] || '';
      expect(labelBlock).toContain('color: var(--color-text-secondary)');
    });

    it('should define .ct-required with error color', () => {
      const requiredBlock = css.match(/\.ct-container \.ct-required\s*\{[^}]*\}/)?.[0] || '';
      expect(requiredBlock).toContain('color: var(--color-error)');
    });

    it('should define .ct-input with box-sizing border-box', () => {
      const inputBlock = css.match(/\.ct-container \.ct-input\s*\{[^}]*\}/)?.[0] || '';
      expect(inputBlock).toContain('box-sizing: border-box');
    });

    it('should define focus state for .ct-input with primary border and shadow', () => {
      const focusBlock = css.match(/\.ct-container \.ct-input:focus\s*\{[^}]*\}/)?.[0] || '';
      expect(focusBlock).toContain('border-color: var(--color-primary)');
      expect(focusBlock).toContain('box-shadow');
    });

    it('should define .ct-textarea with resize vertical', () => {
      const textareaBlock = css.match(/\.ct-container \.ct-textarea\s*\{[^}]*\}/)?.[0] || '';
      expect(textareaBlock).toContain('resize: vertical');
    });

    it('should define focus state for .ct-textarea with primary border and shadow', () => {
      const focusBlock = css.match(/\.ct-container \.ct-textarea:focus\s*\{[^}]*\}/)?.[0] || '';
      expect(focusBlock).toContain('border-color: var(--color-primary)');
      expect(focusBlock).toContain('box-shadow');
    });

    it('should define .ct-select with pointer cursor', () => {
      const selectBlock = css.match(/\.ct-container \.ct-select\s*\{[^}]*\}/)?.[0] || '';
      expect(selectBlock).toContain('cursor: pointer');
    });

    it('should define focus state for .ct-select with primary border and shadow', () => {
      const focusBlock = css.match(/\.ct-container \.ct-select:focus\s*\{[^}]*\}/)?.[0] || '';
      expect(focusBlock).toContain('border-color: var(--color-primary)');
      expect(focusBlock).toContain('box-shadow');
    });
  });

  describe('button styles', () => {
    it('should define .ct-btn with secondary background and hover state', () => {
      const btnBlock = css.match(/\.ct-container \.ct-btn\s*\{[^}]*\}/)?.[0] || '';
      expect(btnBlock).toContain('background: var(--background-color-button-secondary)');
    });

    it('should define .ct-btn-primary with primary color scheme', () => {
      const primaryBlock = css.match(/\.ct-container \.ct-btn-primary\s*\{[^}]*\}/)?.[0] || '';
      expect(primaryBlock).toContain('background: var(--color-primary)');
      expect(primaryBlock).toContain('color: var(--color-text-inverse)');
    });

    it('should define .ct-btn-danger with error color', () => {
      const dangerBlock = css.match(/\.ct-container \.ct-btn-danger\s*\{[^}]*\}/)?.[0] || '';
      expect(dangerBlock).toContain('color: var(--color-error)');
    });

    it('should disable .ct-btn with reduced opacity and not-allowed cursor', () => {
      const disabledBlock = css.match(/\.ct-container \.ct-btn:disabled\s*\{[^}]*\}/)?.[0] || '';
      expect(disabledBlock).toContain('cursor: not-allowed');
      expect(disabledBlock).toContain('opacity: 0.5');
    });
  });

  describe('responsive styles', () => {
    it('should include a max-width 600px media query', () => {
      expect(css).toContain('@media (max-width: 600px)');
    });

    it('should wrap header and adjust modal width in responsive view', () => {
      const responsiveMatch = css.match(/@media \(max-width:\s*600px\)\s*\{([\s\S]*?)\n\}/);
      expect(responsiveMatch).not.toBeNull();
      const responsiveSection = responsiveMatch ? responsiveMatch[1] : '';
      expect(responsiveSection).toContain('flex-wrap');
      expect(responsiveSection).toContain('95vw');
    });
  });

  describe('print styles', () => {
    it('should include a print media query', () => {
      expect(css).toContain('@media print');
    });

    it('should hide non-modal content during print using :has selector', () => {
      const printSection = css.match(/@media print\s*\{([\s\S]*?)\n\}/);
      expect(printSection).not.toBeNull();
      const printContent = printSection ? printSection[1] : '';
      expect(printContent).toContain(':has(.ct-modal)');
      expect(printContent).toContain('display: none');
    });

    it('should make modal visible and full-width during print', () => {
      const printSection = css.match(/@media print\s*\{([\s\S]*?)\n\}/);
      expect(printSection).not.toBeNull();
      const printContent = printSection ? printSection[1] : '';
      expect(printContent).toContain('max-width: 100%');
      expect(printContent).toContain('width: 100%');
    });
  });
});
