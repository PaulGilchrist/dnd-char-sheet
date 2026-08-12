/**
 * Skill validation service for character creation wizard
 * Provides non-blocking warnings about skill proficiency selections
 * Supports both 5e and 2024 rulesets
 */

export { getSkillLimits } from './limits.js';
export { getPreSelectedSkills } from './pre-selected.js';
export { getExpertiseLimits } from './expertise.js';
export { validateSkills } from './validation.js';
export { getSkillInfo } from './validation.js';

// Internal exports for cross-module usage
export { parseSkillProficiencies } from './parse-skills.js';
export { computeSkilledSkillUsage, computeTotalSkilledUsage, computeSkilledToolUsageOnly } from './skilled-pool.js';
export { findAllSkillProfFeats, countFeatProficiencyChoices, countFeatExpertiseSlots, getFeatExpertiseSkillLists, countSkilledUses, countSkillExpertProficiencyChoices, featGrantsAllSkillProficiencies, featGrantsExpertise } from './feat-helpers.js';
export { getRaceProficiencyChoiceSources, getRaceFeatProficiencyChoiceSources, getFeatProficiencyChoiceData } from './race-sources.js';
