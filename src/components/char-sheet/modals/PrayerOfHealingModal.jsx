import CreatureSelectionModal from './shared/CreatureSelectionModal.jsx';

export default function PrayerOfHealingModal({
    creatureTargets,
    maxTargets,
    onConfirm,
    onSkip,
}) {
    return (
        <CreatureSelectionModal
            title="Prayer of Healing"
            icon="fa-hands-praying"
            targets={creatureTargets}
            maxTargets={maxTargets}
            description="Choose up to 5 creatures to heal."
            confirmLabel="Heal"
            confirmIcon="fa-hands-praying"
            onConfirm={onConfirm}
            onSkip={onSkip}
        />
    );
}
