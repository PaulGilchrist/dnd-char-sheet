import React, { useState, useMemo } from 'react';
import { sanitizeHtml } from '../../../services/ui/sanitize.js';
import { getRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getOverchannelNecroticDamage } from '../../../services/automation/handlers/class-wizard/overchannelHandler.js';
import { isPsionicSpell, hasPsionicSorcery } from '../../../services/rules/spells/metamagicRules.js';
import { isFreeCastAuthorized, prepareSpellCast } from '../../../services/rules/spells/spellPreparationService.js';

function SpellDetailPopup({ spell, playerStats, campaignName, onClose, onCast, upcastLevels = [], playerLevel = 1 }) {
  const isCantrip = spell.level === 0;
  const slotDmg = spell.damage?.damage_at_slot_level;
  const healAtSlotLevel = spell.heal_at_slot_level;
  const charDmg = spell.damage?.damage_at_character_level;
  const isUpcastable = !isCantrip && ((slotDmg && Object.keys(slotDmg).length > 1) || (healAtSlotLevel && Object.keys(healAtSlotLevel).length > 1));

  const freeCastAuthorized = isFreeCastAuthorized(playerStats.name, spell.name, spell.level, playerStats, campaignName);

  const _psionicSorceryAvailable = (() => {
    const isSorcerer = playerStats.class?.name === 'Sorcerer';
    if (!isSorcerer) return 0;
    if (!isPsionicSpell(playerStats, spell.name)) return 0;
    if (!hasPsionicSorcery(playerStats)) return 0;
    if (isCantrip) return 0;
    const currentSP = Number(getRuntimeValue(playerStats.name, 'sorceryPoints') ?? 0);
    return currentSP;
  })();

  const isWarlock = playerStats.class?.name === 'Warlock';
  const getWarlockSlotLevel = (minLevel) => {
    if (!isWarlock) return null;
    for (let lv = minLevel; lv <= 9; lv++) {
      const key = `spell_slots_level_${lv}`;
      const max = (playerStats.spellAbilities && playerStats.spellAbilities[key]) || 0;
      const current = getRuntimeValue(playerStats.name, key);
      const available = current != null ? current : max;
      if (available > 0) return lv;
    }
    return null;
  };
  const warlockSlotLevel = getWarlockSlotLevel(spell.level);
  const hasAnySlots = isCantrip || freeCastAuthorized || upcastLevels.some(l => l.availableSlots > 0) || (isWarlock && warlockSlotLevel !== null) || _psionicSorceryAvailable > 0;

  const hasPsychicSpells = playerStats.automation?.passives?.some(p => p.type === 'psychic_spells');
  const hasSpellBreaker = playerStats.automation?.passives?.some(p => p.type === 'spell_breaker');
  const hasImprovedIllusions = playerStats.automation?.passives?.some(p => p.type === 'improved_illusions');
  const hasDamage = !!spell.damage;
  const isEnchantmentOrIllusion = () => {
    const school = (spell.school || '').toLowerCase();
    return school === 'enchantment' || school === 'illusion';
  };
  const isIllusionSpell = () => {
    const school = (spell.school || '').toLowerCase();
    return school === 'illusion';
  };
  const canChangeDamageType = isWarlock && hasPsychicSpells && hasDamage;
  const isDispelMagicAsBonusAction = hasSpellBreaker && spell.name === 'Dispel Magic';
  const [usePsychicDamage, setUsePsychicDamage] = useState(false);
  const [noVSComponents] = useState(isWarlock && hasPsychicSpells && isEnchantmentOrIllusion());
  const [noVComponents] = useState(hasImprovedIllusions && isIllusionSpell());

  const [usePsionicPayment, setUsePsionicPayment] = useState(false);
  const [selectedUpcastLvl, setSelectedUpcastLvl] = useState(() => {
    const firstAvailable = upcastLevels.find(l => l.availableSlots > 0);
    return firstAvailable ? String(firstAvailable.level) : String(upcastLevels[0]?.level || spell.level);
  });
   const hasOverchannelPassive = playerStats?.automation?.passives?.some(p => p.type === 'overchannel');
   const isOverchannelApplicable = hasOverchannelPassive && hasDamage && spell.level >= 1 && spell.level <= 5;
   const [useOverchannel, setUseOverchannel] = useState(false);
    const overchannelUseTrigger = useRuntimeValue(playerStats.name, 'Overchannel_useCount', campaignName);
    const overchannelUseCount = useMemo(() => {
      if (!isOverchannelApplicable) return 0;
      const value = overchannelUseTrigger ?? 0;
      return value;
   }, [isOverchannelApplicable, playerStats.name, campaignName, overchannelUseTrigger]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextOverchannelUse = overchannelUseCount + 1;
  const overchannelDamage = useMemo(() => {
    if (!isOverchannelApplicable || !useOverchannel) return null;
    const damage = getOverchannelNecroticDamage(spell.level, nextOverchannelUse);
    return damage;
  }, [isOverchannelApplicable, useOverchannel, spell.level, nextOverchannelUse]);

  const cantripAutoLevel = useMemo(() => {
    if (!isCantrip) return null;
    const dmgObj = (charDmg && Object.keys(charDmg).length) ? charDmg : (slotDmg && Object.keys(slotDmg).length ? slotDmg : null);
    if (!dmgObj) return null;
    const levels = Object.keys(dmgObj).map(Number).sort((a, b) => a - b);
    const applicable = levels.filter(l => l <= playerLevel);
    return applicable.length > 0 ? Math.max(...applicable) : null;
  }, [isCantrip, charDmg, slotDmg, playerLevel]);

  const handleCast = async () => {
    if (!canCast) return;
    const metaCtx = { overchannel: useOverchannel };
    if (isDispelMagicAsBonusAction) {
      const profBonus = Math.floor((playerStats.level - 1) / 4 + 2);
      metaCtx.dispelAbilityCheckBonus = profBonus;
    }

    let castSpell = spell;
    if (isCantrip && cantripAutoLevel) {
      castSpell = { ...spell, level: cantripAutoLevel, baseLevel: 0 };
    }

    // Cantrips: prepareSpellCast handles concentration and baseLevel
    if (isCantrip) {
      const result = await prepareSpellCast(castSpell, metaCtx, {
        playerName: playerStats.name,
        playerStats,
        campaignName,
        isUpcast: false,
        upcastLevel: undefined,
        usePsionicPayment: false,
        usePsychicDamage: false,
        freeCastAuthorized,
      });
      onCast(result.modifiedSpell, result.metaCtx);
      return;
    }

    const isUpcast = isUpcastable && Number(selectedUpcastLvl) !== castSpell.level;
    const upcastLevel = isUpcast ? Number(selectedUpcastLvl) : undefined;

    (async () => {
      const result = await prepareSpellCast(castSpell, metaCtx, {
        playerName: playerStats.name,
        playerStats,
        campaignName,
        isUpcast,
        upcastLevel,
        usePsionicPayment,
        usePsychicDamage,
        freeCastAuthorized,
      });
      onCast(result.modifiedSpell, result.metaCtx);
    })();
  };

  const isRaging = getActiveBuffs(playerStats.name, campaignName).some(b => b.name === 'Rage');
  const canCast = !isRaging && (isCantrip || (isUpcastable ? hasAnySlots : (freeCastAuthorized || (() => {
    const baseKey = `spell_slots_level_${spell.level}`;
    const stored = getRuntimeValue(playerStats.name, baseKey);
    const max = (playerStats.spellAbilities && playerStats.spellAbilities[baseKey]) || 0;
    return (stored != null ? stored : max) > 0;
  })() || (isWarlock && warlockSlotLevel !== null))) || (_psionicSorceryAvailable >= (isUpcastable ? Number(selectedUpcastLvl) || spell.level : spell.level)));

  const showUpcastSelector = isUpcastable && upcastLevels.length > 1;

  return (
    <div className="spell-detail-popup">
      <div className="spell-detail-content">
        <h3 dangerouslySetInnerHTML={{ __html: sanitizeHtml(spell.name) }} />
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(Array.isArray(spell.description) ? spell.description.join('') : spell.description || '') }} />
        <div className="spell-detail-meta">
          <span><b>Level:</b> {isCantrip ? 'Cantrip' : spell.level}</span>
          <span><b>Casting Time:</b> {spell.casting_time || '—'}</span>
          <span><b>Range:</b> {spell.range || '—'}</span>
          <span><b>Duration:</b> {spell.duration || '—'}</span>
          {spell.school && <span><b>School:</b> {spell.school}</span>}
          {spell.area_of_effect && <span><b>Area:</b> {spell.area_of_effect.type || spell.area_of_effect.shape}{spell.area_of_effect.size ? ` - ${spell.area_of_effect.size}` : ''}</span>}
           {!isCantrip && !showUpcastSelector && (
             <span><b>Slots Remaining:</b> {(() => {
               const displayKey = isWarlock && warlockSlotLevel ? `spell_slots_level_${warlockSlotLevel}` : `spell_slots_level_${spell.level}`;
               const stored = getRuntimeValue(playerStats.name, displayKey);
               const max = (playerStats.spellAbilities && playerStats.spellAbilities[displayKey]) || 0;
               const slots = stored != null ? stored : max;
               return slots > 0 ? `${slots} slot${slots !== 1 ? 's' : ''}` : slots;
             })()}{!isCantrip && !showUpcastSelector && _psionicSorceryAvailable > 0 && (() => {
               const baseKey = `spell_slots_level_${spell.level}`;
               const stored = getRuntimeValue(playerStats.name, baseKey);
               const max = (playerStats.spellAbilities && playerStats.spellAbilities[baseKey]) || 0;
              const slots = stored != null ? stored : max;
              return slots > 0 ? ` or ${_psionicSorceryAvailable} SP` : `${_psionicSorceryAvailable} SP`;
            })()}</span>
          )}
        </div>
        {showUpcastSelector && (
          <div className="spell-detail-upcast">
            <p className="spell-detail-upcast-label"><i className="fa-solid fa-arrow-up"></i> Cast at Level:</p>
            {upcastLevels.map(({ level, formula, availableSlots }) => {
              const isSelected = selectedUpcastLvl === String(level);
              const resolvedFormula = formula.replace(/\bMOD\b/g, String(playerStats.spellAbilities?.modifier || 0));
              const spCanCover = _psionicSorceryAvailable >= level;
              return (
                <label
                  key={level}
                  className={`spell-detail-upcast-level ${isSelected ? 'spell-detail-upcast-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="spellDetailUpcastLevel"
                    value={level}
                    checked={isSelected}
                    onChange={() => setSelectedUpcastLvl(String(level))}
                    disabled={availableSlots <= 0 && !spCanCover}
                  />
                  <span className="spell-detail-upcast-level-number">Level {level}</span>
                  <span className="spell-detail-upcast-formula">{resolvedFormula}</span>
                  <span className="spell-detail-upcast-slots">{availableSlots > 0 ? `${availableSlots} slot${availableSlots !== 1 ? 's' : ''}` : ''}{availableSlots > 0 && spCanCover ? ' or ' : ''}{spCanCover ? `${_psionicSorceryAvailable} SP` : ''}</span>
                </label>
              );
            })}
          </div>
        )}
        {(() => {
          const upcastLevel = isUpcastable ? (Number(selectedUpcastLvl) || spell.level) : spell.level;
          const slotKey = `spell_slots_level_${upcastLevel}`;
          const currentSlots = getRuntimeValue(playerStats.name, slotKey);
          const maxSlots = (playerStats.spellAbilities && playerStats.spellAbilities[slotKey]) || 0;
          const availableSlots = currentSlots != null ? currentSlots : maxSlots;
          const showBoth = _psionicSorceryAvailable > 0 && availableSlots > 0;
          const isPsionic = isPsionicSpell(playerStats, spell.name);
          const hasPsionic = hasPsionicSorcery(playerStats);
          if (!isPsionic || !hasPsionic || isCantrip || freeCastAuthorized || !showBoth) return null;
          return (
            <div className="spell-detail-upcast">
              <label>
                <input
                  type="checkbox"
                  checked={usePsionicPayment}
                  onChange={() => setUsePsionicPayment(!usePsionicPayment)}
                />
                <span>Use Sorcery Points ({upcastLevel} SP) instead of spell slot</span>
              </label>
            </div>
          );
        })()}
        {canChangeDamageType && (
          <div className="spell-detail-upcast">
            <label>
              <input
                type="checkbox"
                checked={usePsychicDamage}
                onChange={() => setUsePsychicDamage(!usePsychicDamage)}
              />
              <span>Change damage type to Psychic</span>
            </label>
          </div>
        )}
        {isOverchannelApplicable && (
          <div className="spell-detail-upcast">
            <label>
              <input
                type="checkbox"
                checked={useOverchannel}
                onChange={() => setUseOverchannel(!useOverchannel)}
              />
              <span>Overchannel (Maximize Damage)&nbsp;</span>
            </label>
            {overchannelDamage && overchannelDamage.expression && (
              <div className="spell-detail-overchannel-warning">
                <i className="fa-solid fa-skull"></i> Warning: Using Overchannel this time (use #{nextOverchannelUse}) will deal <strong>{overchannelDamage.expression}</strong> Necrotic damage to you (ignores resistance/immunity). First use deals no damage.
              </div>
            )}
            {overchannelDamage === 0 && useOverchannel && (
              <div className="spell-detail-overchannel-info">
                <i className="fa-solid fa-shield-halved"></i> First use: no necrotic damage
              </div>
            )}
          </div>
        )}
        {noVSComponents && (
          <div className="spell-detail-free-cast">
            <i className="fa-solid fa-ghost"></i> No Verbal or Somatic components (Psychic Spells)
          </div>
        )}
        {noVComponents && (
          <div className="spell-detail-free-cast">
            <i className="fa-solid fa-ghost"></i> No Verbal components (Improved Illusions)
          </div>
        )}
        <div className="spell-detail-actions">
          <button
            className="char-btn"
            onClick={handleCast}
            disabled={!canCast}
          >
            <i className="fa-solid fa-wand-magic"></i> Cast Spell
          </button>
          <button className="char-btn char-btn-secondary" onClick={onClose}>
            <i className="fa-solid fa-times"></i> Close
          </button>
        </div>
          {freeCastAuthorized && (
            <p className="spell-detail-free-cast"><i className="fa-solid fa-bolt"></i> Free Cast — no spell slot consumed</p>
          )}
          {!canCast && !isCantrip && !freeCastAuthorized && (
          <p className="spell-detail-no-slots">No spell slots available for this level.</p>
        )}
      </div>
    </div>
  );
}

export default SpellDetailPopup;
