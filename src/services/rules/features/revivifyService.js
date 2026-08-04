import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../services/ui/logService.js';

function getFileNameFromName(name) {
    return `${name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
}

export async function triggerRevivify(spell, metaCtx, playerStats, campaignName, targetName) {
    const backpack = playerStats.inventory?.backpack || [];
    const diamondIndex = backpack.findIndex(item => {
        const name = typeof item === 'string' ? item : (item.name || '');
        return name.toLowerCase().includes('diamond');
    });

    if (diamondIndex === -1) {
        return {
            type: 'popup',
            payload: {
                type: 'automation_info',
                name: spell.name,
                automationType: 'revivify',
                description: 'Revivify requires a diamond worth 300+ GP, which the spell consumes.',
            },
        };
    }

    const newBackpack = [...backpack];
    newBackpack.splice(diamondIndex, 1);

    // Persist inventory change directly to the character JSON file via PATCH endpoint
    const casterFile = getFileNameFromName(playerStats.name);
    const patchUrl = `/api/campaigns/${encodeURIComponent(campaignName)}/${encodeURIComponent(casterFile)}`;
    console.log('[revivify] PATCH url:', patchUrl, 'file:', casterFile, 'campaign:', campaignName);
    const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: { ...playerStats.inventory, backpack: newBackpack } }),
    });
    console.log('[revivify] PATCH status:', patchRes.status, 'url:', patchUrl);
    if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error('[revivify] PATCH error body:', errText);
    }


    // Update caster's local runtime store
    setRuntimeValue(playerStats.name, 'inventory', { ...playerStats.inventory, backpack: newBackpack }, campaignName);

    const combatSummary = await (await fetch(`/api/campaigns/${encodeURIComponent(campaignName)}/combat-summary`)).json().catch(() => null);
    const targetCreature = combatSummary?.creatures?.find(c => c.name === targetName);
    const isPlayer = targetCreature?.type === 'player';
    const maxHp = isPlayer ? (targetCreature?.maxHp || 1) : (targetCreature?.maxHp || 1);
    const oldHp = isPlayer ? 0 : (targetCreature?.currentHp || 0);

    // Update target's runtime store (HP/death saves are transient, not persisted to character JSON)
    setRuntimeValue(targetName, 'currentHitPoints', 1, campaignName);
    setRuntimeValue(targetName, 'deathSaves', [false, false, false], campaignName);
    setRuntimeValue(targetName, 'deathFailures', [false, false, false], campaignName);
    setRuntimeValue(targetName, 'isDead', 0, campaignName);

    const actualHeal = 1 - oldHp;

    addEntry(campaignName, {
        type: 'hp_change',
        targetName,
        delta: actualHeal,
        currentHp: 1,
        maxHp,
        isHealing: true,
        sourceName: playerStats.name,
        note: spell.name,
        timestamp: Date.now(),
    }).catch((e) => { console.error('[revivify] Error logging heal:', e); });

    window.dispatchEvent(new CustomEvent('combat-summary-updated'));

    return {
        type: 'popup',
        payload: {
            type: 'heal',
            name: spell.name,
            targetName,
            finalHeal: actualHeal,
            total: 1,
            formula: '1 HP (revived)',
            rolls: [],
            rawTotal: 1,
        },
    };
}
