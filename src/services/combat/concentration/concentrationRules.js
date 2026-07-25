import { rollD20 } from '../../dice/diceRoller.js'

function rollConcentrationSave(saveBonus, dc, dragonConstellationActive, disadvantage = false) {
  let roll = rollD20()
  let rawRolls = [roll]
  if (disadvantage) {
    const roll2 = rollD20()
    rawRolls.push(roll2)
    roll = Math.min(roll, roll2)
  }
  if (dragonConstellationActive && roll <= 9) {
    roll = 10
  }
  const total = roll + saveBonus
  const success = total >= dc
  return { success, roll, total, rawRolls }
}

function breakConcentration() {
  return null
}

function computeConcentrationDc(damageTaken) {
  return Math.max(10, Math.floor(damageTaken / 2))
}

export { rollConcentrationSave, breakConcentration, computeConcentrationDc }
