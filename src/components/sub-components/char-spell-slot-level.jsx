/* eslint-disable react/prop-types */

import './char-spell-slot-level.css'

function CharSpellSlotLevel({ level, numSlots }) {

    return (
        <div className='level'>
            <div className='header'>{level}</div>
            <div className='slots'>
                <div className='row'>
                    <div className={`slot ${numSlots > 0 ? 'active' : ''}`}></div>
                    <div className={`slot ${numSlots > 1 ? 'active' : ''}`}></div>
                </div>
                <div className='row'>
                    <div className={`slot ${numSlots > 2 ? 'active' : ''}`}></div>
                    <div className={`slot ${numSlots > 3 ? 'active' : ''}`}></div>
                </div>
            </div>
        </div>
    )
}

export default CharSpellSlotLevel
