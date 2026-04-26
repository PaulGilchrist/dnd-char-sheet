/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../common/popup'

function CharCharacterAdvancement({ playerStats }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    const showPopup = (feature) => {
        if(feature.details) {
            let html = `<b>${feature.name}</b><br/>${feature.description}<br/><br/>${feature.details}`;
            setPopupHtml(html);
    }
     }

    const features = playerStats.characterAdvancement || [];
    
    return (
         <div>
             <div className='sectionHeader'>Character Advancement</div>
             {features.map((feature, index) => {
                return <div key={feature.name || `character-advancement-${index}`}>
                     {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}
                     <b className={feature.details ? "clickable" : ""} onClick={() => showPopup(feature)}>{feature.name}:</b> <span dangerouslySetInnerHTML={{ __html: feature.description }}></span>
                 </div>
             })}
         </div>
     )
}

export default CharCharacterAdvancement