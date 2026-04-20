import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { saveAs } from 'file-saver';
import './App.css'
import CharSheet from './components/char-sheet/char-sheet'
import CombatTracking from './components/combat-tracking/combat-tracking'
import CampaignSelection from './components/campaign-selection/campaign-selection'
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
        setCharacters(loadedCharacters);
        setShowCampaignSelection(false);
        if (loadedCharacters.length > 0) {
            setActiveCharacter(cloneDeep(loadedCharacters[0]));
        }
    };

    const handleAddCharacter = () => {
        // Create a new character object
        const newCharacter = {
            name: '',
            class: { name: '' },
            race: { name: '' },
            abilities: {},
            gold: 0,
            hitPoints: 0,
            initiative: 0,
            inspiration: false,
            spellAbilities: {
                spells: [],
                maxPreparedSpells: 0
            },
            rules: '2024'
        };
        
        setActiveCharacter(cloneDeep(newCharacter));
        setShowAddCharacterModal(false);
    };

    const closeModal = () => {
        setShowAddCharacterModal(false);
    };

    let combatTrackingActive = characters.length > 0 && activeCharacter == null;

    // Show campaign selection if no characters are loaded
    if (showCampaignSelection || characters.length === 0) {
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
            {showButton && <button className="clickable mutted no-print" onClick={handleUploadClick}>Upload Characters</button>}
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
            {activeCharacter && <button className="clickable download no-print" onClick={handleSaveClick}>Download</button>}
            {characters.length > 0 && activeCharacter != null && (
                <button className="clickable mutted no-print" onClick={handleInitiativeClick}>Combat</button>
            )}
            <button className="clickable mutted no-print" onClick={() => setShowCampaignSelection(true)}>Back to Campaigns</button>
            <br />
        </div>
    )
}

export default App