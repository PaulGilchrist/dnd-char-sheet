/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../common/popup'

function CharSpecialActions({ playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const showPopup = (specialAction) => {
        if(specialAction.details) {
            let html = `<b>${specialAction.name}</b><br/>${specialAction.description}<br/><br/>${specialAction.details}`;
            setPopupHtml(html);
        }
    }
    // Add fighting style special actions
    if(playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Great Weapon Fighting') && !playerStats.specialActions.find((specialAction) => specialAction.name === 'Great Weapon Fighting')) {
        playerStats.specialActions.push({ "name": "Great Weapon Fighting", "description": "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have the two-handed or versatile property for you to gain this benefit." });
    } else if(playerStats.class.fightingStyles && playerStats.class.fightingStyles.includes('Protection') && !playerStats.specialActions.find((specialAction) => specialAction.name === 'Protection')) {
        playerStats.specialActions.push({ "name": "Protection", "description": "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield." });
    }
   
    return (
        <div>
            <div className='sectionHeader'>Special Actions</div>
            {playerStats.specialActions.map((specialAction) => {
                return <div key={specialAction.name}>
                    {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}        
                    <b className={specialAction.details ? "clickable" : ""} onClick={() => showPopup(specialAction)}>{specialAction.name}:</b> <span dangerouslySetInnerHTML={{ __html: specialAction.description }}></span>
                </div>
            })}
        </div>
    )
}

export default CharSpecialActions
