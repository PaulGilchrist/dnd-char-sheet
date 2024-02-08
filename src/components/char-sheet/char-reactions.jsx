/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../common/popup'

function CharReactions({ allSpells, playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const showPopup = (specialAction) => {
        if (specialAction.details) {
            let html = `<b>${specialAction.name}</b><br/>${specialAction.description}<br/><br/>${specialAction.details}`;
            setPopupHtml(html);
        }
    }
    if (playerStats.spellAbilities && playerStats.spellAbilities.spells.length > 0) {
        let spells = playerStats.spellAbilities.spells.map(spell => {
            let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
            if (spellDetail) {
                return { ...spellDetail, prepared: spell.prepared };
            }
            return { ...spell };
        });
        // Find spells that are reactions and prepared and add them to attacks
        let reactionSpells = spells.filter(spell => spell.casting_time === '1 reaction' && (spell.prepared === 'Always' || spell.prepared === 'Prepared'));
        reactionSpells.forEach(spell => {
            if (!playerStats.reactions.some((reaction) => reaction.name === spell.name)) {
                playerStats.reactions.push({
                    "name": spell.name,
                    "description": spell.desc
                });
            }
        });
    }
    // Add base reactions to reaction list
    if (!playerStats.reactions.find((reaction) => reaction.name === 'Opportunity Attack')) {
        playerStats.reactions.push({ "name": "Opportunity Attack", "description": "Can attack creature that moves out of your reach" });
    }

    return (
        <div>
            <div className='sectionHeader'>Reactions</div>
            {playerStats.reactions.map((reaction) => {
                return <div key={reaction.name}>
                    {popupHtml && (<Popup html={popupHtml} onClick={() => setPopupHtml(null)}></Popup>)}
                    <b className={reaction.details ? "clickable" : ""} onClick={() => showPopup(reaction)}>{reaction.name}:</b> <span dangerouslySetInnerHTML={{ __html: reaction.description }}></span>;
                </div>
            })}
        </div>
    )
}

export default CharReactions
