export function getHitDieSize(playerStats) {
  const hitDieStr = playerStats?.class?.hit_point_die || playerStats?.class?.hit_die;

  if (hitDieStr != null) {
    const die = parseInt(String(hitDieStr).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(die)) return die;
   }

  return 8;
}

export function computeHitDieRecovery(rollValue, conBonus) {
  return Math.max(1, rollValue + conBonus)
}

export function computeShortRestHpNewCurrent(currentHp, maxHp, recoveredAmount) {
  const base = currentHp != null && currentHp !== '' ? Number(currentHp) : maxHp
  return Math.min(maxHp, base + (recoveredAmount || 0))
}
