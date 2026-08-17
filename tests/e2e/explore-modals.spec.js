// @ts-check
import { test, expect } from '@playwright/test';

test('headed exploration - test-campaign workflow', async ({ page }) => {
  await page.goto('/');

  // Take screenshot of initial state
  await page.screenshot({ path: 'tests/e2e/screenshots/explore-0-campaign-select.png', fullPage: true });

  // Create the test campaign
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByPlaceholder('Enter campaign name').fill('test-campaign');
  await page.getByRole('button', { name: 'Create' }).click();

  // Wait for page reload and campaign to appear
  await expect(page.getByRole('button', { name: 'test-campaign' })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'tests/e2e/screenshots/explore-1-campaign-created.png', fullPage: true });

  // Select the test campaign
  await page.getByRole('button', { name: 'test-campaign' }).click();

  // Wait for the app to load
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/explore-2-app-loaded.png', fullPage: true });

  // Check what's visible
  const wizardVisible = await page.locator('.character-creation-wizard-overlay').isVisible().catch(() => false);
  const sidebarVisible = await page.locator('.sidebar').isVisible().catch(() => false);
  console.log(`Wizard auto-opened: ${wizardVisible}`);
  console.log(`Sidebar visible: ${sidebarVisible}`);

  // Log all overlays/modals
  const overlays = page.locator('[class*="overlay"], [class*="modal"], [class*="popup"], .sp-overlay, .cc-overlay, .ea-overlay:visible');
  const overlayCount = await overlays.count();
  console.log(`\nOverlays/modals: ${overlayCount}`);
  for (let i = 0; i < overlayCount; i++) {
    const cls = await overlays.nth(i).getAttribute('class');
    const text = (await overlays.nth(i).textContent()).substring(0, 150);
    console.log(`  Overlay ${i}: class="${cls}"\n    text="${text}"`);
  }

  // Log all visible buttons
  const buttons = page.locator('button:visible');
  const buttonCount = await buttons.count();
  console.log(`\nVisible buttons (${buttonCount}):`);
  for (let i = 0; i < Math.min(buttonCount, 100); i++) {
    const text = (await buttons.nth(i).textContent() || '').trim();
    const cls = (await buttons.nth(i).getAttribute('class') || '').substring(0, 80);
    const ariaLabel = await buttons.nth(i).getAttribute('aria-label') || '';
    const title = await buttons.nth(i).getAttribute('title') || '';
    const tag = await buttons.nth(i).evaluate(el => el.tagName);
    if (text || ariaLabel) {
      console.log(`  [${i}] <${tag.toLowerCase()}> text="${text.substring(0, 50)}" class="${cls}" aria-label="${ariaLabel}" title="${title}"`);
    }
  }

  // Log all visible headings
  const headings = page.locator('h1, h2, h3, h4:visible');
  const headingCount = await headings.count();
  console.log(`\nHeadings (${headingCount}):`);
  for (let i = 0; i < Math.min(headingCount, 30); i++) {
    const text = (await headings.nth(i).textContent() || '').trim();
    const tag = await headings.nth(i).evaluate(el => el.tagName);
    console.log(`  <${tag.toLowerCase()}> "${text.substring(0, 80)}"`);
  }

  // Log all visible labels
  const labels = page.locator('label:visible');
  const labelCount = await labels.count();
  console.log(`\nLabels (${labelCount}):`);
  for (let i = 0; i < Math.min(labelCount, 30); i++) {
    const text = (await labels.nth(i).textContent() || '').trim();
    console.log(`  "${text.substring(0, 80)}"`);
  }

  // Log all visible inputs
  const inputs = page.locator('input:visible, select:visible, textarea:visible');
  const inputCount = await inputs.count();
  console.log(`\nInputs (${inputCount}):`);
  for (let i = 0; i < Math.min(inputCount, 30); i++) {
    const tag = await inputs.nth(i).evaluate(el => el.tagName);
    const type = await inputs.nth(i).getAttribute('type') || '';
    const placeholder = await inputs.nth(i).getAttribute('placeholder') || '';
    const label = await inputs.nth(i).getAttribute('aria-label') || '';
    const id = await inputs.nth(i).getAttribute('id') || '';
    console.log(`  <${tag.toLowerCase()}> type="${type}" id="${id}" aria-label="${label}" placeholder="${placeholder}"`);
  }

  // Press Escape to close any modals
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: 'tests/e2e/screenshots/explore-3-after-escapes.png', fullPage: true });

  // Check sidebar for Add Character
  const sidebarLinks = page.locator('.sidebar-link');
  const linkCount = await sidebarLinks.count();
  console.log(`\nSidebar links: ${linkCount}`);
  for (let i = 0; i < linkCount; i++) {
    const text = (await sidebarLinks.nth(i).textContent() || '').trim();
    console.log(`  [${i}] "${text.substring(0, 50)}"`);
  }

  // Now open the character creation wizard
  const addCharBtn = page.getByRole('button', { name: 'Add Character' });
  if (await addCharBtn.count() > 0 && await addCharBtn.isVisible()) {
    await addCharBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/explore-4-wizard-opened.png', fullPage: true });

    // Log wizard state
    const wizardOverlays = page.locator('[class*="overlay"], [class*="modal"], .sp-overlay, .cc-overlay, .ea-overlay:visible');
    const wzCount = await wizardOverlays.count();
    console.log(`\nWizard overlays: ${wzCount}`);
    for (let i = 0; i < wzCount; i++) {
      const cls = await wizardOverlays.nth(i).getAttribute('class');
      const text = (await wizardOverlays.nth(i).textContent()).substring(0, 150);
      console.log(`  Overlay ${i}: class="${cls}"\n    text="${text}"`);
    }

    // Log wizard buttons
    const wzButtons = page.locator('.character-creation-wizard-overlay button:visible');
    const wzButtonCount = await wzButtons.count();
    console.log(`\nWizard buttons (${wzButtonCount}):`);
    for (let i = 0; i < Math.min(wzButtonCount, 50); i++) {
      const text = (await wzButtons.nth(i).textContent() || '').trim();
      const cls = (await wzButtons.nth(i).getAttribute('class') || '').substring(0, 80);
      const ariaLabel = await wzButtons.nth(i).getAttribute('aria-label') || '';
      if (text || ariaLabel) {
        console.log(`  [${i}] text="${text.substring(0, 50)}" class="${cls}" aria-label="${ariaLabel}"`);
      }
    }

    // Log wizard labels
    const wzLabels = page.locator('.character-creation-wizard-overlay label:visible');
    const wzLabelCount = await wzLabels.count();
    console.log(`\nWizard labels (${wzLabelCount}):`);
    for (let i = 0; i < Math.min(wzLabelCount, 30); i++) {
      const text = (await wzLabels.nth(i).textContent() || '').trim();
      console.log(`  "${text.substring(0, 80)}"`);
    }

    // Log wizard inputs
    const wzInputs = page.locator('.character-creation-wizard-overlay input:visible, .character-creation-wizard-overlay select:visible');
    const wzInputCount = await wzInputs.count();
    console.log(`\nWizard inputs (${wzInputCount}):`);
    for (let i = 0; i < Math.min(wzInputCount, 30); i++) {
      const tag = await wzInputs.nth(i).evaluate(el => el.tagName);
      const type = await wzInputs.nth(i).getAttribute('type') || '';
      const placeholder = await wzInputs.nth(i).getAttribute('placeholder') || '';
      const label = await wzInputs.nth(i).getAttribute('aria-label') || '';
      const id = await wzInputs.nth(i).getAttribute('id') || '';
      console.log(`  <${tag.toLowerCase()}> type="${type}" id="${id}" aria-label="${label}" placeholder="${placeholder}"`);
    }

    // Log wizard sidebar tabs
    const wzTabs = page.locator('.sidebar-tab');
    const tabCount = await wzTabs.count();
    console.log(`\nWizard sidebar tabs (${tabCount}):`);
    for (let i = 0; i < tabCount; i++) {
      const title = (await wzTabs.nth(i).locator('.sidebar-tab-title').textContent() || '').trim();
      const number = (await wzTabs.nth(i).locator('.sidebar-tab-number').textContent() || '').trim();
      console.log(`  [${i}] ${number} - "${title}"`);
    }
  }
});
