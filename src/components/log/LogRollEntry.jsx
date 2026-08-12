import { formatTimestamp, getRollIconType } from './log-utils.js';

export function RollEntry({ entry }) {
  const isDamage = entry.rollType === 'damage';
  const isSave = entry.rollType === 'save';
  const isSaveDamage = entry.rollType === 'save-damage';
  const isAoeDamage = entry.rollType === 'aoe-damage';
  const isOverchannelDamage = entry.rollType === 'overchannel-damage';
  const isGrazeDamage = entry.rollType === 'graze-damage';
  const hasSecondary = entry.secondaryFormula != null;
  const showBothDice = !isDamage && !isSaveDamage && !isAoeDamage && entry.rolls?.length === 2 && entry.mode && entry.mode !== 'normal';

  return (
    <div className={`log-entry log-roll${entry.isNatural20 ? ' log-nat20' : ''}${entry.isNatural1 ? ' log-nat1' : ''}`}>
      <div className="log-entry-header">
        <span className="log-icon"><i className={`fas ${getRollIconType(entry.rollType)}`}></i></span>
        <span className="log-character">{entry.characterName}</span>
        <span className="log-name">{entry.name}</span>
        <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="log-roll-details">
        {entry.targetName && !isSaveDamage && !isAoeDamage && (
          <span className="log-target">→ {entry.targetName}</span>
        )}
        {entry.targetName && isSaveDamage && (
          <span className="log-target">{entry.targetName}</span>
        )}
        {entry.hit !== undefined && entry.rollType === 'attack' && (
          <span className={`log-hit-miss ${entry.hit ? 'log-hit' : 'log-miss'}`}>
            {entry.isAutoMiss ? 'AUTO-MISS' : (entry.hit ? 'HIT' : 'MISS')} {entry.targetAc != null ? `(AC ${entry.targetAc})` : ''}
          </span>
        )}
        {entry.rollType === 'attack' && entry.isCrit && !entry.isNatural1 && (
          <span className="log-critical-hit">Critical Hit!</span>
        )}
        {entry.rollType === 'attack' && entry.isNatural1 && (
          <span className="log-critical-miss">Critical Miss!</span>
        )}
        {entry.coverAcBonus > 0 && (
          <span className="log-cover">
            {entry.coverLevel === 'threeQuarter' ? '3/4' : '1/2'} Cover (+{entry.coverAcBonus} AC)
          </span>
        )}
        {entry.coverReason && (
          <span className="log-range-reason">{entry.coverReason}</span>
        )}
        {entry.rangeReason && (
          <span className="log-range-reason">{entry.rangeReason}</span>
        )}
        {showBothDice && (
          <span className={`log-mode-badge ${entry.mode || 'normal'}`}>
            {(entry.mode || 'normal').toUpperCase()}
          </span>
        )}
        {entry.isNatural20 && <span className="log-nat-badge log-nat20">NAT 20</span>}
        {entry.isNatural1 && <span className="log-nat-badge log-nat1">FUMBLE</span>}
        {entry.damageType && (isDamage || isSaveDamage || isAoeDamage || isOverchannelDamage || isGrazeDamage) && (
          <span className="log-damage-type">{entry.damageType}</span>
        )}
        {(isSave || isSaveDamage || isAoeDamage) && entry.saveType && entry.saveDc && (
          <span className="log-save-info">
            {entry.saveType.toUpperCase()} save DC {entry.saveDc}&nbsp;
            {entry.mode === 'disadvantage' && (
              <span className="log-mode-badge disadvantage">DISADVANTAGE</span>
            )}
          </span>
        )}
        {(isSave || isSaveDamage) && entry.saveResult && (
          <span className={`log-save-result ${entry.saveResult === 'success' ? 'log-condition-success' : 'log-condition-failure'}`}>
            {entry.saveResult === 'success' ? 'SAVE SUCCESS' : 'SAVE FAILURE'}
            {entry.saveRoll != null && ` (d20 ${entry.saveRoll}${entry.saveBonus != null ? `+${entry.saveBonus}` : ''})`}
          </span>
        )}
        {isSaveDamage && !entry.saveResult && entry.saveSuccess != null && (
          <span className={`log-save-result ${entry.saveSuccess ? 'log-condition-success' : 'log-condition-failure'}`}>
            {entry.saveSuccess ? 'SAVE SUCCESS' : 'SAVE FAILURE'}
          </span>
        )}
        {isSave && entry.targetName && entry.attackerName && (
          <span className="log-target">{entry.targetName} vs {entry.attackerName}</span>
        )}
        {isSaveDamage && entry.targetName && (
          <span className="log-target">vs {entry.targetName}</span>
        )}
        <div className="log-dice-values">
          {!isDamage && !isSaveDamage && !isAoeDamage && entry.rolls?.length === 2 && (
            showBothDice ? (
              <>
                {entry.mode === 'advantage' ? (
                  <>
                    <span className={`log-die${entry.rolls[0] >= entry.rolls[1] ? ' log-die-selected' : ''}`}>({entry.rolls[0]} {entry.rolls[0] >= entry.rolls[1] ? 'selected' : 'discarded'})</span>
                    <span className={`log-die${entry.rolls[1] > entry.rolls[0] ? ' log-die-selected' : ''}`}>({entry.rolls[1]} {entry.rolls[1] > entry.rolls[0] ? 'selected' : 'discarded'})</span>
                  </>
                ) : entry.mode === 'disadvantage' ? (
                  <>
                    <span className={`log-die${entry.rolls[0] <= entry.rolls[1] ? ' log-die-selected' : ''}`}>({entry.rolls[0]} {entry.rolls[0] <= entry.rolls[1] ? 'selected' : 'discarded'})</span>
                    <span className={`log-die${entry.rolls[1] < entry.rolls[0] ? ' log-die-selected' : ''}`}>({entry.rolls[1]} {entry.rolls[1] < entry.rolls[0] ? 'selected' : 'discarded'})</span>
                  </>
                ) : (
                  <span className="log-die log-die-selected">({entry.total})</span>
                )}
              </>
            ) : (
              <span className="log-die log-die-selected">({entry.total})</span>
            )
          )}
          {(isDamage || isSaveDamage || isAoeDamage || isOverchannelDamage || isGrazeDamage) && entry.formula && (
            <span className="log-dice-formula">{entry.formula}</span>
          )}
          {!isSave && (isDamage || isSaveDamage || isAoeDamage || isOverchannelDamage || isGrazeDamage) && entry.rolls && entry.rolls.length > 0 && (
            <span className="log-dice-values-inline">
              ({entry.rolls.join(', ')})
            </span>
          )}
          <span className="log-total"><b>{entry.total}{(isDamage || isSaveDamage || isAoeDamage || isOverchannelDamage || isGrazeDamage) ? '' : (entry.bonus != null && entry.bonus >= 0 ? `+${entry.bonus}` : (entry.bonus != null ? `${entry.bonus}` : ''))}{entry.bonusDetail ? ' ' + entry.bonusDetail : ''}</b></span>
          {entry.baneRoll != null && (
            <span className="log-bane-penalty"> -1d4 [Bane]: -{entry.baneRoll}</span>
          )}
          {entry.blessRoll != null && (
            <span className="log-bless-bonus"> +1d4 [Bless]: +{entry.blessRoll}</span>
          )}
          {entry.gwfApplied && entry.gwfOriginalRolls && (
            <span className="log-gwf">
              <i className="fa-solid fa-shield-halved"></i> GWF: {entry.gwfOriginalRolls.join(', ')} → {entry.gwfDisplayRolls?.join(', ') || entry.rolls.join(', ')}
            </span>
          )}
          {entry.rayOfEnfeebleRoll != null && (
            <span className="log-ray-enfeeblement"> -1d8 [Enfeeblement]: -{entry.rayOfEnfeebleRoll}</span>
          )}
          {entry.resistanceRoll != null && (
            <span className="log-resistance"> -1d4 [Resistance]: -{entry.resistanceRoll}</span>
          )}
        </div>
        {(isSaveDamage || isOverchannelDamage) && entry.finalDamage != null && entry.damageType && (
          <span className="log-final-damage">→ {entry.finalDamage} {entry.damageType} damage</span>
        )}
        {hasSecondary && (
          <div className="log-secondary-damage">
            <span className="log-secondary-label">Secondary:</span>
            {entry.secondaryFormula && <span className="log-dice-formula">{entry.secondaryFormula}</span>}
            <span className="log-total"><b>{entry.secondaryTotal}</b></span>
            {entry.secondaryDamageType && <span className="log-damage-type">{entry.secondaryDamageType}</span>}
            {entry.secondarySaveResult && (
              <span className={`log-save-result ${entry.secondarySaveResult === 'success' ? 'log-condition-success' : 'log-condition-failure'}`}>
                {entry.secondarySaveResult === 'success' ? 'SAVE SUCCESS' : 'SAVE FAILURE'}
                {entry.secondarySaveRoll != null && ` (d20 ${entry.secondarySaveRoll}${entry.secondarySaveBonus != null ? `+${entry.secondarySaveBonus}` : ''})`}
              </span>
            )}
          </div>
        )}
        {(isDamage || isSaveDamage) && entry.resistanceDetails && entry.resistanceDetails.length > 0 && (
          <span className="log-resistance-details">
            {entry.resistanceDetails.map((rd, i) => (
              <span key={i} className={rd.status === 'immune' ? 'log-immune' : 'log-resistant'}>
                {rd.status === 'immune' ? 'Immune' : 'Resistant'} to {rd.damageType}
              </span>
            ))}
          </span>
        )}
        {isAoeDamage && entry.affectedCount != null && entry.affectedCount > 0 && (
          <span className="log-aoe-affect">{entry.affectedCount} creature{entry.affectedCount !== 1 ? 's' : ''} affected</span>
        )}
        {entry.condition && entry.dc !== undefined && (
          <span className={`log-condition-save ${entry.success ? 'log-condition-success' : 'log-condition-failure'}`}>
            vs {entry.condition} (DC {entry.dc}): {entry.success ? 'SUCCESS' : 'FAILURE'}
            {entry.mode === 'disadvantage' && (
              <span className="log-mode-badge disadvantage">DISADVANTAGE</span>
            )}
            {entry.mode === 'advantage' && (
              <span className="log-mode-badge advantage">ADVANTAGE{entry.advantageSources && entry.advantageSources.length > 0 ? ` (${entry.advantageSources.join(', ')})` : ''}</span>
            )}
          </span>
        )}
        {entry.resistanceNotice && (
          <div className="log-resistance-notice">{entry.resistanceNotice}</div>
        )}
        {entry.hunterLoreNotice && (
          <div className="log-hunter-lore-notice">
            <i className="fa-solid fa-eye"></i> {entry.hunterLoreNotice}
          </div>
        )}
      </div>
    </div>
  );
}
