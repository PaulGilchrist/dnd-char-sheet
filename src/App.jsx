import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { saveAs } from 'file-saver';
import './App.css'
import CharSheet from './components/char-sheet/char-sheet'
import CombatTracking from './components/combat-tracking/combat-tracking'
import CampaignSelection from './components/campaign-selection/campaign-selection'
import CharacterCreationWizard from './components/character-creation/character-creation-wizard'
import Utils from './services/utils'

function App() {
    const [abilityScores, setAbilityScores] = React.useState(null);
    const [activeCharacter, setActiveCharacter] = React.useState(null);
    const [characters, setCharacters] = React.useState([]);
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
    const [magicItems, setMagicItems] = React.useState([]);
    const [races, setRaces] = React.useState([]);
    const [showButton, setShowButton] = React.useState(false);
    const [spells, setSpells] = React.useState([]);
    const [spells2024, setSpells2024] = React.useState([]);
    const [showCampaignSelection, setShowCampaignSelection] = React.useState(true);
    const [showAddCharacterModal, setShowAddCharacterModal] = React.useState(false);
    const [showCharacterWizard, setShowCharacterWizard] = React.useState(false);
    const inputRef = React.useRef(null);

    useEffect(() => {
        fetch('/dnd-char-sheet/data/ability-scores.json')
            .then(response => response.json())
            .then(data => {
                setAbilityScores(data);
            });
    }, []);
    useEffect(() => {
        fetch('/dnd-char-sheet/data/classes.json')
            .then(response => response.json())
            .then(data => {
                setClasses(data);
            });
    }, []);
    useEffect(() => {
        fetch('/dnd-char-sheet/data/equipment.json')
            .then(response => response.json())
            .then(data => {
                setEquipment(data);
            });
    }, []);
    useEffect(() => {
        fetch('/dnd-char-sheet/data/magic-items.json')
            .then(response => response.json())
            .then(data => {
                setMagicItems(data);
            });
    }, []);
    useEffect(() => {
        fetch('/dnd-char-sheet/data/races.json')
            .then(response => response.json())
            .then(data => {
                setRaces(data);
            });
    }, []);
    useEffect(() => {
        fetch('/dnd-char-sheet/data/spells.json')
            .then(response => response.json())
            .then(data => {
                setSpells(data);
            });
    }, []);
    useEffect(() => {
        fetch('/dnd-char-sheet/data/2024/spells.json')
            .then(response => response.json())
            .then(data => {
                setSpells2024(data);
            });
    }, []);

    useEffect(() => {
        // Check if characters are pre-loaded from campaign selection or URL
        const preloadedCharacters = sessionStorage.getItem('characters');
        
        if (preloadedCharacters) {
            const loadedCharacters = JSON.parse(preloadedCharacters);
            setCharacters(loadedCharacters);
            setShowCampaignSelection(false);
            
            // Clear session storage after loading
            sessionStorage.removeItem('characters');
            
            if (loadedCharacters.length > 0) {
                setActiveCharacter(cloneDeep(loadedCharacters[0]));
            }
            // Don't auto-open wizard here - let handleCampaignSelected handle it
        }
    }, []);

    useEffect(() => {
        // Do not allow uploading character until everything is ready
        if (classes.length > 0 && equipment.length > 0 && spells.length > 0 && spells2024.length > 0) {
            setShowButton(true);
        }
    }, [abilityScores, classes, equipment, spells, spells2024]);

    const handleCharacterClick = (character) => {
        setActiveCharacter(cloneDeep(character));
    }

    const handleInitiativeClick = () => {
        setActiveCharacter(null);
    }

    const handleUploadChange = async (event) => {
        const files = event.target.files;
        const newCharacters = [];
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            const file = files[i];
            const readPromise = new Promise((resolve) => {
                reader.onload = (event) => {
                    const data = JSON.parse(event.target.result);
                    newCharacters.push(data);
                    resolve();
                };
            });
            reader.readAsText(file);
            await readPromise;
        }
        setCharacters(newCharacters);
    };

    const handleSaveClick = async () => {
        let fileName = `${activeCharacter.class.name}-${Utils.getFirstName(activeCharacter.name)}.json`;
        fileName = fileName.toLowerCase();
        const json = JSON.stringify(activeCharacter, null, 4);
        const blob = new Blob([json], { type: 'application/json' });
        saveAs(blob, fileName);
    };

    const handleUploadClick = async () => {
        inputRef.current.click();
    };

    const handleCampaignSelected = (campaign, loadedCharacters) => {
        console.log(`handleCampaignSelected called: campaign='${campaign}', loadedCharacters=`, loadedCharacters);
        console.log(`loadedCharacters.length: ${loadedCharacters.length}`);
        loadedCharacters.forEach((char, index) => {
            console.log(`Character ${index}:`, char?.name || 'NO NAME PROPERTY', 'Full object:', char);
        });
        setCharacters(loadedCharacters);
        setActiveCharacter(null); // Clear active character when switching campaigns
        setShowCampaignSelection(false);
        if (loadedCharacters.length > 0) {
            setActiveCharacter(cloneDeep(loadedCharacters[0]));
        } else {
            // Only auto-open wizard if campaign has no characters at all
            // If campaign has characters, user must click "Add Character" button
            setShowCharacterWizard(true);
        }
    };

    const handleAddCharacter = () => {
        // Open wizard instead of creating empty character
        setShowCharacterWizard(true);
    };

    const closeModal = () => {
        setShowAddCharacterModal(false);
    };

    const handleWizardComplete = async (characterData) => {
        try {
            const campaign = sessionStorage.getItem('currentCampaign');
            if (!campaign) {
                throw new Error('No campaign selected');
            }
            
            // Send POST request to API to save character
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    campaignName: campaign,
                    character: characterData
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save character');
            }

            const result = await response.json();
            
            // Load the newly created character
            setActiveCharacter(cloneDeep(result.character));
            setShowCharacterWizard(false);
            
            // Refresh character list
            const characterFiles = await fetch(`/api/characters/${campaign}`)
                .then(res => res.json())
                .then(data => data.files);
            const newCharacters = await Promise.all(
                characterFiles.map(file => 
                    fetch(`/api/characters/${campaign}/${file}`)
                        .then(res => res.json())
                )
            );
            setCharacters(newCharacters);
        } catch (error) {
            console.error('Error creating character:', error);
            alert('Failed to create character. Please try again.');
        }
    };

    const handleWizardCancel = () => {
        setShowCharacterWizard(false);
    };

    let combatTrackingActive = characters.length > 0 && activeCharacter == null;

    // Show campaign selection if not yet selected
    if (showCampaignSelection) {
        return (
            <CampaignSelection onCampaignSelect={handleCampaignSelected} />
        );
    }

    return (
        <div className="app">
            <input key={Date.now()} type="file" accept='.json' multiple ref={inputRef} onChange={handleUploadChange} hidden></input>
            {characters.length > 0 && characters.map((character) => { 
                return (
                    <button 
                        key={Utils.getFirstName(character.name)} 
                        className={`no-print ${activeCharacter && activeCharacter.name === character.name ? 'active' : ''}`} 
                        onClick={() => handleCharacterClick(character)}
                    >
                        {Utils.getFirstName(character.name)}
                    </button>
                )
            })}
            {showButton && <button className="clickable mutted no-print" onClick={handleAddCharacter}>Add Character</button>}
            {showButton && <button className="clickable mutted no-print hidden" onClick={handleUploadClick}>Upload Characters</button>}
            {activeCharacter != null && (
                <CharSheet 
                    allAbilityScores={abilityScores} 
                    allClasses={classes} 
                    allEquipment={equipment} 
                    allMagicItems={magicItems} 
                    allRaces={races} 
                    allSpells={spells} 
                    allSpells2024={spells2024} 
                    playerSummary={activeCharacter}
                />
            )}
            {combatTrackingActive && <CombatTracking characters={characters} />}
            {activeCharacter && <button className="clickable download no-print hidden" onClick={handleSaveClick}>Download</button>}
            {characters.length > 0 && activeCharacter != null && (
                <button className="clickable mutted no-print" onClick={handleInitiativeClick}>Combat</button>
            )}
            <button className="clickable mutted no-print" onClick={() => setShowCampaignSelection(true)}>Back to Campaigns</button>
            <br />
            {showCharacterWizard && (
                <CharacterCreationWizard 
                    onComplete={handleWizardComplete}
                    onCancel={handleWizardCancel}
                    allRaces={races}
                    allClasses={classes}
                    allSpells={spells}
                    allSpells2024={spells2024}
                />
            )}
        </div>
    )
}

export default App
