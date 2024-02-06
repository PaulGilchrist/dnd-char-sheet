/* eslint-disable react/prop-types */

function CharReactions({ allSpells, playerStats }) {
    if(playerStats.spells && playerStats.spells.length > 0) {
        let spells = playerStats.spells.map(spell => {
            let spellDetail = allSpells.find((spellDetail) => spellDetail.name === spell.name);
            if(spellDetail) {
                return {...spellDetail, prepared: spell.prepared};
            }
            return {...spell};
        });
        // Find spells that are reactions and prepared and add them to attacks
        let reactionSpells = spells.filter(spell => spell.casting_time === '1 reaction' && spell.prepared);
        reactionSpells.forEach(spell => {
            if(!playerStats.reactions.find((reaction) => reaction.name === spell.name)) {
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
                const html = `<b>${reaction.name}:</b> ${reaction.description}`;
                return <div key={reaction.name} dangerouslySetInnerHTML={{ __html: html }}></div>;
            })}
        </div>
    )
}

export default CharReactions
