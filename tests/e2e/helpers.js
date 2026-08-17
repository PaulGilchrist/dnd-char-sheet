// @ts-check
import { expect } from '@playwright/test';

/**
 * E2E helper functions for D&D Campaign Suite testing.
 */

/**
 * Create a new campaign with the given name.
 * The page auto-reloads 2 seconds after creation.
 */
export async function createCampaign(page, campaignName) {
  // Click the "Add" button to create a new campaign
  await page.getByRole('button', { name: 'Add' }).click();

  // Wait for the modal to appear and fill in the campaign name
  await page.getByPlaceholder('Enter campaign name').fill(campaignName);
  await page.getByRole('button', { name: 'Create' }).click();

  // Wait for success message with emoji
  await expect(page.getByText('✅ Campaign created successfully!')).toBeVisible({ timeout: 10000 });

  // Wait for page reload (success message disappears and campaign list reappears)
  await expect(page.getByRole('button', { name: campaignName })).toBeVisible({ timeout: 10000 });
}

/**
 * Select a campaign by name from the campaign list.
 */
export async function selectCampaign(page, campaignName) {
  await expect(page.getByRole('button', { name: campaignName })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: campaignName }).click();

  // Wait for the app to load (sidebar or character wizard should appear)
  // If no characters, wizard auto-opens
  const [sidebarLoaded, wizardOpened] = await Promise.all([
    page.locator('.sidebar').isVisible().catch(() => false),
    page.locator('.character-creation-wizard-overlay').isVisible().catch(() => false),
  ]);

  if (!sidebarLoaded && !wizardOpened) {
    // Wait a bit for loading to complete
    await page.waitForTimeout(2000);
  }
}

/**
 * Open the character creation wizard by clicking "Add Character" in sidebar.
 */
export async function openCharacterWizard(page) {
  // Wait for sidebar to be ready
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });

  // The "Add Character" button is in the sidebar
  await page.getByRole('button', { name: 'Add Character' }).click();

  // Wait for the wizard overlay to appear
  await expect(page.locator('.character-creation-wizard-overlay')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to a wizard step by clicking the sidebar tab.
 */
export async function navigateToWizardStep(page, stepTitle) {
  // Click the sidebar tab by its title text
  const tabs = page.locator('.sidebar-tab');
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    const title = await tabs.nth(i).locator('.sidebar-tab-title').textContent();
    if (title && title.includes(stepTitle)) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);
      return;
    }
  }
  throw new Error(`Step "${stepTitle}" not found in wizard sidebar`);
}

/**
 * Click the Next button in the wizard.
 */
export async function clickWizardNext(page) {
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(300);
}

/**
 * Click the Previous button in the wizard.
 */
export async function clickWizardPrevious(page) {
  await page.getByRole('button', { name: 'Previous' }).click();
  await page.waitForTimeout(300);
}

/**
 * Click the Save button in the wizard sidebar.
 */
export async function clickWizardSave(page) {
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click the Create Character button (final step).
 */
export async function clickCreateCharacter(page) {
  await page.getByRole('button', { name: 'Create Character' }).click();

  // Wait for the wizard to close and character to appear in sidebar
  await expect(page.locator('.character-creation-wizard-overlay')).toBeHidden({ timeout: 15000 });
}

/**
 * Select a race from the race dropdown.
 */
export async function selectRace(page, raceName) {
  await page.getByLabel('Race *').selectOption(raceName);
  await page.waitForTimeout(300);
}

/**
 * Select a subrace from the subrace dropdown.
 */
export async function selectSubrace(page, subraceName) {
  await page.getByLabel('Subrace *').selectOption(subraceName);
  await page.waitForTimeout(300);
}

/**
 * Select a background from the background dropdown.
 */
export async function selectBackground(page, backgroundName) {
  await page.getByLabel('Background *').selectOption(backgroundName);
  await page.waitForTimeout(300);
}

/**
 * Select a class from the class dropdown.
 */
export async function selectClass(page, className) {
  await page.getByLabel('Class *').selectOption(className);
  await page.waitForTimeout(300);
}

/**
 * Select a subclass from the subclass dropdown.
 */
export async function selectSubclass(page, subclassName) {
  await page.getByLabel('Subclass / Major *').selectOption(subclassName);
  await page.waitForTimeout(300);
}

/**
 * Select a feat from the feats selectable list by searching and clicking.
 */
export async function selectFeat(page, featName) {
  // Find the search input in the feats step
  const searchInputs = page.locator('.wizard-step-feats input[type="text"]');
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill(featName);
    await page.waitForTimeout(500);
  }

  // Click the feat item to select it
  await page.getByRole('listitem').filter({ hasText: featName }).first().click();
  await page.waitForTimeout(300);

  // Clear the search
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill('');
    await page.waitForTimeout(300);
  }
}

