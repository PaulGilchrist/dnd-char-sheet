import { getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js'

export default function useCharActionsBaseActions({
    cannotAct,
    getRuntimeValue,
    setRuntimeValue,
    rollSkillCheck,
    rollAbilityCheck,
    addEntry,
    setPopupHtml,
    playerStats,
    campaignName,
    exhaustionPenalty,
    conditionEffects,
    toggleBuff,
    addExpiration,
    loadCombatSummary,
    getMonsterData,
}) {
    async function handleHideAction() {
        if (cannotAct) return;
        const currentConditions = getRuntimeValue(playerStats.name, 'activeConditions', campaignName) || [];
        const isAlreadyInvisible = currentConditions.some(c => String(c).toLowerCase() === 'invisible');
        if (isAlreadyInvisible) {
            setPopupHtml({ type: 'automation_info', name: 'Hide', description: 'You are already hidden (Invisible condition active).' });
            return;
        }
        const stealthSkill = playerStats?.abilities?.flatMap(a => a.skills || []).find(s => s.name === 'Stealth');
        let stealthBonus = stealthSkill?.bonus ?? 0 - exhaustionPenalty;

        const isCharismaSkill = ['Deception', 'Intimidation', 'Performance', 'Persuasion'].includes('Stealth');
        if (conditionEffects?.wisCheckReplace && isCharismaSkill) {
            const wisAbility = playerStats?.abilities?.find(a => a.name === 'Wisdom');
            const wisMod = wisAbility?.bonus || 0;
            const wisBonus = Math.max(1, wisMod);
            const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
            const isProficient = playerStats.skillProficiencies?.includes('Stealth');
            const isExpert = playerStats.expertise?.includes('Stealth');
            let newBonus = wisBonus;
            if (isProficient) newBonus += proficiency;
            if (isExpert) newBonus += proficiency;
            stealthBonus = newBonus - exhaustionPenalty;
        }
        const isJackOfAllTrades = playerStats?.automation?.passives?.some(p => p.type === 'jack_of_all_trades');
        const isNotProficient = !playerStats?.skillProficiencies?.includes('Stealth');
        if (isJackOfAllTrades && isNotProficient) {
            const prof = Math.floor((playerStats.level - 1) / 4 + 2);
            stealthBonus += Math.floor(prof / 2);
        }
        if (conditionEffects?.passWithoutTraceBonus && 'Stealth' === 'Stealth') {
            stealthBonus += parseInt(conditionEffects.passWithoutTraceBonus, 10);
        }
        let checkContext = {};
        const hasSkulkerFeat = (playerStats?.feats || []).some(f => String(f).toLowerCase().includes('skulker'));
        const is2024Rules = playerStats?.rules === '2024';
        let skulkerFogOfWarApplied = false;
        if (conditionEffects?.abilityCheckDisadvantage) checkContext.forcedMode = 'disadvantage';
        if (!checkContext.forcedMode && conditionEffects?.hexAbilityCheckDisadvantage && conditionEffects?.hexAbilityCheckDisadvantageAbility === 'DEX') checkContext.forcedMode = 'disadvantage';
        if (conditionEffects?.abilityCheckAdvantage && (!conditionEffects?.abilityCheckAdvantageSkill || conditionEffects.abilityCheckAdvantageSkill === 'Stealth')) {
            checkContext.forcedMode = checkContext.forcedMode === 'disadvantage' ? undefined : 'advantage';
        }
        if (conditionEffects?.peerlessAthleteAdvantageSkills && conditionEffects.peerlessAthleteAdvantageSkills.includes('Stealth')) {
            checkContext.forcedMode = checkContext.forcedMode === 'disadvantage' ? undefined : 'advantage';
        }
        if (!checkContext.forcedMode && is2024Rules && hasSkulkerFeat) {
            checkContext.forcedMode = 'advantage';
            skulkerFogOfWarApplied = true;
        }
        await rollSkillCheck('Stealth', stealthBonus, checkContext);
        await new Promise(resolve => setTimeout(resolve, 50));
        const lastAttackData = await getRuntimeValue('campaign', 'lastAttack', campaignName);
        const rollTotal = lastAttackData?.total;
        const dc = 15;
        const success = rollTotal >= dc;
        if (success) {
            const newConditions = [...currentConditions, 'invisible'];
            await setRuntimeValue(playerStats.name, 'activeConditions', newConditions, campaignName);
            const activeBuffs = getRuntimeValue(playerStats.name, 'activeBuffs', campaignName) || [];
            const hasAdvantageOnStealth = activeBuffs.some(b => b.effect === 'advantage_on_stealth');
            const newBuffs = hasAdvantageOnStealth ? activeBuffs : [...activeBuffs, { name: 'Hide', effect: 'advantage_on_stealth' }];
            await setRuntimeValue(playerStats.name, 'activeBuffs', newBuffs, campaignName);
            const d20Val = lastAttackData?.d20 ?? '?';
            let successDesc = `Hide successful! (d20: ${d20Val} + ${stealthBonus} = ${rollTotal}) You gain the Invisible condition and advantage on Dexterity (Stealth) checks until you attack, take damage, or use Lesser Restoration to remove the condition.`;
            let successLog = `Stealth check: ${rollTotal} (d20: ${d20Val} + ${stealthBonus}) vs DC ${dc} — Success. Gained Invisible condition and advantage on Stealth checks.`;
            if (skulkerFogOfWarApplied) {
                successDesc = `Hide successful! (Advantage from Skulker - Fog of War) (d20: ${d20Val} + ${stealthBonus} = ${rollTotal}) You gain the Invisible condition and advantage on Dexterity (Stealth) checks until you attack, take damage, or use Lesser Restoration to remove the condition.`;
                successLog = `Stealth check: ${rollTotal} (Advantage from Skulker - Fog of War) (d20: ${d20Val} + ${stealthBonus}) vs DC ${dc} — Success. Gained Invisible condition and advantage on Stealth checks.`;
            }
            setPopupHtml({ type: 'automation_info', name: 'Hide', description: successDesc });
            await addEntry(campaignName, {
                type: 'ability_use',
                characterName: playerStats.name,
                abilityName: 'Hide',
                description: successLog,
            }).catch(() => { });
        } else {
            const d20Val = lastAttackData?.d20 ?? '?';
            let failDesc = `Hide failed! (d20: ${d20Val} + ${stealthBonus} = ${rollTotal}) You remain visible.`;
            let failLog = `Stealth check: ${rollTotal} (d20: ${d20Val} + ${stealthBonus}) vs DC ${dc} — Failure. Did not gain the Invisible condition.`;
            if (skulkerFogOfWarApplied) {
                failDesc = `Hide failed! (Advantage from Skulker - Fog of War) (d20: ${d20Val} + ${stealthBonus} = ${rollTotal}) You remain visible.`;
                failLog = `Stealth check: ${rollTotal} (Advantage from Skulker - Fog of War) (d20: ${d20Val} + ${stealthBonus}) vs DC ${dc} — Failure. Did not gain the Invisible condition.`;
            }
            setPopupHtml({ type: 'automation_info', name: 'Hide', description: failDesc });
            await addEntry(campaignName, {
                type: 'ability_use',
                characterName: playerStats.name,
                abilityName: 'Hide',
                description: failLog,
            }).catch(() => { });
        }
    }

    async function handleDodgeAction() {
        if (cannotAct) return;
        const result = toggleBuff(
            playerStats.name,
            'Dodge',
            { effect: 'dodge', duration: 'until_start_of_next_turn' },
            campaignName,
            playerStats.name
        );
        if (!result.wasActive) {
            addExpiration(playerStats.name, playerStats.name, [
                { type: 'remove_active_buff', buffName: 'Dodge' }
            ], campaignName, undefined, playerStats.name);
            await addEntry(campaignName, {
                type: 'ability_use',
                characterName: playerStats.name,
                abilityName: 'Dodge',
                description: `${playerStats.name} takes the Dodge action. Attackers have disadvantage on attacks against you until the start of your next turn. You have advantage on Dexterity saving throws.`,
            }).catch(() => { });
        }
        setPopupHtml({
            type: 'automation_info',
            name: 'Dodge',
            description: result.wasActive
                ? 'Dodge deactivated.'
                : 'Dodge activated. Attackers have disadvantage on attacks against you until the start of your next turn. You have advantage on Dexterity saving throws.',
        });
    }

    async function handleGrappleAction() {
        if (cannotAct) return;
        const cs = await loadCombatSummary(campaignName);
        const target = cs ? getTargetFromAttacker(cs, playerStats.name) : null;
        if (!target) {
            setPopupHtml({ type: 'automation_info', name: 'Grapple', description: 'No target selected. Select a target in combat first.' });
            return;
        }
        const targetConditions = target.conditions || [];
        const isTargetAlreadyGrappled = targetConditions.some(c => String(c).toLowerCase() === 'grappled');
        if (isTargetAlreadyGrappled) {
            setPopupHtml({ type: 'automation_info', name: 'Grapple', description: 'Target is already grappled.' });
            return;
        }
        const isMonk = playerStats.class?.name === 'Monk';
        const strAbility = playerStats?.abilities?.find(a => a.name === 'Strength');
        const strMod = strAbility?.bonus || 0;
        const dexAbility = playerStats?.abilities?.find(a => a.name === 'Dexterity');
        const dexMod = dexAbility?.bonus || 0;
        const useAbility = isMonk ? 'Dexterity' : 'Strength';
        const abilityMod = isMonk ? dexMod : strMod;
        let checkBonus = abilityMod - exhaustionPenalty;
        const isJackOfAllTrades = playerStats?.automation?.passives?.some(p => p.type === 'jack_of_all_trades');
        if (isJackOfAllTrades) {
            const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
            checkBonus += Math.floor(proficiency / 2);
        }
        let checkContext = {};
        if (isMonk && conditionEffects?.peerlessAthleteAdvantageSkills && conditionEffects.peerlessAthleteAdvantageSkills.includes(useAbility)) {
            checkContext.forcedMode = checkContext.forcedMode === 'disadvantage' ? undefined : 'advantage';
        }
        else if (conditionEffects?.strCheckDisadvantage) checkContext.forcedMode = 'disadvantage';
        if (conditionEffects?.abilityCheckDisadvantage) checkContext.forcedMode = 'disadvantage';
        if (!checkContext.forcedMode && conditionEffects?.hexAbilityCheckDisadvantage && conditionEffects?.hexAbilityCheckDisadvantageAbility === useAbility) checkContext.forcedMode = 'disadvantage';
        if (conditionEffects?.abilityCheckAdvantage && (!conditionEffects?.abilityCheckAdvantageSkill || conditionEffects.abilityCheckAdvantageSkill === useAbility)) {
            checkContext.forcedMode = checkContext.forcedMode === 'disadvantage' ? undefined : 'advantage';
        }
        await rollAbilityCheck(useAbility, checkBonus, checkContext);
        await new Promise(resolve => setTimeout(resolve, 50));
        const lastAttack = await getRuntimeValue('campaign', 'lastAttack', campaignName);
        const rollTotal = lastAttack?.total;
        const d20Val = lastAttack?.d20 ?? '?';
        let targetStrBonus = 0;
        if (target.computedStats?.abilities) {
            const targetStr = target.computedStats.abilities.find(a => a.name === 'Strength');
            targetStrBonus = targetStr?.bonus || 0;
        } else if (target.abilities) {
            const targetStr = target.abilities.find(a => a.name === 'Strength');
            targetStrBonus = targetStr?.bonus || 0;
        } else if (target.ability_score_modifiers?.str != null) {
            targetStrBonus = target.ability_score_modifiers.str;
        } else if (target.type === 'player') {
            const targetCharacter = cs?.creatures?.find(c => c.name === target.name);
            const targetStr = targetCharacter?.computedStats?.abilities?.find(a => a.name === 'Strength') || targetCharacter?.abilities?.find(a => a.name === 'Strength');
            targetStrBonus = targetStr?.bonus || 0;
        } else {
            const monsterData = await getMonsterData(target.name, cs?.creatures || []);
            if (monsterData?.ability_score_modifiers?.str != null) {
                targetStrBonus = monsterData.ability_score_modifiers.str;
            }
        }
        const success = rollTotal > targetStrBonus;
        if (success) {
            const combatSummary = cs;
            if (combatSummary?.creatures) {
                const targetCreature = combatSummary.creatures.find(c => c.name === target.name);
                if (targetCreature) {
                    const storedConditions = getRuntimeValue(targetCreature.name, 'activeConditions') || [];
                    const filtered = storedConditions.filter(c => String(c).toLowerCase() !== 'grappled');
                    await setRuntimeValue(targetCreature.name, 'activeConditions', [...filtered, 'grappled'], campaignName);
                }
            }
            setPopupHtml({ type: 'automation_info', name: 'Grapple', description: `Grapple successful! (d20: ${d20Val} + ${checkBonus} = ${rollTotal}) vs target STR (${targetStrBonus >= 0 ? '+' : ''}${targetStrBonus}). Target is now grappled.` });
            await addEntry(campaignName, {
                type: 'ability_use',
                characterName: playerStats.name,
                abilityName: 'Grapple',
                description: `${useAbility} check: ${rollTotal} (d20: ${d20Val} + ${checkBonus}) vs target STR (${targetStrBonus >= 0 ? '+' : ''}${targetStrBonus}) — Success. Target is now grappled.`,
            }).catch(() => { });
        } else {
            setPopupHtml({ type: 'automation_info', name: 'Grapple', description: `Grapple failed! (d20: ${d20Val} + ${checkBonus} = ${rollTotal}) vs target STR (${targetStrBonus >= 0 ? '+' : ''}${targetStrBonus}). Target is not grappled.` });
            await addEntry(campaignName, {
                type: 'ability_use',
                characterName: playerStats.name,
                abilityName: 'Grapple',
                description: `${useAbility} check: ${rollTotal} (d20: ${d20Val} + ${checkBonus}) vs target STR (${targetStrBonus >= 0 ? '+' : ''}${targetStrBonus}) — Failure. Target is not grappled.`,
            }).catch(() => { });
        }
    }

    return {
        handleHideAction,
        handleDodgeAction,
        handleGrappleAction,
    };
}
