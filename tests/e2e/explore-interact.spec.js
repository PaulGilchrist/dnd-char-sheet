// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Interactive UI Exploration', () => {
  test('explore full app flow - campaign, character sheet, initiative, combat', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Step 1: Select test-campaign
    await page.getByRole('button', { name: 'test-campaign' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screensets/01-campaign-selected.png', fullPage: true });

    // Close any modals
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }

    // Step 2: Explore sidebar
    console.log('=== SIDEBAR EXPLORATION ===');
    const sidebarButtons = page.locator('.sidebar button, .sidebar a');
    const sidebarCount = await sidebarButtons.count();
    console.log(`Sidebar has ${sidebarCount} interactive elements`);
    for (let i = 0; i < sidebarCount; i++) {
      const text = await sidebarButtons.nth(i).textContent();
      const role = await sidebarButtons.nth(i).getAttribute('role');
      const cls = await sidebarButtons.nth(i).getAttribute('class');
      console.log(`  [${i}] role=${role} class="${cls}" text="${text?.trim()}"`);
    }

    // Step 3: Navigate to character sheet
    console.log('\n=== CHARACTER SHEET EXPLORATION ===');
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screensets/02-thin-s-sheet.png', fullPage: true });

    // Log all sections on character sheet
    const sections = page.locator('.sectionHeader');
    const sectionCount = await sections.count();
    console.log(`Character sheet has ${sectionCount} sections:`);
    for (let i = 0; i < sectionCount; i++) {
      const header = await sections.nth(i).textContent();
      console.log(`  Section ${i + 1}: ${header?.trim()}`);
    }

    // Log character summary area
    const summary = page.locator('[data-testid="char-summary-text"]');
    if (await summary.count() > 0) {
      console.log(`\nChar Summary: ${(await summary.textContent())?.trim()}`);
    }

    // Log HP/AC info
    const hpSection = page.locator('.hp-section, .char-hp');
    if (await hpSection.count() > 0) {
      console.log(`HP Section: ${(await hpSection.textContent())?.trim().substring(0, 200)}`);
    }

    // Log attack items
    const attacks = page.locator('.attack-item, .attack-button');
    const attackCount = await attacks.count();
    console.log(`\nAttacks: ${attackCount}`);
    for (let i = 0; i < attackCount; i++) {
      const text = await attacks.nth(i).textContent();
      console.log(`  Attack ${i + 1}: ${text?.trim().substring(0, 100)}`);
    }

    // Log action sections
    const actions = page.locator('.action-section, .actions-container, .available-actions');
    const actionCount = await actions.count();
    console.log(`\nAction containers: ${actionCount}`);

    // Log all buttons on character sheet
    const sheetButtons = page.locator('.char-sheet button');
    const sheetBtnCount = await sheetButtons.count();
    console.log(`\nCharacter sheet has ${sheetBtnCount} buttons:`);
    for (let i = 0; i < sheetBtnCount && i < 30; i++) {
      const btnText = await sheetButtons.nth(i).textContent();
      const btnRole = await sheetButtons.nth(i).getAttribute('role');
      const ariaLabel = await sheetButtons.nth(i).getAttribute('aria-label');
      console.log(`  [${i}] role=${btnRole} aria-label="${ariaLabel}" text="${btnText?.trim().substring(0, 50)}"`);
    }

    // Log all headings
    const headings = page.locator('.char-sheet h1, .char-sheet h2, .char-sheet h3, .char-sheet h4, .char-sheet h5');
    console.log(`\nHeadings on character sheet:`);
    for (let i = 0; i < await headings.count(); i++) {
      console.log(`  ${await headings.nth(i).textContent()?.trim()}`);
    }

    // Log features/traits
    const features = page.locator('.feature-item, .feature, .trait-item');
    console.log(`\nFeatures: ${await features.count()}`);

    // Log conditions/badges
    const badges = page.locator('.creature-badge, .condition-badge, .effect-badge');
    console.log(`Badges: ${await badges.count()}`);

    // Log initiative button
    const rollBtn = page.getByRole('button', { name: /roll.*initiative/i });
    if (await rollBtn.count() > 0) {
      console.log('\nRoll Initiative button found');
    }

    // Step 4: Navigate to Initiative
    console.log('\n=== INITIATIVE EXPLORATION ===');
    await page.getByRole('button', { name: 'Initiative' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screensets/03-initiative.png', fullPage: true });

    // Log creature cards in initiative
    const creatureCards = page.locator('.creature-card');
    const creatureCount = await creatureCards.count();
    console.log(`Initiative has ${creatureCount} creature cards:`);
    for (let i = 0; i < creatureCount; i++) {
      const card = creatureCards.nth(i);
      const nameEl = card.locator('.creature-name');
      const hpEl = card.locator('.creature-hp');
      const acEl = card.locator('.creature-ac');
      const name = await nameEl.textContent();
      const hp = await hpEl.textContent();
      const ac = await acEl.textContent();
      console.log(`  Creature ${i + 1}: name="${name?.trim()}" hp="${hp?.trim()}" ac="${ac?.trim()}"`);

      // Log buttons on each creature card
      const cardButtons = card.locator('button');
      const btnCount = await cardButtons.count();
      for (let j = 0; j < btnCount; j++) {
        const btnText = await cardButtons.nth(j).textContent();
        const btnAria = await cardButtons.nth(j).getAttribute('aria-label');
        console.log(`    Card button: text="${btnText?.trim()}" aria-label="${btnAria}"`);
      }
    }

    // Log initiative controls
    const nextBtn = page.getByRole('button', { name: /next/i });
    const prevBtn = page.getByRole('button', { name: /prev/i });
    const rollInitBtn = page.getByRole('button', { name: /roll.*initiative/i });
    console.log(`\nInitiative controls - Next: ${await nextBtn.count()}, Prev: ${await prevBtn.count()}, Roll: ${await rollInitBtn.count()}`);

    // Step 5: Try rolling initiative from character sheet
    console.log('\n=== TESTING ROLL INITIATIVE ===');
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await page.waitForTimeout(1000);

    // Check for Roll Initiative button
    if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
      console.log('Roll Initiative button is visible on character sheet');
      // Don't actually click it yet - just note it
    } else {
      console.log('Roll Initiative button NOT found on character sheet');
      // Check what buttons are available
      const allPageButtons = page.locator('button');
      const allBtnCount = await allPageButtons.count();
      console.log(`Total buttons on page: ${allBtnCount}`);
      for (let i = 0; i < allBtnCount && i < 20; i++) {
        const t = await allPageButtons.nth(i).textContent();
        console.log(`  Button ${i}: "${t?.trim()}"`);
      }
    }

    // Step 6: Check the encounter view
    console.log('\n=== ENCOUNTER EXPLORATION ===');
    await page.getByRole('button', { name: 'Encounter' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screensets/04-encounter.png', fullPage: true });

    const encounterElements = page.locator('.encounter-builder button, .encounter-builder input, .encounter-builder select');
    console.log(`Encounter has ${await encounterElements.count()} interactive elements`);

    // Log encounter buttons
    const encounterButtons = page.locator('.encounter-builder button');
    for (let i = 0; i < await encounterButtons.count(); i++) {
      console.log(`  Encounter button: "${await encounterButtons.nth(i).textContent()?.trim()}"`);
    }

    // Step 7: Check sidebar navigation
    console.log('\n=== SIDEBAR TAB EXPLORATION ===');
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await page.waitForTimeout(1000);

    // Try clicking each sidebar tab
    const sidebarTabs = page.locator('.sidebar-tab');
    const tabCount = await sidebarTabs.count();
    console.log(`Wizard sidebar has ${tabCount} tabs`);
    for (let i = 0; i < tabCount; i++) {
      const title = await sidebarTabs.nth(i).locator('.sidebar-tab-title').textContent();
      const number = await sidebarTabs.nth(i).locator('.sidebar-tab-number').textContent();
      console.log(`  Tab ${i}: ${number?.trim()} - ${title?.trim()}`);
    }

    console.log('\n=== EXPLORATION COMPLETE ===');
    await page.screenshot({ path: 'tests/e2e/screensets/05-complete.png', fullPage: true });
  });
});
