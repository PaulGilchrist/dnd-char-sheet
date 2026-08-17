// @ts-check
import { test, expect } from '@playwright/test';

const TEST_CAMPAIGN = 'test-campaign';

test.describe('Combat & Initiative E2E Tests', () => {
  test('navigate to initiative and add NPCs', async ({ page }) => {
    await page.goto('/');

    // Select test-campaign
    await page.getByRole('button', { name: TEST_CAMPAIGN }).click();
    await page.waitForTimeout(2000);

    // Close any modals
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }

    // Navigate to Initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/combat-01-initiative.png', fullPage: true });

    // Log initial creatures
    const initialCreatures = page.locator('.creature-card');
    const initialCount = await initialCreatures.count();
    console.log(`Initial creature cards: ${initialCount}`);
    for (let i = 0; i < initialCount; i++) {
      const name = initialCreatures.nth(i).locator('.creature-name').textContent();
      console.log(`  Creature ${i + 1}: ${(await name).trim()}`);
    }

    // Add NPC 1 - click "+ NPC" button
    await page.getByRole('button', { name: '+ NPC' }).click();
    await page.waitForTimeout(500);

    // Close any modals
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/combat-02-npc-added.png', fullPage: true });

    // Verify NPC was added
    const afterFirstNpc = page.locator('.creature-card');
    const afterFirstCount = await afterFirstNpc.count();
    console.log(`Creatures after adding first NPC: ${afterFirstCount}`);

    // Find and rename the NPC to "Bugbear"
    // Click on the NPC name to edit it
    const npcNameInputs = page.locator('.creature-name input');
    if (await npcNameInputs.count() > 0) {
      await npcNameInputs.first().fill('Bugbear');
      await npcNameInputs.first().press('Enter');
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/combat-03-bugbear-renamed.png', fullPage: true });

    // Add NPC 2 - Goblin
    await page.getByRole('button', { name: '+ NPC' }).click();
    await page.waitForTimeout(500);

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }

    // Rename second NPC to "Goblin"
    const npcNameInputs2 = page.locator('.creature-name input');
    if (await npcNameInputs2.count() > 1) {
      await npcNameInputs2.nth(1).fill('Goblin');
      await npcNameInputs2.nth(1).press('Enter');
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/combat-04-goblin-added.png', fullPage: true });

    // Verify all creatures
    const finalCreatures = page.locator('.creature-card');
    const finalCount = await finalCreatures.count();
    console.log(`Final creature count: ${finalCount}`);

    for (let i = 0; i < finalCount; i++) {
      const name = finalCreatures.nth(i).locator('.creature-name').textContent();
      const text = (await name).trim();
      console.log(`  Creature ${i + 1}: ${text}`);
    }

    // Take screenshot of full initiative
    await page.screenshot({ path: 'tests/e2e/screenshots/combat-05-full-initiative.png', fullPage: true });

    console.log('Initiative test complete!');
  });

  test('navigate to character sheet and view actions', async ({ page }) => {
    await page.goto('/');

    // Select test-campaign
    await page.getByRole('button', { name: TEST_CAMPAIGN }).click();
    await page.waitForTimeout(2000);

    // Close any modals
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }

    // Click on Thorin Ironforge in sidebar
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/combat-06-char-sheet.png', fullPage: true });

    // Log character summary
    const charName = page.locator('.char-header .name').first().textContent();
    console.log(`Character: ${(await charName).trim()}`);

    // Log HP and AC
    const summaryText = page.locator('[data-testid="char-summary-text"]').first().textContent();
    console.log(`Summary: ${(await summaryText).trim().substring(0, 100)}`);

    // Log actions sections
    const actionSections = page.locator('.sectionHeader');
    const sectionCount = await actionSections.count();
    console.log(`Action sections: ${sectionCount}`);
    for (let i = 0; i < sectionCount; i++) {
      const header = actionSections.nth(i).textContent();
      console.log(`  Section ${i + 1}: ${(await header).trim()}`);
    }

    // Log attack items
    const attackItems = page.locator('.attack-item');
    const attackCount = await attackItems.count();
    console.log(`Attack items: ${attackCount}`);

    // Take screenshot of actions
    await page.screenshot({ path: 'tests/e2e/screenshots/combat-07-actions.png', fullPage: true });

    console.log('Character sheet test complete!');
  });
});
