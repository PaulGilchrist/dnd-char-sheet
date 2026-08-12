import { sanitizeHtml } from '../../services/ui/sanitize.js';
import { formatDamageTypes } from '../../services/rules/combat/damageUtils.js';
import { extractDamageDiceFromDescription } from './MonsterCardModal.jsx';
import { extractConditionsFromSaveEffect } from './MonsterCardHelpers.js';

export function MonsterAction({ action, index, attackerCannotAct, onAttack, onDamage, onSaveRoll }) {
  const actionHasSave = action.save_dc != null;
  const actionHasAttack = action.attack_bonus != null;
  const actionDamageFormula = extractDamageDiceFromDescription(action?.description, action?.damage_dice_primary);
  const actionDamageType = action?.damage_type_primary ? [action.damage_type_primary] : [];
  const actionHasSecondaryDamage = action.damage_dice_secondary != null;

  return (
    <div key={index} className={`mc-action ${attackerCannotAct ? 'mc-action-disabled' : ''}`}>
      <strong>{action.name}.</strong>{' '}
      {attackerCannotAct && <span className="mc-incapacitated-label">(Incapacitated)</span>}
      {actionHasAttack && !attackerCannotAct && (
        <span className="mc-dice-link" onClick={() => onAttack(action.name, action.attack_bonus, action)} role="button" tabIndex={0}>
          <i className="fa-solid fa-dice-d20" /> +{action.attack_bonus}
        </span>
      )}
      {!actionHasAttack && !actionHasSave && (actionDamageFormula || actionHasSecondaryDamage) && (
        <>
          {actionDamageFormula && (
            <span className="mc-dice-link" onClick={() => onDamage(action.name, actionDamageFormula, actionDamageType.length > 0 ? formatDamageTypes(actionDamageType) : '', action)} role="button" tabIndex={0}>
              <i className="fa-solid fa-dice" /> {actionDamageFormula}
            </span>
          )}
          {actionHasSecondaryDamage && (
            <span className="mc-dice-link" onClick={() => onDamage(action.name, action.damage_dice_secondary, actionDamageType.length > 0 ? formatDamageTypes(actionDamageType) : '', action)} role="button" tabIndex={0}>
              <i className="fa-solid fa-dice" /> {action.damage_dice_secondary}
            </span>
          )}
        </>
      )}
      {actionHasSave && (() => {
        const saveDamageFormula = extractDamageDiceFromDescription(action?.description, action?.damage_dice_primary);
        const saveConditions = extractConditionsFromSaveEffect(action?.save_effect);
        const handleSaveRoll = () => {
          onSaveRoll(action, saveDamageFormula, saveConditions);
        };
        return (
          saveDamageFormula ? (
            <span className="mc-dice-link" role="button" tabIndex={0} onClick={handleSaveRoll}>
              <i className="fa-solid fa-dice" /> {saveDamageFormula}
            </span>
          ) : (
            <span className={`mc-dice-link ${!action.attack_bonus && !attackerCannotAct ? 'mc-dice-link-save mc-dice-link-save-clickable' : 'mc-dice-link-save'}`} onClick={!action.attack_bonus && !attackerCannotAct ? handleSaveRoll : undefined} role="button" tabIndex={0}>
              DC {action.save_dc} {action.save_type}
            </span>
          )
        );
      })()}
      <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(action.description) }} />
      {action.usage && <em> ({String(action.usage)})</em>}
      {action.recharge && <em> ({String(action.recharge)})</em>}
    </div>
  );
}
