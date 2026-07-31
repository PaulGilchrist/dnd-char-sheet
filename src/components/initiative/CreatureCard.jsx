

import AvatarImage from '../common/AvatarImage.jsx'
import MonsterNameAutocomplete from '../common/MonsterNameAutocomplete.jsx'
import NpcAvatar from './NpcAvatar.jsx'
import CreatureHp from './CreatureHp.jsx'
import { getAbilityLabel } from '../../services/combat/conditions/conditionUtils.js'
import { useRuntimeValue, getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import ConditionEffectBadges from './ConditionEffectBadges.jsx'
import CreatureBadge from '../common/CreatureBadge.jsx'
import { isBuffActive } from '../../services/automation/common/buffToggle.js';
import { CONDITION_DESCRIPTIONS } from '../../services/combat/conditions/effectDescriptions.js'
import { isUnbreakableMajestyActive, getUnbreakableMajestySaveDc, clearUnbreakableMajesty } from '../../services/combat/auras/unbreakableMajesty.js'

const SHAPE_LABELS = {
    sphere: 'Sphere',
    cylinder: 'Cylinder',
    cube: 'Cube',
    cone: 'Cone',
    line: 'Line',
}

function CreatureCard({
    creature,
    isActive,
    isLocalhost,
    npcImage,
    campaignNpcs,
    overlays,
    onRemoveNpc,
    onNpcClick,
    onNameChange,
    onHpChange,
    onInitiativeChange,
    onTargetChange,
    onRollConditionSave,
    onBreakCondition,
    onOpenEffectAdder,
    onRollConcentrationSave,
    onBreakConcentration,
    allCreatures,
    campaignName,
    hasTacticalShift,
    hasSpeedyOpportunityDisadvantage,
    hasSpeedyDifficultTerrainIgnore,
    coronaDisadvantage,
    characters,
    mapName,
}) {
    const isUnconscious = creature.currentHp <= 0
    const allTargetEffects = useRuntimeValue('campaign', 'targetEffects') ?? [];
    const myTargetEffects = allTargetEffects.filter(te => te.target === creature.name);
    const isMajestyActive = creature.type === 'player' && isUnbreakableMajestyActive(creature.name, campaignName);
    const majestyDc = isMajestyActive ? getUnbreakableMajestySaveDc(creature.name, campaignName) : 0;
    const wildShapeActive = isBuffActive(creature.name, 'Wild Shape', campaignName);
    const wrathOfTheSeaActive = creature.type === 'player' && getRuntimeValue(creature.name, 'wrathOfTheSeaActive', campaignName);
    const recklessAttackActive = myTargetEffects.some(te => te.effect === 'reckless_attack');
    const isPlayerSummoned = creature.type !== 'player' && myTargetEffects.some(te =>
        te.effect === 'summoned' &&
        allCreatures.some(c => c.type === 'player' && c.name === te.source)
    );

    const sanctuaryInfo = (() => {
        for (const other of allCreatures) {
            if (other.type !== 'player') continue;
            const active = getRuntimeValue(other.name, 'naturesSanctuaryActive', campaignName);
            if (!active) continue;
            const creatureList = getRuntimeValue(other.name, 'naturesSanctuaryCreatures', campaignName) || [];
            if (creatureList.includes(creature.name)) {
                const resistance = getRuntimeValue(other.name, 'naturesSanctuaryResistance', campaignName) || 'None';
                return { druid: other.name, resistance };
            }
        }
        return null;
    })();

    return (
        <div className={`creature-card ${creature.type} ${isActive ? 'active' : ''} ${isUnconscious ? 'creature-unconscious' : ''}`}>
            {creature.type !== 'player' && isLocalhost && (
                <button
                    className="npc-remove-btn"
                    onClick={() => onRemoveNpc(creature.name)}
                    type="button"
                    title="Remove NPC"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            )}
            <div className='creature-avatar'>
                {creature.type === 'player' ? (
                    <AvatarImage name={creature.name} imagePath={creature.imagePath} campaignName={campaignName} size={150} />
                ) : (
                    <NpcAvatar
                        name={creature.name}
                        imageUrl={npcImage}
                        imagePath={creature.imagePath}
                        campaignName={campaignName}
                        onClick={() => {
                            if (isLocalhost || isPlayerSummoned) {
                                onNpcClick(creature, { allowNonLocalhost: true });
                            }
                        }}
                    />
                )}
            </div>
            <div className='creature-name'>
                {creature.type === 'npc' ? (
                    <MonsterNameAutocomplete
                        value={creature.name}
                        onChange={(newVal) => onNameChange(creature.name, newVal)}
                        npcs={campaignNpcs}
                        showBadge={campaignNpcs.some(n => n.name?.toLowerCase() === creature.name?.toLowerCase())}
                    />
                ) : (
                    <span>{creature.name}</span>
                )}
            </div>
            <CreatureHp
                creature={creature}
                isLocalhost={isLocalhost}
                onChange={onHpChange}
                isPlayerSummoned={isPlayerSummoned}
            />
            <div className='creature-initiative'>Initiative&nbsp;
                <input
                    min="0"
                    onBlur={(event) => onInitiativeChange(creature.name, event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.target.blur()
                        }
                    }}
                    type="number"
                    defaultValue={creature.initiative ?? ''}
                    placeholder="Init"
                />
            </div>
            <div className='creature-target'>Target&nbsp;
                <select
                    value={creature.targetName || ''}
                    onChange={(e) => onTargetChange(creature.name, e.target.value)}
                    disabled={creature.type !== 'player' && !isLocalhost && !isPlayerSummoned}
                >
                    <option value="">— No Target —</option>
                    {allCreatures
                        .filter(c => c.name !== creature.name)
                        .map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))
                    }
                    {overlays.length > 0 && (
                        <optgroup label="─── Overlays ───">
                            {overlays.map(o => {
                                const label = o.label || `${SHAPE_LABELS[o.shape] || o.shape} (${o.radiusFt || o.distanceFt || o.sizeFt || 0}ft)`
                                return (
                                    <option key={`overlay-${o.id}`} value={`overlay-${o.id}`}>
                                        {label}
                                    </option>
                                )
                            })}
                        </optgroup>
                    )}
                </select>
            </div>
            <div className='creature-conditions'>
                {creature.conditions?.map(cond => {
                    if (!cond || typeof cond !== 'object') return null;
                    const canRoll = creature.type === 'player' || isLocalhost
                    const condCls = cond.key === 'invisible' ? 'effect-buff' : 'effect-condition'
                    return (
                        <CreatureBadge
                            key={cond.id || cond.key}
                            label={cond.dc ? `${cond.label} DC ${cond.dc}` : cond.label}
                            cls={condCls}
                            tooltip={cond.dc ? `${cond.label}\n\n${CONDITION_DESCRIPTIONS[cond.label] || ''}\n\nDC ${cond.dc} ${getAbilityLabel(cond.ability)}` : (CONDITION_DESCRIPTIONS[cond.label] || cond.label)}
                            onClick={canRoll ? () => onRollConditionSave(creature.name, cond) : undefined}
                            disabled={!canRoll}
                            removable={isLocalhost}
                            onRemove={() => onBreakCondition(creature.name, cond)}
                        />
                    )
                })}
                <ConditionEffectBadges conditions={creature.conditions?.filter(c => c && typeof c === 'object' && c.key) || []} targetEffects={myTargetEffects} creatureName={creature.name} campaignName={campaignName} allCreatures={allCreatures} hasTacticalShift={hasTacticalShift} hasSpeedyOpportunityDisadvantage={hasSpeedyOpportunityDisadvantage} hasSpeedyDifficultTerrainIgnore={hasSpeedyDifficultTerrainIgnore} isLocalhost={isLocalhost} coronaDisadvantage={coronaDisadvantage} characters={characters} activeMapName={mapName} />
                {isLocalhost && (
                    <button
                        className='effect-add-btn'
                        onClick={() => onOpenEffectAdder(creature, 'conditions')}
                        type='button'
                        title='Add condition, effect, or concentration'
                    >
                        <i className='fa-solid fa-wand-magic-sparkles'></i> Add
                    </button>
                )}
                {creature.concentration ? (
                    <CreatureBadge
                        icon='fa-spinner'
                        label={`${creature.concentration.spell} DC ${creature.concentration.dc}`}
                        cls='effect-neutral'
                        tooltip={`Concentration: ${creature.concentration.spell} (DC ${creature.concentration.dc} Constitution)`}
                        onClick={isLocalhost ? () => onRollConcentrationSave(creature.name) : undefined}
                        removable={isLocalhost}
                        onRemove={() => onBreakConcentration(creature.name)}
                    />
                ) : null}
                {allCreatures?.some(c => c.concentration?.spell === "Hunter's Mark" && c.concentration?.target === creature.name) && (() => {
                    const markCreature = allCreatures.find(c => c.concentration?.spell === "Hunter's Mark" && c.concentration?.target === creature.name);
                    return (
                        <CreatureBadge
                            icon='fa-crosshairs'
                            label="Hunter's Mark"
                            cls='effect-neutral'
                            tooltip={`Marked by ${markCreature?.name}`}
                            removable={isLocalhost}
                            onRemove={() => {
                                if (markCreature) {
                                    const concentration = getRuntimeValue(markCreature.name, 'concentration');
                                    if (concentration?.spell === "Hunter's Mark") {
                                        setRuntimeValue(markCreature.name, 'concentration', null, campaignName);
                                    }
                                }
                            }}
                        />
                    );
                })()}
                {isMajestyActive && (
                    <CreatureBadge
                        icon='fa-shield-halved'
                        label={`Majesty DC ${majestyDc}`}
                        cls='effect-buff'
                        tooltip={`Unbreakable Majesty (DC ${majestyDc})\n\nFirst attack per turn that hits forces attacker to make a CHA save or the attack misses.\nClick to deactivate.`}
                        onClick={isLocalhost ? () => clearUnbreakableMajesty(creature.name, campaignName) : undefined}
                        disabled={!isLocalhost}
                        removable={isLocalhost}
                        onRemove={() => clearUnbreakableMajesty(creature.name, campaignName)}
                    />
                )}
                {wildShapeActive && (
                    <CreatureBadge
                        icon='fa-paw'
                        label='Wild Shape'
                        cls='effect-buff'
                        tooltip='Wild Shape: Animal form active — spellcasting blocked, resistance types apply'
                        removable={isLocalhost}
                        onRemove={() => {
                            const buffs = getRuntimeValue(creature.name, 'activeBuffs') || [];
                            const filtered = buffs.filter(b => b.effect !== 'Wild Shape');
                            setRuntimeValue(creature.name, 'activeBuffs', filtered, campaignName);
                        }}
                    />
                )}
                {wrathOfTheSeaActive && (
                    <CreatureBadge
                        icon='fa-water'
                        label='Wrath of the Sea'
                        cls='effect-buff'
                        tooltip='Wrath of the Sea: Ocean spray emanation active — Bonus Action to force CON save or take WIS modifier d6 Cold damage'
                        removable={isLocalhost}
                        onRemove={() => setRuntimeValue(creature.name, 'wrathOfTheSeaActive', false, campaignName)}
                    />
                )}
                {sanctuaryInfo && (
                    <CreatureBadge
                        icon='fa-leaf'
                        label='Sanctuary'
                        cls='effect-buff'
                        tooltip={`Nature's Sanctuary: Half Cover (AC +2), ${sanctuaryInfo.resistance} resistance. Protected by ${sanctuaryInfo.druid}'s Nature's Sanctuary`}
                        removable={isLocalhost}
                        onRemove={() => {
                            const creatures = getRuntimeValue(sanctuaryInfo.druid, 'naturesSanctuaryCreatures', campaignName) || [];
                            const filtered = creatures.filter(c => c !== creature.name);
                            setRuntimeValue(sanctuaryInfo.druid, 'naturesSanctuaryCreatures', filtered, campaignName);
                        }}
                    />
                )}
                {recklessAttackActive && (
                    <CreatureBadge
                        icon='fa-shield-halved'
                        label='Reckless Attack'
                        cls='effect-debuff'
                        tooltip='Reckless Attack: Advantage on Strength attack rolls, attack rolls against you have Advantage'
                        removable={isLocalhost}
                        onRemove={() => {
                            const existingEffects = getRuntimeValue('campaign', 'targetEffects') || [];
                            const filtered = existingEffects.filter(te => !(te.target === creature.name && te.effect === 'reckless_attack'));
                            setRuntimeValue('campaign', 'targetEffects', filtered, campaignName);
                        }}
                    />
                )}
                {myTargetEffects.filter(te => te.effect === 'summoned').map(te => (
                    <CreatureBadge
                        key={`summoned-${te.source}`}
                        icon='fa-hand-sparkles'
                        label={te.source ? `Summoned (${te.source})` : 'Summoned'}
                        cls='effect-summoned'
                        tooltip={te.source ? `Summoned by ${te.source}` : 'Summoned creature'}
                        removable={isLocalhost}
                        onRemove={() => {
                            const effects = getRuntimeValue('campaign', 'targetEffects') || [];
                            const filtered = effects.filter(e => !(e.target === creature.name && e.effect === 'summoned' && e.source === te.source));
                            setRuntimeValue('campaign', 'targetEffects', filtered, campaignName);
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

export default CreatureCard
