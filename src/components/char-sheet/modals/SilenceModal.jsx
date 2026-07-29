import { useCallback } from 'react';
import { setRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatContext } from '../../../services/rules/combat/damageUtils.js';
import { addEntry } from '../../../services/ui/logService.js';
import { addExpiration } from '../../../services/rules/effects/expirations.js';
import CreatureSelectionModal from './shared/CreatureSelectionModal.jsx';
import { addSilencedTarget } from '../../../services/rules/features/silenceService.js';

const SILENCE_KEY = 'silenceCaster';
const SILENCE_CENTER_KEY = 'silenceCenter';
const SILENCE_RADIUS_KEY = 'silenceRadius';

export default function SilenceModal({
    playerStats,
    campaignName,
    aoeRadius,
    onClose,
    creatureTargets,
}) {
    const allCreatures = creatureTargets || [];

    const handleConfirm = useCallback(async (selected) => {
        const casterName = playerStats.name;
        const targetedNames = Array.isArray(selected) ? selected.map(t => t.name || t) : [];

        if (targetedNames.length === 0) {
            setRuntimeValue(casterName, SILENCE_KEY, false, campaignName);
            setRuntimeValue(casterName, SILENCE_CENTER_KEY, null, campaignName);
            setRuntimeValue(casterName, SILENCE_RADIUS_KEY, null, campaignName);
            onClose();
            return;
        }

        const combatSummary = await getCombatContext(campaignName);
        let centerGrid = null;
        if (combatSummary) {
            const casterPos = combatSummary.players?.find(p => p.name === casterName);
            if (casterPos && casterPos.gridX != null && casterPos.gridY != null) {
                centerGrid = { gridX: casterPos.gridX, gridY: casterPos.gridY };
            }
        }

        setRuntimeValue(casterName, SILENCE_KEY, true, campaignName);
        setRuntimeValue(casterName, SILENCE_CENTER_KEY, centerGrid ? JSON.stringify(centerGrid) : null, campaignName);
        setRuntimeValue(casterName, SILENCE_RADIUS_KEY, aoeRadius, campaignName);

        const results = [];

        for (const targetName of targetedNames) {
            const storedConditions = getRuntimeValue(targetName, 'activeConditions', campaignName) || [];
            const conditions = Array.isArray(storedConditions) ? storedConditions : [];
            const filtered = conditions.filter(c => String(c).toLowerCase() !== 'deafened');
            const newConditions = [...filtered, 'deafened'];
            setRuntimeValue(targetName, 'activeConditions', newConditions, campaignName);

            addSilencedTarget(casterName, targetName, campaignName);
            addExpiration(casterName, targetName, [
                { type: 'condition', condition: 'deafened' },
            ], campaignName);

            await addEntry(campaignName, {
                type: 'condition',
                action: 'applied',
                characterName: targetName,
                condition: 'Deafened',
                reason: 'Silence spell',
                note: `${targetName} is Deafened by Silence and cannot hear or cast spells with Verbal components.`,
                timestamp: Date.now(),
            }).catch((e) => { console.error("[silence] Error logging condition:", e); });

            results.push(`${targetName} is Deafened.`);
        }

        addExpiration(casterName, casterName, [
            { type: 'remove_active_buff', buffName: 'Silence' },
            { type: 'clear_silence_zone', casterName },
        ], campaignName);

        await addEntry(campaignName, {
            type: 'ability_use',
            characterName: casterName,
            abilityName: 'Silence',
            description: `${casterName} cast Silence — a ${aoeRadius}-foot-radius sphere of silence is created. ${results.join(' ')} Creatures inside are immune to Thunder damage. Verbal spell components cannot be used inside.`,
            timestamp: Date.now(),
        }).catch((e) => { console.error("[silence] Error:", e); });

        window.dispatchEvent(new CustomEvent('combat-summary-updated'));
        onClose();
    }, [playerStats.name, campaignName, aoeRadius, onClose]);

    const handleSkip = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        <CreatureSelectionModal
            title="Silence"
            icon="fa-volume-xmark"
            targets={allCreatures}
            description="For the duration, no sound can be created within or pass through a 20-foot-radius sphere centered on a point you choose. Any creature you choose within range is Deafened and immune to Thunder damage. Casting a spell that includes a Verbal component is impossible there."
            confirmLabel="Cast Silence"
            confirmIcon="fa-volume-xmark"
            onConfirm={handleConfirm}
            onSkip={handleSkip}
        />
    );
}
