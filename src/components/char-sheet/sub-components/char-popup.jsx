/* eslint-disable react/prop-types */
import './char-popup.css'

function CharPopup({ html, onClick }) {
    return (
        <div className="char-popup" dangerouslySetInnerHTML={{ __html: html }} onClick={onClick}></div>
    )
}

export default CharPopup
