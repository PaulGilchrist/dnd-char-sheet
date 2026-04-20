import React, { useEffect, useState } from 'react';
import { getCharacterFolders, getCharacterFiles, loadCharacters } from '../../services/campaignService';
import './campaign-selection.css';

function CampaignSelection({ onCampaignSelect }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const folders = await getCharacterFolders();
        setCampaigns(folders);
        setLoading(false);
      } catch (err) {
        setError('Failed to load campaigns. Please ensure character folders exist under ./public/characters');
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleCampaignSelect = async (campaign) => {
    try {
      setLoading(true);
      const characterFiles = await getCharacterFiles(campaign);
      const characters = await loadCharacters(campaign, characterFiles);
      
      if (characters.length > 0) {
        // Store characters in sessionStorage for the App component
        sessionStorage.setItem('currentCampaign', campaign);
        sessionStorage.setItem('characters', JSON.stringify(characters));
        
        // Notify parent to switch views
        if (onCampaignSelect) {
          onCampaignSelect(campaign, characters);
        }
      } else {
        setError(`No characters found in campaign: ${campaign}`);
      }
    } catch (err) {
      setError(`Failed to load campaign ${campaign}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="campaign-selection loading">
        <p>Loading campaigns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-selection error">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div className="campaign-selection">
      <h1>Select a Campaign</h1>
      {campaigns.length === 0 ? (
        <p className="no-campaigns">
          No campaigns found. Please create folders under ./public/characters to get started.
        </p>
      ) : (
        <div className="campaign-list">
          {campaigns.map((campaign) => (
            <button
              key={campaign}
              className="campaign-button"
              onClick={() => handleCampaignSelect(campaign)}
              disabled={loading}
            >
              {campaign}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CampaignSelection;
