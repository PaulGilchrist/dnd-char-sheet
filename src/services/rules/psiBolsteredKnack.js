import { ALL_SKILL_NAMES } from '../character/skillValidation/constants.js'

export const ABILITY_NAMES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

export function isProficientSkillOrToolCheck(playerStats, checkName) {
  if (!checkName) return false
  if (ALL_SKILL_NAMES.includes(checkName)) {
    return (playerStats?.skillProficiencies || []).includes(checkName) || (playerStats?.expertise || []).includes(checkName)
  }
  if (ABILITY_NAMES.includes(checkName)) return false
  return (playerStats?.toolProficiencies || []).includes(checkName)
}
