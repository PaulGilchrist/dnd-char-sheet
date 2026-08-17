// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TEST_CAMPAIGN = 'test-campaign';
const CAMPAIGNS_ROOT = path.join(process.cwd(), 'public', 'campaigns');

test.describe('E2E Test Setup - 2024 Ruleset', () => {
  test('set up test-campaign and create two level-20 characters (2024)', async ({ page }) => {
    await page.goto('/');

    await page.screenshot({ path: 'tests/e2e/screenshots/01-campaign-selection.png', fullPage: true });

    const campaignExists = fs.existsSync(path.join(CAMPAIGNS_ROOT, TEST_CAMPAIGN));
    if (!campaignExists) {
      await page.getByRole('button', { name: 'Add' }).click();
      await page.getByPlaceholder('Enter campaign name').fill(TEST_CAMPAIGN);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('button', { name: TEST_CAMPAIGN })).toBeVisible({ timeout: 10000 });
    }

    await page.getByRole('button', { name: TEST_CAMPAIGN }).click();

    // Open wizard - it may auto-open for empty campaign or we need to click Add Character
    let wizardVisible = await page.locator('.character-creation-wizard-overlay').isVisible().catch(() => false);
    if (!wizardVisible) {
      await page.getByRole('button', { name: 'Add Character' }).click();
    }
    await expect(page.locator('.character-creation-wizard-overlay')).toBeVisible({ timeout: 10000 });

    await createCharacter2024(page, {
      name: 'Thorin Ironforge',
      level: 20,
      race: 'Human',
      background: 'Soldier',
      class: 'Fighter',
      subclass: 'Eldritch Knight',
      abilityScores: { str: 20, dex: 16, con: 16, int: 10, wis: 8, chs: 8 },
      feats: ['Actor'],
    });

    await page.screenshot({ path: 'tests/e2e/screenshots/04-character-1-created.png', fullPage: true });

    // Close wizard and reopen for second character
    await closeWizard(page);

    await createCharacter2024(page, {
      name: 'Lyra Starweave',
      level: 20,
      race: 'Elf',
      background: 'Sage',
      class: 'Wizard',
      subclass: 'Evocation',
      abilityScores: { str: 8, dex: 14, con: 13, int: 20, wis: 16, chs: 10 },
      feats: ['Artillerist'],
    });

    await page.screenshot({ path: 'tests/e2e/screenshots/05-character-2-created.png', fullPage: true });

    await expect(page.getByRole('button', { name: 'Thorin Ironforge' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lyra Starweave' })).toBeVisible();

    console.log('Test setup complete!');
  });
});

async function createCharacter2024(page, config) {
  // Ensure wizard is on Ruleset step
  const wizardVisible = await page.locator('.character-creation-wizard-overlay').isVisible();
  if (!wizardVisible) {
    await page.getByRole('button', { name: 'Add Character' }).click();
    await expect(page.locator('.character-creation-wizard-overlay')).toBeVisible({ timeout: 10000 });
  }

  // Check if we're on the Ruleset step
  const rulesetHeading = page.locator('.wizard-step h2');
  const stepText = await rulesetHeading.first().textContent();
  if (stepText && !stepText.includes('Ruleset')) {
    // Navigate to Ruleset step via sidebar
    const tabs = page.locator('.sidebar-tab');
    const tabCount = await tabs.count();
    for (let i = 0; i < tabCount; i++) {
      const title = await tabs.nth(i).locator('.sidebar-tab-title').textContent();
      if (title && title.toLowerCase().includes('ruleset')) {
        await tabs.nth(i).click();
        await closeAllModals(page);
        break;
      }
    }
  }

  // Step 1: Ruleset - select 2024
  await page.getByRole('heading', { name: '2024 Rules (Essentials)' }).click();
  await closeAllModals(page);

  // Step 2: Basic Information
  await page.locator('.wizard-step input[type="text"]').first().fill(config.name);
  await page.locator('.wizard-step input[type="number"]').first().fill(config.level.toString());
  await clickWizardNext(page);
  await closeAllModals(page);

  // Step 3: Race
  const raceSelect = page.locator('.wizard-step select').first();
  if (await raceSelect.count() > 0 && await raceSelect.isVisible()) {
    await selectOptionIfExists(raceSelect, config.race);
  }
  await clickWizardNext(page);
  await closeAllModals(page);

  // Step 4: Subrace (may be hidden for Human in 2024)
  const subraceSelect = page.locator('.wizard-step select').first();
  if (await subraceSelect.count() > 0 && await subraceSelect.isVisible()) {
    const options = await subraceSelect.locator('option').all();
    const values = [];
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val) values.push(val);
    }
    if (values.includes(config.race)) {
      // Subrace step shows races - skip by selecting first
      await subraceSelect.selectOption(values[0]);
    } else if (values.length > 0) {
      await subraceSelect.selectOption(values[0]);
    }
  }
  await clickWizardNext(page);
  await closeAllModals(page);

  // Step 5: Background
  const bgSelect = page.locator('.wizard-step select').first();
  if (await bgSelect.count() > 0 && await bgSelect.isVisible()) {
    await selectOptionIfExists(bgSelect, config.background);
  }
  await clickWizardNext(page);
  await closeAllModals(page);

  // Step 6: Class
  const classSelect = page.locator('.wizard-step select').first();
  if (await classSelect.count() > 0 && await classSelect.isVisible()) {
    await selectOptionIfExists(classSelect, config.class);
  }
  await clickWizardNext(page);
  await closeAllModals(page);

  // Step 7: Subclass / Major
  const subclassSelect = page.locator('.wizard-step select').first();
  if (await subclassSelect.count() > 0 && await subclassSelect.isVisible()) {
    await selectOptionIfExists(subclassSelect, config.subclass);
  }
  await clickWizardNext(page);
  await closeAllModals(page);

  // Navigate to Ability Scores via sidebar
  const abilityTabs = page.locator('.sidebar-tab');
  const tabCount = await abilityTabs.count();
  for (let i = 0; i < tabCount; i++) {
    const title = await abilityTabs.nth(i).locator('.sidebar-tab-title').textContent();
    if (title && title.toLowerCase().includes('ability')) {
      await abilityTabs.nth(i).click();
      await closeAllModals(page);
      break;
    }
  }

  // Set ability scores
  const abilityMap = { str: 'str', dex: 'dex', con: 'con', int: 'int', wis: 'wis', chs: 'cha' };
  for (const [ability, key] of Object.entries(abilityMap)) {
    if (config.abilityScores[ability] !== undefined) {
      const input = page.locator(`#base-score-${key}`);
      if (await input.count() > 0 && await input.isVisible()) {
        await input.fill(config.abilityScores[ability].toString());
      }
    }
  }
  await closeAllModals(page);

  // Navigate to Feats step
  for (let i = 0; i < tabCount; i++) {
    const title = await abilityTabs.nth(i).locator('.sidebar-tab-title').textContent();
    if (title && title.toLowerCase().includes('feat')) {
      await abilityTabs.nth(i).click();
      await closeAllModals(page);
      break;
    }
  }

  // Select feats (skip if not found - focus on getting character created)
  for (const featName of config.feats) {
    const searchInput = page.locator('.wizard-step-feats input[type="text"]').first();
    if (await searchInput.count() > 0 && await searchInput.isVisible()) {
      await searchInput.fill(featName);
      await closeAllModals(page);
      const featItems = page.getByRole('listitem').filter({ hasText: featName });
      if (await featItems.count() > 0 && await featItems.first().isVisible()) {
        await featItems.first().click();
        await closeAllModals(page);
      }
      await searchInput.fill('');
      await closeAllModals(page);
    }
  }

  // Navigate to last step and create
  for (let i = tabCount - 1; i >= 0; i--) {
    await abilityTabs.nth(i).click();
    await closeAllModals(page);
    const createBtn = page.getByRole('button', { name: 'Create Character' });
    if (await createBtn.count() > 0 && await createBtn.isVisible()) {
      await createBtn.click();
      await expect(page.locator('.character-creation-wizard-overlay')).toBeHidden({ timeout: 10000 });
      break;
    }
  }

  await expect(page.getByRole('button', { name: config.name })).toBeVisible({ timeout: 10000 });
}

async function selectOptionIfExists(select, value) {
  const options = await select.locator('option').all();
  const values = [];
  for (const opt of options) {
    const val = await opt.getAttribute('value');
    if (val) values.push(val);
  }
  if (values.includes(value)) {
    await select.selectOption(value);
  } else if (values.length > 0) {
    // Select first available to advance
    await select.selectOption(values[0]);
  }
}

async function clickWizardNext(page) {
  await page.getByRole('button', { name: 'Next' }).click();
}

async function closeAllModals(page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
  }
}

async function closeWizard(page) {
  const closeBtn = page.locator('.close-btn');
  if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
}
