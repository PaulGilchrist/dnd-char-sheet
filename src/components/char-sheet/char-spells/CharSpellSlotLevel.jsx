  
import './CharSpellSlotLevel.css'
import { setRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js'

function CharSpellSlotLevel({ level, totalSlots, playerStats, campaignName }) {
    const computedCurrent = playerStats?._trackedResources?.[`spell_slots_level_${level}`]?.current ?? totalSlots;
    const storedValue = useRuntimeValue(playerStats.name, `spell_slots_level_${level}`, campaignName);
    const availableSlots = storedValue != null ? storedValue : computedCurrent;

    const handleClick = (event) => {
        if (event.key !== "Tab") {
            if(availableSlots > 0) {
                const newAvailableSlots = availableSlots-1;
                setRuntimeValue(playerStats.name, `spell_slots_level_${level}`, newAvailableSlots, campaignName);
            } else {
                setRuntimeValue(playerStats.name, `spell_slots_level_${level}`, totalSlots, campaignName);
            }
        }
    }

    return (
        <div className='char-spell-slot-level level clickable' onClick={handleClick} onKeyDown={handleClick} tabIndex="0">
            <div className='header'>{level}</div>
            <div className='slots'>
                <div className='row'>
                    <div className={`slot ${totalSlots > 0 && availableSlots >= totalSlots ? 'inactive' : availableSlots < totalSlots ? 'active' : ''}`}></div>
                    <div className={`slot ${totalSlots > 1 && availableSlots >= totalSlots - 1 ? 'inactive' : availableSlots < totalSlots - 1 ? 'active' : ''}`}></div>
                </div>
                <div className='row'>
                    <div className={`slot ${totalSlots > 2 && availableSlots >= totalSlots - 2 ? 'inactive' : availableSlots < totalSlots - 2 ? 'active' : ''}`}></div>
                    <div className={`slot ${totalSlots > 3 && availableSlots >= totalSlots - 3 ? 'inactive' : availableSlots < totalSlots - 3 ? 'active' : ''}`}></div>
                </div>
            </div>
        </div>
    )
}

export default CharSpellSlotLevel
