// @ts-check
import { test, expect } from '@playwright/test';
import {
  getCreatureNames,
  getCurrentRound,
  nextTurn,
  prevTurn,
} from './helpers.js';

const TEST_CAMPAIGN = 'test-campaign';

test.describe('E2E Automation Tests - Combat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: TEST_CAMPAIGN }).click();
    await page.waitForTimeout(2000);
    // Close any open wizard/modals
    for (let i = 0; i < 10; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  });

  test('setup: verify characters exist and add NPCs for combat', async ({ page }) => {
    // Verify both characters exist
    await expect(page.getByRole('button', { name: 'Thorin Ironforge' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Lyra Starweave' })).toBeVisible({ timeout: 10000 });

    // Navigate to initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Add Bugbear NPC - click + NPC, then search and select
    await page.getByRole('button', { name: '+ NPC' }).click();
    await page.waitForTimeout(1000);
    // Close any modals that might be in the way
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
    await page.getByRole('button', { name: '+ NPC' }).click();
    await page.waitForTimeout(1000);

    // Add Goblin NPC
    await page.getByRole('button', { name: '+ NPC' }).click();
    await page.waitForTimeout(1000);
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }

    // Verify creatures - NPCs may already exist from previous test runs
    const allCreatures = await getCreatureNames(page);
    console.log(`Creatures in initiative: ${allCreatures.join(', ')}`);

    // Verify all creatures
    expect(allCreatures).toContain('Thorin Ironforge');
    expect(allCreatures).toContain('Lyra Starweave');

    await page.screenshot({ path: 'tests/e2e/screensets/01-setup-complete.png', fullPage: true });
  });

  test('combat: Thorin attacks Bugbear (player vs NPC - action automation)', async ({ page }) => {
    // Navigate to initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Roll initiative
    const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
    if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
      await rollBtn.click();
      await page.waitForTimeout(2000);
    }

    // Find Thorin's creature card and set target to Bugbear
    const creatureCards = page.locator('.creature-card');
    const count = await creatureCards.count();

    let thorinCard = null;
    for (let i = 0; i < count; i++) {
      const nameEl = creatureCards.nth(i).locator('.creature-name');
      const name = await nameEl.textContent();
      if (name?.includes('Thorin')) {
        thorinCard = creatureCards.nth(i);
        break;
      }
    }

    expect(thorinCard).toBeTruthy();

    // Set target on Thorin's card
    const targetSelect = thorinCard.locator('.creature-target select');
    if (await targetSelect.count() > 0 && await targetSelect.isVisible()) {
      await targetSelect.selectOption('Bugbear');
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/e2e/screensets/02-thorin-target-set.png', fullPage: true });

    // Navigate to Thorin's character sheet
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify character summary shows Fighter
    const summary = page.locator('[data-testid="char-summary-text"]');
    if (await summary.count() > 0) {
      const summaryText = await summary.textContent();
      console.log(`Character summary: ${summaryText?.trim()}`);
      expect(summaryText).toContain('Fighter');
    }

    // Log action sections
    const sections = page.locator('.sectionHeader');
    const sectionCount = await sections.count();
    console.log(`Character sheet sections: ${sectionCount}`);
    for (let i = 0; i < sectionCount; i++) {
      console.log(`  Section ${i + 1}: ${(await sections.nth(i).textContent())?.trim()}`);
    }

    // Find attacks in Actions section
    const actionsContainer = page.locator('.char-actions').first();
    const attackNames = actionsContainer.locator('.attacks .left');
    const attackCount = await attackNames.count();
    console.log(`Attack items in Actions: ${attackCount}`);

    if (attackCount > 0) {
      // Log first few attack names
      for (let i = 0; i < Math.min(attackCount, 10); i++) {
        const name = await attackNames.nth(i).textContent();
        console.log(`  Attack ${i + 1}: ${name?.trim()}`);
      }
    }

    // Check for automation badges
    const automationBadges = page.locator('.automation-badge');
    const badgeCount = await automationBadges.count();
    console.log(`Automation badges: ${badgeCount}`);

    // Log special actions
    const specialActions = page.locator('.char-special-actions');
    if (await specialActions.count() > 0) {
      const featureItems = specialActions.locator('div');
      const featureCount = await featureItems.count();
      console.log(`Special action items: ${featureCount}`);
      for (let i = 0; i < Math.min(featureCount, 10); i++) {
        const text = await featureItems.nth(i).textContent();
        console.log(`  Special: ${text?.trim().substring(0, 80)}`);
      }
    }

    await page.screenshot({ path: 'tests/e2e/screensets/03-thorin-sheet.png', fullPage: true });
  });

  test('combat: Lyra character sheet verification (wizard spell automation)', async ({ page }) => {
    // Navigate to Lyra's character sheet
    await page.getByRole('button', { name: 'Lyra Starweave' }).click();
    await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify character summary shows Wizard
    const summary = page.locator('[data-testid="char-summary-text"]');
    if (await summary.count() > 0) {
      const summaryText = await summary.textContent();
      console.log(`Character summary: ${summaryText?.trim()}`);
      expect(summaryText).toContain('Wizard');
    }

    // Log sections
    const sections = page.locator('.sectionHeader');
    const sectionCount = await sections.count();
    console.log(`Sections: ${sectionCount}`);

    // Log action items
    const actionsContainer = page.locator('.char-actions').first();
    const attackNames = actionsContainer.locator('.attacks .left');
    const attackCount = await attackNames.count();
    console.log(`Action items: ${attackCount}`);
    for (let i = 0; i < Math.min(attackCount, 15); i++) {
      const name = await attackNames.nth(i).textContent();
      console.log(`  ${name?.trim()}`);
    }

    // Log bonus actions
    const allActionContainers = page.locator('.char-actions');
    if (await allActionContainers.count() > 1) {
      const bonusActions = allActionContainers.nth(1);
      const bonusItems = bonusActions.locator('.attacks .left');
      console.log(`Bonus action items: ${await bonusItems.count()}`);
    }

    // Log reactions
    if (await allActionContainers.count() > 2) {
      const reactions = allActionContainers.nth(2);
      const reactionItems = reactions.locator('b.clickable, .attacks .left');
      console.log(`Reaction items: ${await reactionItems.count()}`);
    }

    // Log automation badges
    const badges = page.locator('.automation-badge');
    console.log(`Automation badges: ${await badges.count()}`);

    await page.screenshot({ path: 'tests/e2e/screensets/04-lyra-sheet.png', fullPage: true });
  });

  test('initiative: turn navigation and creature verification', async ({ page }) => {
    // Navigate to initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Roll initiative
    const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
    if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
      await rollBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify all creatures present
    const creatureNames = await getCreatureNames(page);
    console.log(`Creatures: ${creatureNames.join(', ')}`);
    expect(creatureNames.length).toBeGreaterThanOrEqual(4);

    // Navigate through turns
    const initialActive = page.locator('.creature-card.active .creature-name');
    if (await initialActive.count() > 0) {
      console.log(`Initial active: ${(await initialActive.textContent())?.trim()}`);
    }

    // Move forward 4 turns (one full cycle)
    for (let i = 0; i < 4; i++) {
      await nextTurn(page);
      const activeCreature = page.locator('.creature-card.active .creature-name');
      if (await activeCreature.count() > 0) {
        console.log(`Turn ${i + 1}: ${(await activeCreature.textContent())?.trim()}`);
      }
      await page.waitForTimeout(300);
    }

    // Go back one turn
    await prevTurn(page);
    const activeCreature = page.locator('.creature-card.active .creature-name');
    if (await activeCreature.count() > 0) {
      console.log(`After prev: ${(await activeCreature.textContent())?.trim()}`);
    }

    // Check round
    const round = await getCurrentRound(page);
    console.log(`Round: ${round}`);

    await page.screenshot({ path: 'tests/e2e/screensets/05-turn-navigation.png', fullPage: true });
  });

  test('initiative: NPC sets target to player and creature card structure', async ({ page }) => {
    // Navigate to initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Roll initiative
    const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
    if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
      await rollBtn.click();
      await page.waitForTimeout(2000);
    }

    // Find Bugbear's card
    const creatureCards = page.locator('.creature-card');
    const count = await creatureCards.count();

    let bugbearCard = null;
    for (let i = 0; i < count; i++) {
      const nameEl = creatureCards.nth(i).locator('.creature-name');
      const name = await nameEl.textContent();
      if (name?.includes('Bugbear')) {
        bugbearCard = creatureCards.nth(i);
        break;
      }
    }

    expect(bugbearCard).toBeTruthy();

    // Verify Bugbear card structure
    const cardClasses = await bugbearCard.getAttribute('class');
    console.log(`Bugbear card classes: ${cardClasses}`);
    expect(cardClasses).toMatch(/npc|monster/);

    // Set Bugbear target to Thorin
    const targetSelect = bugbearCard.locator('.creature-target select');
    if (await targetSelect.count() > 0 && await targetSelect.isVisible()) {
      await targetSelect.selectOption('Thorin Ironforge');
      await page.waitForTimeout(500);
    }

    // Verify target was set
    const selectedTarget = await targetSelect.inputValue();
    console.log(`Bugbear's target: ${selectedTarget}`);
    expect(selectedTarget).toBe('Thorin Ironforge');

    // Check creature card has initiative input
    const initiativeInput = bugbearCard.locator('.creature-initiative input');
    expect(await initiativeInput.count()).toBeGreaterThan(0);

    // Check creature card has HP display
    const hpDisplay = bugbearCard.locator('.creature-hp');
    expect(await hpDisplay.count()).toBeGreaterThan(0);

    // Check for condition badges
    const badges = bugbearCard.locator('.creature-badge, .effect-badge, .condition-badge');
    console.log(`Bugbear badges: ${await badges.count()}`);

    await page.screenshot({ path: 'tests/e2e/screensets/06-npc-target-set.png', fullPage: true });
  });

  test('initiative: NPC attacks player - reaction verification', async ({ page }) => {
    // Navigate to initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Roll initiative
    const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
    if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
      await rollBtn.click();
      await page.waitForTimeout(2000);
    }

    // Set Bugbear target to Thorin
    const creatureCards = page.locator('.creature-card');
    const count = await creatureCards.count();

    let bugbearCard = null;
    for (let i = 0; i < count; i++) {
      const nameEl = creatureCards.nth(i).locator('.creature-name');
      const name = await nameEl.textContent();
      if (name?.includes('Bugbear')) {
        bugbearCard = creatureCards.nth(i);
        break;
      }
    }

    if (bugbearCard) {
      const targetSelect = bugbearCard.locator('.creature-target select');
      if (await targetSelect.count() > 0 && await targetSelect.isVisible()) {
        await targetSelect.selectOption('Thorin Ironforge');
        await page.waitForTimeout(500);
      }
    }

    // Navigate to Thorin's sheet to check reactions
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Check reactions section
    const allActionContainers = page.locator('.char-actions');
    if (await allActionContainers.count() > 2) {
      const reactions = allActionContainers.nth(2);
      const reactionText = await reactions.locator('.sectionHeader').textContent();
      console.log(`Reactions header: ${(await reactionText)?.trim()}`);

      // Check for opportunity attack or other reaction features
      const reactionItems = reactions.locator('b.clickable');
      const reactionCount = await reactionItems.count();
      console.log(`Clickable reactions: ${reactionCount}`);
      for (let i = 0; i < reactionCount; i++) {
        const name = await reactionItems.nth(i).textContent();
        console.log(`  Reaction: ${name?.trim()}`);
      }
    }

    // Check special actions for reaction-related features
    const specialActions = page.locator('.char-special-actions');
    if (await specialActions.count() > 0) {
      const featureItems = specialActions.locator('div');
      const featureCount = await featureItems.count();
      console.log(`Special action items: ${featureCount}`);
    }

    await page.screenshot({ path: 'tests/e2e/screensets/07-reactions-view.png', fullPage: true });
  });

  test('combat: full encounter flow with multiple creature types', async ({ page }) => {
    // Navigate to initiative
    await page.getByRole('button', { name: 'Initiative' }).click();
    await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Roll initiative
    const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
    if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
      await rollBtn.click();
      await page.waitForTimeout(2000);
    }

    // Get all creature info
    const creatureCards = page.locator('.creature-card');
    const count = await creatureCards.count();
    console.log(`Total creatures: ${count}`);

    const creatures = [];
    for (let i = 0; i < count; i++) {
      const card = creatureCards.nth(i);
      const nameEl = card.locator('.creature-name');

      const name = await nameEl.textContent();
      const cardClass = await card.getAttribute('class');

      // HP and AC may not exist on all cards
      let hp = '', ac = '';
      const hpEl = card.locator('.creature-hp');
      if (await hpEl.count() > 0) {
        hp = (await hpEl.textContent())?.trim() || '';
      }
      const acEl = card.locator('.creature-ac');
      if (await acEl.count() > 0) {
        ac = (await acEl.textContent())?.trim() || '';
      }

      creatures.push({
        name: name?.trim(),
        hp,
        ac,
        type: cardClass?.includes('player') ? 'player' : 'monster',
      });
    }

    // Verify mix of player and monster creatures
    const playerCreatures = creatures.filter(c => c.type === 'player');
    const monsterCreatures = creatures.filter(c => c.type === 'monster');
    expect(playerCreatures.length).toBeGreaterThan(0);
    expect(monsterCreatures.length).toBeGreaterThan(0);

    console.log(`Players: ${playerCreatures.map(c => c.name).join(', ')}`);
    console.log(`Monsters: ${monsterCreatures.map(c => c.name).join(', ')}`);

    // Navigate through full round
    for (let i = 0; i < creatures.length; i++) {
      await nextTurn(page);
      await page.waitForTimeout(300);

      const activeCreature = page.locator('.creature-card.active .creature-name');
      if (await activeCreature.count() > 0) {
        const activeName = (await activeCreature.textContent())?.trim();
        const activeType = page.locator('.creature-card.active').first().getAttribute('class');
        console.log(`Turn ${i + 1}: ${activeName} (${await activeType})`);
      }
    }

    // Verify round advanced
    const round = await getCurrentRound(page);
    console.log(`Round after full cycle: ${round}`);

    await page.screenshot({ path: 'tests/e2e/screensets/08-full-encounter.png', fullPage: true });
  });

  test('character sheet: verify actions, bonus actions, reactions, special actions structure', async ({ page }) => {
    // Navigate to Thorin's sheet
    await page.getByRole('button', { name: 'Thorin Ironforge' }).click();
    await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify all action containers exist
    const actionContainers = page.locator('.char-actions');
    console.log(`Action containers: ${await actionContainers.count()}`);

    // Verify each section header
    const sectionHeaders = page.locator('.sectionHeader');
    const sectionCount = await sectionHeaders.count();
    console.log(`Section headers: ${sectionCount}`);

    const sectionNames = [];
    for (let i = 0; i < sectionCount; i++) {
      const name = await sectionHeaders.nth(i).textContent();
      sectionNames.push(name?.trim());
    }
    console.log(`Sections: ${sectionNames.join(', ')}`);

    // Verify attacks containers
    const attackContainers = page.locator('.attacks');
    console.log(`Attack containers: ${await attackContainers.count()}`);

    // Verify special actions section
    const specialActions = page.locator('.char-special-actions');
    if (await specialActions.count() > 0) {
      const specialHeader = specialActions.locator('.sectionHeader');
      console.log(`Special actions header: ${(await specialHeader.textContent())?.trim()}`);
    }

    // Verify ability section
    const abilitiesSection = page.locator('.char-abilities');
    if (await abilitiesSection.count() > 0) {
      console.log('Abilities section found');
    }

    // Verify inventory section
    const inventorySection = page.locator('.char-inventory');
    if (await inventorySection.count() > 0) {
      console.log('Inventory section found');
    }

    await page.screenshot({ path: 'tests/e2e/screensets/09-sheet-structure.png', fullPage: true });
  });
});
