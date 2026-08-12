import { fetchClassData, fetchRaceData, fetchBackgroundData } from '../../ui/dataLoader.js';
import { findAllSkillProfFeats } from './feat-helpers.js';
import { parseSkillProficiencies } from './parse-skills.js';
import { ALL_SKILL_NAMES } from './constants.js';

/**
 * Determines which skills are pre-selected (automatically granted) from race/class/background
 * @param {object} formData - The character form data
 * @param {Array} allFeats - Array of all feat data objects (may be empty during initial load)
 * @returns {Promise<string[]>} - Array of skill names that are automatically granted
 */
export async function getPreSelectedSkills(formData, allFeats) {
  const ruleset = formData.rules || '5e';
  const preSelected = new Set();

  const allSkillProfFeats = await findAllSkillProfFeats(formData, allFeats);
  if (allSkillProfFeats.length > 0) {
    return ALL_SKILL_NAMES;
  }

  // Race skills (automatic, not choices)
  if (formData.race?.name) {
    const raceData = await fetchRaceData(formData.race.name, ruleset);
    const raceSkills = parseSkillProficiencies(raceData, ruleset);
    if (!raceSkills.isChoice) {
      raceSkills.skills.forEach(skill => preSelected.add(skill));
    }
  }

  // Background skills (automatic, not choices)
  if (formData.background) {
    if (ruleset === '2024') {
      const backgroundData = await fetchBackgroundData(formData.background, '2024');
      const bgSkills = parseSkillProficiencies(backgroundData, '2024');
      if (!bgSkills.isChoice) {
        bgSkills.skills.forEach(skill => preSelected.add(skill));
      }
    }
    // 5e backgrounds typically let you choose, so no pre-selection
  }

  // Class skills that are automatic (not choices)
  if (formData.class?.name) {
    const classData = await fetchClassData(formData.class.name, ruleset);
    const classSkills = parseSkillProficiencies(classData, ruleset);
    if (!classSkills.isChoice) {
      classSkills.skills.forEach(skill => preSelected.add(skill));
    }
  }

  return Array.from(preSelected);
}
