/* eslint-disable react/prop-types */
import './char-popup.css'

function CharPopup({ html, onClick }) {
    return (
        <div className="char-popup-overlay">
            <div className="char-popup-modal" dangerouslySetInnerHTML={{ __html: html }} onClick={onClick}></div>
        </div>
    )
}

export default CharPopup
