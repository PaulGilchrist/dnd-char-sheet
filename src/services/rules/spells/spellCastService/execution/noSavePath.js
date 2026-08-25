import { rollExpression } from '../../../../dice/diceRoller.js';
import { isInnateSorceryActive } from '../../../../combat/buffs/buffService.js';
import { isMagicMissile, executeMagicMissile } from './helpers.js';
import { resolveSpellDamageAtLevel } from '../../../core/spellDamageUtils.js';

async function handleNoSavePath(spell, metaCtx, playerStats, campaignName, mapName, characters,
    getTargetInfo, rollAttack, spellToHit, damageType) {

    if (isMagicMissile(spell)) {
        await executeMagicMissile(spell, metaCtx, { rollDamage: () => {}, playerStats, getTargetInfo, campaignName, mapName, characters });
        return null;
    }

    if (spell.attack_type || spell.damage) {
        const target = await getTargetInfo();
        const rollCtx = isInnateSorceryActive(playerStats.name, campaignName) && !metaCtx?.forcedMode ? { ...metaCtx, forcedMode: 'advantage' } : metaCtx;
        const overchannelFormula = metaCtx?.overchannelFormula || spell.damage?.formula || resolveSpellDamageAtLevel(spell, playerStats.level) || '';
        const overchannelActive = metaCtx?.overchannelActive || false;
        const overchannelUseCount = metaCtx?.overchannelUseCount || 0;
        const finalFormula = metaCtx?.finalFormula || overchannelFormula;
        const damageRollResult = rollExpression(overchannelFormula);
        const attackCtx = {
            attackName: spell.name,
            targetName: target?.name,
            attackerName: playerStats.name,
            damageType: damageType || spell.damage?.damage_type,
            autoDamageFormula: finalFormula,
            autoDamageName: spell.name,
            spellName: spell.name,
            autoDamageSchool: spell.school,
            overchannelActive,
            overchannelUseCount,
            overchannelSpellLevel: metaCtx?.slotLevel || spell.level,
            autoDamageRollResult: damageRollResult,
            ...rollCtx,
            isCantrip: spell.baseLevel === 0 || spell.level === 0,
            playerStats,
        };
        if (metaCtx?.metamagicHeighten) {
            attackCtx.metamagicHeighten = true;
        }
        rollAttack(spell.name, spellToHit, attackCtx);
    }
}

export { handleNoSavePath };
