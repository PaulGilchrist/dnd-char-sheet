/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../common/popup'
import './char-inventory.css'

function CharInventory({ playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    
    const handleItemClick = (itemName) => {
        const equipmentUrl = '/dnd-char-sheet/data/equipment.json';
        
        console.log(`[CharInventory] Fetching equipment from: ${equipmentUrl}`);
        
        fetch(equipmentUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(equipmentData => {
                console.log(`[CharInventory] Loaded ${equipmentData.length} items`);
                // Normalize item name: convert to lowercase and replace spaces with hyphens for matching
                const normalizedInput = itemName.toLowerCase().replace(/\s+/g, '-');
                const item = equipmentData.find(f => {
                    const normalizedName = (f.name || '').toLowerCase().replace(/\s+/g, '-');
                    const normalizedIndex = (f.index || '').toLowerCase().replace(/\s+/g, '-');
                    return normalizedName === normalizedInput || normalizedIndex === normalizedInput;
                });
                if (item) {
                    console.log(`[CharInventory] Found item: ${item.name}`);
                    let descriptionHtml = '';
                    if (Array.isArray(item.desc)) {
                        descriptionHtml = item.desc.map(desc => desc || '').join('<br/><br/>');
                    }
                    let html = `<b>${item.name}</b><br/>${descriptionHtml}`;
                    
                    const properties = [];
                    if(item.cost) {
                        properties.push(`<b>Cost:</b> ${item.cost.quantity} ${item.cost.unit}`);
                    }
                    if(item.weight) {
                        properties.push(`<b>Weight:</b> ${item.weight}`);
                    }
                    if(item.equipment_category) {
                        properties.push(`<b>Category:</b> ${item.equipment_category}`);
                    }
                    
                    if(properties.length > 0) {
                        html += `<br/>${properties.join('<br/>')}`;
                    }
                    
                    setPopupHtml(html);
                } else {
                    console.warn(`[CharInventory] Item not found: ${itemName} (normalized: ${normalizedInput})`);
                    setPopupHtml(`<b>${itemName}</b><br/><br/>Item details not found in database.`);
                }
            })
            .catch(error => {
                console.error(`[CharInventory] Error loading equipment:`, error);
                setPopupHtml(`<b>${itemName}</b><br/><br/>Error loading item details: ${error.message}. Check browser console for more details.`);
            });
    };
    
    const renderItems = (items, title) => {
        if (!items || items.length === 0) {
            return null;
        }
        return (
            <div>
                <b>{title}:</b> {items.map((item, index) => (
                    <span key={index} className="clickable" onClick={() => handleItemClick(item)}>
                        {item}
                        {index < items.length - 1 ? ', ' : ''}
                    </span>
                ))}
            </div>
        );
    };
    
    return (
        <div>
            {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}
            {playerStats.inventory.magicItems && <div>
                <div className='sectionHeader'>Magic Items</div>
                {playerStats.inventory.magicItems.map((magicItem) => {
                    return <div key={magicItem.name+magicItem.rarity}>
                        <b>
                            {magicItem.name} {magicItem.quantity ? `(qty ${magicItem.quantity}) ` : '' } -&nbsp;
                            <i>
                                {magicItem.type}
                                {magicItem.subtype && <span>&nbsp;({magicItem.subtype})</span>}, {magicItem.rarity}
                                {magicItem.requiresAttunement && !magicItem.attunementRequirements && <span> (requires attunement)</span>}
                                {magicItem.requiresAttunement && magicItem.attunementRequirements && <span> ({magicItem.attunementRequirements})</span>}
                            </i>
                            :&nbsp;
                        </b>
                        <span dangerouslySetInnerHTML={{ __html: magicItem.description }}></span>
                    </div>}
                )}
                <br/>
            </div>}
            {renderItems(playerStats.inventory.equipped, 'Equipped')}
            {renderItems(playerStats.inventory.backpack, 'Backpack')}
        </div>
    )
}

export default CharInventory
