/* eslint-disable react/prop-types */
import React from 'react'
import Popup from '../../common/popup'
import './char-feats.css'

function CharFeats({ playerStats, showPopup }) {
    const [popupHtml, setPopupHtml] = React.useState(null);
    
    const handleFeatClick = (featName) => {
        // Load feats from appropriate JSON file based on rules version
        const rulesVersion = playerStats.rules || '5e';
        const featsFile = rulesVersion === '2024' ? '2024/feats.json' : 'feats.json';
        const featsUrl = `/data/${featsFile}`;
        
        fetch(featsUrl)
            .then(response => response.json())
            .then(featsData => {
                const feat = featsData.find(f => f.name === featName || f.index === featName);
                if (feat) {
                    showPopup(feat);
                } else {
                    console.warn(`[CharFeats] Feat not found: ${featName}`);
                    setPopupHtml(`<b>${featName}</b><br/><br/>Feat details not found in database.`);
                }
            })
            .catch(error => {
                console.error(`[CharFeats] Error loading feats:`, error);
                setPopupHtml(`<b>${featName}</b><br/><br/>Error loading feat details.`);
            });
    };
    
    if (!playerStats.feats || playerStats.feats.length === 0) {
        return null;
    }
    
    return (
        <div className="char-feats-section">
            {popupHtml && (<Popup html={popupHtml} onClickOrKeyDown={() => setPopupHtml(null)}></Popup>)}
            <div className="feats-container">
                <b>Feats: </b>
                {playerStats.feats.map((featName, index) => (
                    <span key={index} className="feat-name clickable" onClick={() => handleFeatClick(featName)}>
                        {featName}
                        {index < playerStats.feats.length - 1 ? ', ' : ''}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default CharFeats