/**
 * Skill validation service for character creation wizard
 * Provides non-blocking warnings about skill proficiency selections
 * Supports both 5e and 2024 rulesets
 *
 * Refactored into focused modules in ./skillValidation/
 */

export {
  getSkillLimits,
  getPreSelectedSkills,
  getExpertiseLimits,
  validateSkills,
  getSkillInfo,
} from './skillValidation/index.js';
