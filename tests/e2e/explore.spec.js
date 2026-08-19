// @ts-check
import { test, expect } from '@playwright/test';
import { createCampaign, setCharacterName, setCharacterLevel, selectRace, selectSubrace, selectClass, selectSubclass, clickWizardNext, clickWizardSave, navigateToWizardStep, setGoldPieces, navigateToInitiative, addNPC } from './helpers.js';

test.describe('E2E Exploration - Step by Step', () => {
  test('explore campaign creation and wizard flow', async ({ page }) => {
    await page.goto('/');

    // Step 1: Create campaign
    await createCampaign(page, 'QA Testing');
    await page.screenshot({ path: 'tests/e2e/screenshots/1-campaign-created.png', fullPage: true });

    // Step 2: Wizard should auto-open (no characters)
    await expect(page.locator('.character-creation-wizard-overlay')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/2-wizard-opened.png', fullPage: true });

    // Step 3: Basic Information
    await setCharacterName(page, 'Thorin Ironforge');
    await setCharacterLevel(page, '20');

    // Log all labels on this step
    const labels = page.locator('label');
    const labelCount = await labels.count();
    console.log(`Basic Info step has ${labelCount} labels`);

    await page.screenshot({ path: 'tests/e2e/screenshots/3-basic-info.png', fullPage: true });

    // Step 4: Race
    await clickWizardNext(page);
    await expect(page.getByLabel('Race *')).toBeVisible();

    // Log available races
    const raceSelect = page.getByLabel('Race *');
    const raceOptions = await raceSelect.locator('option').all();
    const raceList = [];
    for (const opt of raceOptions) {
      const val = await opt.getAttribute('value');
      const text = await opt.textContent();
      if (val) raceList.push(text.trim());
    }
    console.log(`Available races: ${raceList.join(', ')}`);

    await selectRace(page, 'Human');
    await page.screenshot({ path: 'tests/e2e/screenshots/4-race-selected.png', fullPage: true });

    // Step 5: Subrace (if available)
    const subraceLabel = page.getByLabel('Subrace *');
    if (await subraceLabel.count() > 0 && await subraceLabel.isVisible()) {
      const subraceOptions = await subraceLabel.locator('option').all();
      const subraceList = [];
      for (const opt of subraceOptions) {
        const val = await opt.getAttribute('value');
        const text = await opt.textContent();
        if (val) subraceList.push(text.trim());
      }
      console.log(`Available subraces for Human: ${subraceList.join(', ')}`);

      if (subraceList.length > 0) {
        await selectSubrace(page, subraceList[0]);
      }
    } else {
      console.log('No subrace step for this race');
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/5-subrace.png', fullPage: true });

    // Step 6: Class
    await clickWizardNext(page);
    await expect(page.getByLabel('Class *')).toBeVisible();

    // Log available classes
    const classSelect = page.getByLabel('Class *');
    const classOptions = await classSelect.locator('option').all();
    const classList = [];
    for (const opt of classOptions) {
      const val = await opt.getAttribute('value');
      const text = await opt.textContent();
      if (val) classList.push(text.trim());
    }
    console.log(`Available classes: ${classList.join(', ')}`);

    await selectClass(page, 'Fighter');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/6-class-selected.png', fullPage: true });

    // Step 7: Subclass
    const subclassLabel = page.getByLabel('Subclass / Major *');
    if (await subclassLabel.count() > 0 && await subclassLabel.isVisible()) {
      const subclassOptions = await subclassLabel.locator('option').all();
      const subclassList = [];
      for (const opt of subclassOptions) {
        const val = await opt.getAttribute('value');
        const text = await opt.textContent();
        if (val) subclassList.push(text.trim());
      }
      console.log(`Available subclasses for Fighter: ${subclassList.join(', ')}`);

      if (subclassList.length > 0) {
        await selectSubclass(page, subclassList[0]);
      }
    } else {
      console.log('No subclass step');
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/7-subclass.png', fullPage: true });

    // Log all sidebar tabs to understand step ordering
    const sidebarTabs = page.locator('.sidebar-tab');
    const tabCount = await sidebarTabs.count();
    console.log(`Wizard has ${tabCount} sidebar tabs:`);
    for (let i = 0; i < tabCount; i++) {
      const title = await sidebarTabs.nth(i).locator('.sidebar-tab-title').textContent();
      const number = await sidebarTabs.nth(i).locator('.sidebar-tab-number').textContent();
      if (title) console.log(`  Tab ${i + 1}: ${number} - ${title.trim()}`);
    }

    // Step 8: Resistances (may be skipped in 5e)
    // Step 9: Spells
    // Step 10: Magic Items
    // Step 11: Inventory
    // Step 12: Feats
    // Step 13: Special Actions
    // Step 14: Ability Scores
    // Step 15: Skills
    // Step 16: Tools
    // Step 17: Languages

    // Navigate to Feats step to test feat selection
    await navigateToWizardStep(page, 'Feats');
    await page.screenshot({ path: 'tests/e2e/screenshots/feats-step.png', fullPage: true });

    // Navigate to Ability Scores step
    await navigateToWizardStep(page, 'Ability');
    await page.screenshot({ path: 'tests/e2e/screenshots/abilities-step.png', fullPage: true });

    // Navigate to Spells step
    await navigateToWizardStep(page, 'Spells');
    await page.screenshot({ path: 'tests/e2e/screenshots/spells-step.png', fullPage: true });

    // Navigate to Inventory step
    await navigateToWizardStep(page, 'Inventory');
    await setGoldPieces(page, '250');
    await page.screenshot({ path: 'tests/e2e/screenshots/inventory-step.png', fullPage: true });

    // Go back to first step and complete wizard
    await navigateToWizardStep(page, 'Basic');
    await setCharacterName(page, 'Thorin Ironforge');
    await setCharacterLevel(page, '20');

    // Navigate through remaining steps using sidebar
    await navigateToWizardStep(page, 'Race');
    await selectRace(page, 'Human');

    const subraceLabel2 = page.getByLabel('Subrace *');
    if (await subraceLabel2.count() > 0 && await subraceLabel2.isVisible()) {
      const subraceOptions2 = await subraceLabel2.locator('option').all();
      for (const opt of subraceOptions2) {
        const val = await opt.getAttribute('value');
        if (val) { await subraceLabel2.selectOption(val); break; }
      }
    }

    await navigateToWizardStep(page, 'Class');
    await selectClass(page, 'Fighter');

    const subclassLabel2 = page.getByLabel('Subclass / Major *');
    if (await subclassLabel2.count() > 0 && await subclassLabel2.isVisible()) {
      const subclassOptions2 = await subclassLabel2.locator('option').all();
      for (const opt of subclassOptions2) {
        const val = await opt.getAttribute('value');
        if (val) { await subclassLabel2.selectOption(val); break; }
      }
    }

    // Save the character
    await clickWizardSave(page);
    await page.screenshot({ path: 'tests/e2e/screenshots/8-saved.png', fullPage: true });

    // Navigate to final step and create character
    // Find the last sidebar tab (should be "Save" or the final step)
    const allTabs = page.locator('.sidebar-tab');
    const lastTab = allTabs.last();
    const lastTabTitle = await lastTab.locator('.sidebar-tab-title').textContent();
    console.log(`Last sidebar tab: ${lastTabTitle}`);

    // Click through to reach the create character button
    // The final step should have the "Create Character" button
    await navigateToWizardStep(page, 'Save');
    await page.waitForTimeout(500);

    // Try to find and click the Create Character button
    const createBtn = page.getByRole('button', { name: 'Create Character' });
    if (await createBtn.count() > 0 && await createBtn.isVisible()) {
      await createBtn.click();
      await expect(page.locator('.character-creation-wizard-overlay')).toBeHidden({ timeout: 15000 });
      await page.screenshot({ path: 'tests/e2e/screenshots/9-character-created.png', fullPage: true });
    } else {
      // Try navigating to the actual last step
      for (let i = await allTabs.count() - 1; i >= 0; i--) {
        await allTabs.nth(i).click();
        await page.waitForTimeout(300);
        const btn = page.getByRole('button', { name: 'Create Character' });
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          await expect(page.locator('.character-creation-wizard-overlay')).toBeHidden({ timeout: 15000 });
          await page.screenshot({ path: 'tests/e2e/screenshots/9-character-created.png', fullPage: true });
          break;
        }
      }
    }

    // Verify character appears in sidebar
    await expect(page.getByRole('button', { name: 'Thorin Ironforge' })).toBeVisible({ timeout: 10000 });

    // Navigate to initiative
    await navigateToInitiative(page);
    await page.screenshot({ path: 'tests/e2e/screenshots/10-initiative.png', fullPage: true });

    // Log creature cards
    const creatures = page.locator('.creature-card');
    const creatureCount = await creatures.count();
    console.log(`Found ${creatureCount} creature cards in initiative`);
    for (let i = 0; i < creatureCount; i++) {
      const name = creatures.nth(i).locator('.creature-name');
      if (await name.count() > 0) {
        console.log(`  Creature ${i + 1}: ${(await name.textContent()).trim()}`);
      }
    }

    // Try adding an NPC
    await addNPC(page, 'Bugbear');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/11-npc-added.png', fullPage: true });
  });
});
