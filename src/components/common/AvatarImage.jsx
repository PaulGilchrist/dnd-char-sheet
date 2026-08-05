

import { useState } from 'react';

function AvatarImage({ name, imagePath, size = 60, onClick, campaignName }) {
    const [failed, setFailed] = useState(false);
    const cursorStyle = onClick ? { cursor: 'pointer' } : {};
    const src = imagePath && imagePath.startsWith('http') ? imagePath : (campaignName && imagePath ? `campaigns/${campaignName}/${imagePath}` : imagePath);
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const hasImage = !!src && !failed;

    return (
        <div className={`avatar-wrapper ${hasImage ? '' : 'avatar-initial'}`} style={{ width: size, height: size, fontSize: hasImage ? '' : size * 0.4, ...cursorStyle }} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}>
            {hasImage ? (
                <img src={src} alt={name} className="avatar-image" onError={() => setFailed(true)} />
            ) : (
                <span>{initial}</span>
            )}
        </div>
    );
}

export default AvatarImage
