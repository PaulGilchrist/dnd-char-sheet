/* eslint-disable react/prop-types */

import './char-spell-slots.css'
import CharSpellSlotLevel from './char-spell-slot-level'

function CharSpellSlots({ characterClass, playerStats }) {

    let classLevel = characterClass.class_levels[playerStats.level-1];
    if(!classLevel.spellcasting) {
        let subclass = characterClass.subclasses.find((subclass) => subclass.name === playerStats.subClass)
        classLevel = subclass.class_levels[playerStats.level-3]
    }

    return (
        <div className='levels'>
            <div className='header'><b>Spell Slots</b></div>
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_1 != null && classLevel.spellcasting.spell_slots_level_1 > 0 && <CharSpellSlotLevel level={1} totalSlots={classLevel.spellcasting.spell_slots_level_1} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_2 != null && classLevel.spellcasting.spell_slots_level_2 > 0 && <CharSpellSlotLevel level={2} totalSlots={classLevel.spellcasting.spell_slots_level_2} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_3 != null && classLevel.spellcasting.spell_slots_level_3 > 0 && <CharSpellSlotLevel level={3} totalSlots={classLevel.spellcasting.spell_slots_level_3} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_4 != null && classLevel.spellcasting.spell_slots_level_4 > 0 && <CharSpellSlotLevel level={4} totalSlots={classLevel.spellcasting.spell_slots_level_4} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_5 != null && classLevel.spellcasting.spell_slots_level_5 > 0 && <CharSpellSlotLevel level={5} totalSlots={classLevel.spellcasting.spell_slots_level_5} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_6 != null && classLevel.spellcasting.spell_slots_level_6 > 0 && <CharSpellSlotLevel level={6} totalSlots={classLevel.spellcasting.spell_slots_level_6} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_7 != null && classLevel.spellcasting.spell_slots_level_7 > 0 && <CharSpellSlotLevel level={7} totalSlots={classLevel.spellcasting.spell_slots_level_7} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_8 != null && classLevel.spellcasting.spell_slots_level_8 > 0 && <CharSpellSlotLevel level={8} totalSlots={classLevel.spellcasting.spell_slots_level_8} playerStats={playerStats}></CharSpellSlotLevel>}
            {classLevel.spellcasting != null && classLevel.spellcasting.spell_slots_level_9 != null && classLevel.spellcasting.spell_slots_level_9 > 0 && <CharSpellSlotLevel level={9} totalSlots={classLevel.spellcasting.spell_slots_level_9} playerStats={playerStats}></CharSpellSlotLevel>}
        </div>
    )
}

export default CharSpellSlots