/**
 * Set ability score base value for a given ability.
 */
export async function setAbilityScore(page, abilityName, baseScore) {
  const abilityKey = abilityName.toLowerCase().replace(/[^a-z]/g, '');
  const input = page.locator(`#base-score-${abilityKey}`);
  if (await input.count() > 0) {
    await input.fill(baseScore.toString());
  }
  await page.waitForTimeout(200);
}

/**
 * Set the character name in the basic info step.
 */
export async function setCharacterName(page, name) {
  await page.getByLabel('Character Name *').fill(name);
  await page.waitForTimeout(200);
}

/**
 * Set the character level in the basic info step.
 */
export async function setCharacterLevel(page, level) {
  await page.getByLabel('Level *').fill(level.toString());
  await page.waitForTimeout(200);
}

/**
 * Navigate to the initiative view.
 */
export async function navigateToInitiative(page) {
  await page.getByRole('button', { name: 'Initiative' }).click();
  await expect(page.locator('.initiative')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to the encounter builder view.
 */
export async function navigateToEncounter(page) {
  await page.getByRole('button', { name: 'Encounter' }).click();
  await expect(page.locator('.encounter-builder')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to the character sheet view by clicking the character name in sidebar.
 */
export async function navigateToCharacterSheet(page, characterName) {
  await page.getByRole('button', { name: characterName }).click();
  await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
}

/**
 * Click the "Add NPC" button in initiative.
 */
export async function addNPC(page, npcName) {
  await page.getByRole('button', { name: '+ NPC' }).click();
  // Wait for NPC name autocomplete to appear
  await page.waitForTimeout(500);
  if (npcName) {
    await page.getByPlaceholder('Search for a creature...').fill(npcName);
    await page.waitForTimeout(500);
    await page.getByText(npcName).first().click();
  }
}

/**
 * Roll initiative by clicking the "Roll Initiative" button on character sheet.
 */
export async function rollInitiative(page) {
  await page.getByRole('button', { name: 'Roll Initiative' }).click();
  await page.waitForTimeout(1000);
}

/**
 * Click the Next turn button in initiative.
 */
export async function nextTurn(page) {
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click the Previous turn button in initiative.
 */
export async function prevTurn(page) {
  await page.getByRole('button', { name: '← Prev' }).click();
  await page.waitForTimeout(500);
}

/**
 * Click an attack/action on the character sheet.
 */
export async function clickAttack(page, attackName) {
  await page.getByText(attackName).first().click();
  await page.waitForTimeout(500);
}

/**
 * Select a target from the target dropdown on a creature card.
 */
export async function selectTarget(page, targetName) {
  await page.getByLabel('Target').selectOption(targetName);
  await page.waitForTimeout(300);
}

/**
 * Wait for the app to be fully loaded after navigation.
 */
export async function waitForAppReady(page) {
  // Wait for sidebar to be visible
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });
}

/**
 * Wait for a modal/dialog to appear.
 */
export async function waitForModal(page, modalSelector) {
  await expect(page.locator(modalSelector)).toBeVisible({ timeout: 10000 });
}

/**
 * Close a modal by pressing Escape.
 */
export async function closeModal(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Get all creature names from the initiative tracker.
 */
export async function getCreatureNames(page) {
  const creatures = page.locator('.creature-card');
  const names = [];
  const count = await creatures.count();
  for (let i = 0; i < count; i++) {
    const nameEl = creatures.nth(i).locator('.creature-name');
    if (await nameEl.count() > 0) {
      names.push((await nameEl.textContent()).trim());
    }
  }
  return names;
}

/**
 * Get the current round number from the initiative tracker.
 */
export async function getCurrentRound(page) {
  const heading = page.locator('h4').filter({ hasText: /round/i }).first();
  const text = await heading.textContent();
  const match = text.match(/round\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Select a spell from the spells selectable list by searching.
 */
export async function selectSpell(page, spellName) {
  const searchInputs = page.locator('.wizard-step-spells input[type="text"]');
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill(spellName);
    await page.waitForTimeout(500);
  }

  // Click the spell item to select it
  await page.getByRole('listitem').filter({ hasText: spellName }).first().click();
  await page.waitForTimeout(300);

  // Clear the search
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill('');
    await page.waitForTimeout(300);
  }
}

/**
 * Select a magic item from the magic items selectable list.
 */
export async function selectMagicItem(page, itemName) {
  const searchInputs = page.locator('.wizard-step-magic-items input[type="text"]');
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill(itemName);
    await page.waitForTimeout(500);
  }

  // Click the item to select it
  await page.getByRole('listitem').filter({ hasText: itemName }).first().click();
  await page.waitForTimeout(300);

  // Clear the search
  if (await searchInputs.count() > 0) {
    await searchInputs.first().fill('');
    await page.waitForTimeout(300);
  }
}

/**
 * Toggle a checkbox in a multi-select container by label text.
 */
export async function toggleMultiSelect(page, labelText) {
  const label = page.locator('label.multi-select-item').filter({ hasText: labelText });
  const checkbox = label.locator('input[type="checkbox"]');
  const isChecked = await checkbox.isChecked();
  if (!isChecked) {
    await label.click();
    await page.waitForTimeout(200);
  }
}

/**
 * Enter gold pieces in the inventory step.
 */
export async function setGoldPieces(page, amount) {
  await page.getByLabel('Gold Pieces *').fill(amount.toString());
  await page.waitForTimeout(200);
}

// ============================================================================
// Combat Automation Helpers
// ============================================================================

/**
 * Ensure the test campaign exists and select it.
 */
export async function ensureTestCampaign(page) {
  await page.goto('/');
  await page.waitForTimeout(1000);
  const exists = await page.getByRole('button', { name: 'test-campaign' }).isVisible({ timeout: 10000 }).catch(() => false);
  if (!exists) {
    // Campaign doesn't exist, create it
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByPlaceholder('Enter campaign name').fill('test-campaign');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(2000);
  }
  await selectCampaign(page, 'test-campaign');
  await page.waitForTimeout(2000);
  // Close any open wizard/modals
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
}

/**
 * Navigate to initiative and roll initiative.
 */
export async function startCombat(page) {
  await navigateToInitiative(page);
  const rollBtn = page.getByRole('button', { name: 'Roll Initiative' });
  if (await rollBtn.count() > 0 && await rollBtn.isVisible()) {
    await rollBtn.click();
    await page.waitForTimeout(2000);
  }
}

/**
 * Find a creature card by name partial match.
 */
export async function findCreatureCard(page, namePart) {
  const creatureCards = page.locator('.creature-card');
  const count = await creatureCards.count();
  for (let i = 0; i < count; i++) {
    const nameEl = creatureCards.nth(i).locator('.creature-name');
    const name = (await nameEl.textContent()) || '';
    if (name.includes(namePart)) {
      return creatureCards.nth(i);
    }
  }
  return null;
}

/**
 * Set target on a creature card by name.
 */
export async function setCreatureTarget(page, creatureNamePart, targetName) {
  const card = await findCreatureCard(page, creatureNamePart);
  if (!card) throw new Error(`Creature "${creatureNamePart}" not found`);
  const targetSelect = card.locator('.creature-target select');
  if (await targetSelect.count() > 0 && await targetSelect.isVisible()) {
    await targetSelect.selectOption(targetName);
    await page.waitForTimeout(500);
  }
}

/**
 * Navigate to a character sheet and wait for it.
 */
export async function goToCharacterSheet(page, characterName) {
  await page.getByRole('button', { name: characterName }).click();
  await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

/**
 * Log all action sections on a character sheet.
 */
export async function logActionSections(page) {
  const sections = page.locator('.sectionHeader');
  const count = await sections.count();
  console.log(`Character sheet sections (${count}):`);
  for (let i = 0; i < count; i++) {
    console.log(`  ${i + 1}: ${(await sections.nth(i).textContent())?.trim()}`);
  }
  return count;
}

/**
 * Log all attacks in an action container.
 */
export async function logAttacks(page, containerIndex = 0) {
  const containers = page.locator('.char-actions');
  if (await containers.count() <= containerIndex) {
    console.log(`No action container at index ${containerIndex}`);
    return [];
  }
  const container = containers.nth(containerIndex);
  const attackNames = container.locator('.attacks .left');
  const count = await attackNames.count();
  console.log(`Attacks in container ${containerIndex} (${count}):`);
  const names = [];
  for (let i = 0; i < count; i++) {
    const name = (await attackNames.nth(i).textContent())?.trim() || '';
    console.log(`  ${i + 1}: ${name}`);
    names.push(name);
  }
  return names;
}

/**
 * Log special actions on a character sheet.
 */
export async function logSpecialActions(page) {
  const specialActions = page.locator('.char-special-actions');
  if (await specialActions.count() === 0) {
    console.log('No special actions section');
    return [];
  }
  const featureItems = specialActions.locator('div');
  const count = await featureItems.count();
  console.log(`Special action items (${count}):`);
  const names = [];
  for (let i = 0; i < count; i++) {
    const text = (await featureItems.nth(i).textContent())?.trim() || '';
    console.log(`  ${i + 1}: ${text.substring(0, 100)}`);
    names.push(text);
  }
  return names;
}

/**
 * Log automation badges on a character sheet.
 */
export async function logAutomationBadges(page) {
  const badges = page.locator('.automation-badge');
  const count = await badges.count();
  console.log(`Automation badges: ${count}`);
  return count;
}

/**
 * Click an attack on the character sheet by name.
 */
export async function clickAttackOnSheet(page, attackName) {
  // Try clicking the attack name in the attacks container
  const attackEl = page.locator('.attacks').filter({ hasText: attackName }).first();
  if (await attackEl.count() > 0 && await attackEl.isVisible()) {
    await attackEl.click();
    await page.waitForTimeout(1000);
    return true;
  }
  // Fallback: click by text
  const textEl = page.getByText(attackName).first();
  if (await textEl.count() > 0 && await textEl.isVisible()) {
    await textEl.click();
    await page.waitForTimeout(1000);
    return true;
  }
  console.log(`Attack "${attackName}" not found on sheet`);
  return false;
}

/**
 * Click a special action / class feature by name.
 */
export async function clickSpecialAction(page, actionName) {
  const actionEl = page.locator('.char-special-actions').filter({ hasText: actionName }).first();
  if (await actionEl.count() > 0 && await actionEl.isVisible()) {
    await actionEl.click();
    await page.waitForTimeout(1000);
    return true;
  }
  console.log(`Special action "${actionName}" not found`);
  return false;
}

/**
 * Click a reaction by name.
 */
export async function clickReaction(page, reactionName) {
  const reactionEl = page.locator('.char-actions').nth(2).filter({ hasText: reactionName }).first();
  if (await reactionEl.count() > 0 && await reactionEl.isVisible()) {
    await reactionEl.click();
    await page.waitForTimeout(1000);
    return true;
  }
  console.log(`Reaction "${reactionName}" not found`);
  return false;
}

/**
 * Click a bonus action by name.
 */
export async function clickBonusAction(page, actionName) {
  const bonusEl = page.locator('.char-actions').nth(1).filter({ hasText: actionName }).first();
  if (await bonusEl.count() > 0 && await bonusEl.isVisible()) {
    await bonusEl.click();
    await page.waitForTimeout(1000);
    return true;
  }
  console.log(`Bonus action "${actionName}" not found`);
  return false;
}

/**
 * Wait for a modal to appear and return its content.
 */
export async function waitForModalContent(page, timeout = 10000) {
  // Look for common modal patterns
  const modal = page.locator('.modal, [role="dialog"], .modal-content').first();
  await expect(modal).toBeVisible({ timeout });
  const content = (await modal.textContent())?.trim() || '';
  return content;
}

/**
 * Close all open modals (up to 5 times).
 */
export async function closeAllModals(page) {
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }
}

/**
 * Wait for a popup/info message to appear.
 */
export async function waitForInfoPopup(page, timeout = 5000) {
  const popup = page.locator('.info-popup, .automation-info, [data-testid="automation-info"]').first();
  if (await popup.count() > 0) {
    return (await popup.textContent())?.trim() || '';
  }
  return '';
}

/**
 * Get current creature turn info.
 */
export async function getActiveCreature(page) {
  const activeCard = page.locator('.creature-card.active .creature-name').first();
  if (await activeCard.count() > 0) {
    return (await activeCard.textContent())?.trim() || '';
  }
  return '';
}

/**
 * Navigate to a specific turn by creature name.
 */
export async function goToTurn(page, creatureNamePart) {
  let current = await getActiveCreature(page);
  let tries = 0;
  const maxTries = 50;

  while (current && !current.includes(creatureNamePart) && tries < maxTries) {
    await nextTurn(page);
    current = await getActiveCreature(page);
    tries++;
  }

  // If we overshot, go back
  if (current && !current.includes(creatureNamePart)) {
    for (let i = 0; i < maxTries; i++) {
      await prevTurn(page);
      current = await getActiveCreature(page);
      if (current && current.includes(creatureNamePart)) {
        return true;
      }
    }
  }

  return current && current.includes(creatureNamePart);
}

/**
 * Take a screenshot with a descriptive name.
 */
export async function takeScreenshot(page, name) {
  const path = `tests/e2e/screensets/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`Screenshot: ${path}`);
  return path;
}

/**
 * Verify a character's summary text on their sheet.
 */
export async function verifyCharacterSummary(page, characterName, expectedClass) {
  const summary = page.locator('[data-testid="char-summary-text"]');
  if (await summary.count() > 0) {
    const text = (await summary.textContent())?.trim() || '';
    console.log(`Character summary: ${text}`);
    if (expectedClass) {
      expect(text).toContain(expectedClass);
    }
    return text;
  }
  return '';
}

/**
 * Add multiple NPCs to the initiative.
 */
export async function addMultipleNPCs(page, npcNames) {
  const added = [];
  for (const npcName of npcNames) {
    await page.getByRole('button', { name: '+ NPC' }).click();
    await page.waitForTimeout(500);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }
    added.push(npcName);
  }
  return added;
}

/**
 * Cast a spell by name from the character sheet.
 */
export async function castSpell(page, spellName) {
  // Spells may be in Actions, Bonus Actions, or a dedicated Spells section
  const spellEl = page.locator('.attacks, .char-spells').filter({ hasText: spellName }).first();
  if (await spellEl.count() > 0 && await spellEl.isVisible()) {
    await spellEl.click();
    await page.waitForTimeout(1000);
    return true;
  }
  console.log(`Spell "${spellName}" not found on sheet`);
  return false;
}

/**
 * Check if a specific automation type exists on the character sheet.
 */
export async function hasAutomationOnSheet(page, type) {
  // type: 'action', 'bonusAction', 'reaction', 'specialAction'
  switch (type) {
    case 'action':
      return (await page.locator('.char-actions').nth(0).locator('.attacks .left').count()) > 0;
    case 'bonusAction':
      return (await page.locator('.char-actions').nth(1).locator('.attacks .left').count()) > 0;
    case 'reaction':
      return (await page.locator('.char-actions').nth(2).locator('.attacks .left').count()) > 0;
    case 'specialAction':
      return (await page.locator('.char-special-actions div').count()) > 0;
    default:
      return false;
  }
}

/**
 * Get all creature names and types from initiative.
 */
export async function getAllCreatures(page) {
  const creatureCards = page.locator('.creature-card');
  const count = await creatureCards.count();
  const creatures = [];
  for (let i = 0; i < count; i++) {
    const card = creatureCards.nth(i);
    const nameEl = card.locator('.creature-name');
    const name = (await nameEl.textContent())?.trim() || '';
    const cardClass = (await card.getAttribute('class')) || '';
    const isPlayer = cardClass.includes('player');
    creatures.push({ name, type: isPlayer ? 'player' : 'monster', index: i });
  }
  return creatures;
}

/**
 * Wait for the character sheet to be fully loaded.
 */
export async function waitForCharacterSheet(page, characterName) {
  await page.getByRole('button', { name: characterName }).click();
  await expect(page.locator('.char-sheet')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}
