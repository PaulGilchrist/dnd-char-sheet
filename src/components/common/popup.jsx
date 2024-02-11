/* eslint-disable react/prop-types */
import './popup.css'

function Popup({ html, onClickOrKeyDown }) {
    const handleOnClickOrKeyDown = () => {
        document.removeEventListener("keydown", handleOnClickOrKeyDown);
        onClickOrKeyDown();
    };
    document.addEventListener("keydown", handleOnClickOrKeyDown); // Close 
    return (
        <div className="popup-overlay" onClick={handleOnClickOrKeyDown}>
            <div className="popup-modal" dangerouslySetInnerHTML={{ __html: html }}></div>
        </div>
    )
}

export default Popup
