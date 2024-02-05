/* eslint-disable react/prop-types */
import './popup.css'

function Popup({ html, onClick }) {
    return (
        <div className="popup-overlay">
            <div className="popup-modal" dangerouslySetInnerHTML={{ __html: html }} onClick={onClick}></div>
        </div>
    )
}

export default Popup
