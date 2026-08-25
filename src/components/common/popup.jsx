 
import { useCallback } from 'react';
import { sanitizeHtml } from '../../services/ui/sanitize.js';
import { isInteractive } from '../../services/ui/modalDismissUtils.js';
import './popup.css'

function Popup({ html, children, onClickOrKeyDown }) {
    const handleOverlayClick = useCallback((e) => {
        if (e.target.closest('.popup-modal')) return;
        onClickOrKeyDown?.();
    }, [onClickOrKeyDown]);

    const handleModalClick = useCallback((e) => {
        if (isInteractive(e.target)) return;
        onClickOrKeyDown?.();
    }, [onClickOrKeyDown]);

    return (
        <div className="popup-overlay" data-testid="popup-overlay" role="presentation" onClick={handleOverlayClick}>
             <div className="popup-modal" onClick={handleModalClick}>
                  {html ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}></div> : children}
              </div>
        </div>
    );
}

export default Popup