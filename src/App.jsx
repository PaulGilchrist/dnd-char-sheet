import React from 'react'
import './App.css'
import CharSheet from './components/char-sheet'

function App() {
    const [activeCharacter, setActiveCharacter] = React.useState(null);
    const [characters, setCharacters] = React.useState([]);
    const [classes, setClasses] = React.useState([]);
    const [equipment, setEquipment] = React.useState([]);
    const [showButton, setShowButton] = React.useState(false);
    const [spells, setSpells] = React.useState([]);
    const inputRef = React.useRef(null);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/classes.json')
            .then(response => response.json())
            .then(data => {
                setClasses(data);                
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/equipment.json')
            .then(response => response.json())
            .then(data => {
                setEquipment(data);
            });
    }, []);
    React.useEffect(() => {
        fetch('/dnd-char-sheet/data/spells.json')
            .then(response => response.json())
            .then(data => {
                setSpells(data);
            });
    }, []);
    React.useEffect(() => {
        // Do not allow uploading character until everything is ready
        if (document.readyState === 'complete' && classes.length > 0 && equipment.length > 0 && spells.length > 0) {
            setShowButton(true);
        }
    }, [classes, equipment, spells]);
    const handleCharacterClick = (character) => {
        setActiveCharacter(character);
    }
    const handleUploadChange = async (event) => {
        const files = event.target.files;
        const readers = [];
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.readAsText(files[i]);
            readers.push(reader);
        }
        await Promise.all(
            readers.map(async (reader) => {
                await new Promise((resolve) => {
                    reader.onload = (event) => {
                        const data = JSON.parse(event.target.result);
                        setCharacters((characters) => [...characters, data]);
                        resolve();
                    };
                });
            })
        );
    };
    const handleUploadClick = async () => {
        setActiveCharacter(null);
        setCharacters([]);
        inputRef.current.click();
    };
    if (characters.length > 0 && !activeCharacter) {
        setActiveCharacter(characters[0]);
    }
    return (
        <div>
            <input type="file" accept='.json' multiple ref={inputRef} onChange={handleUploadChange} hidden></input>
            {characters.length > 0 && characters.map((character) => { return (<button key={character.name} className={`no-print ${activeCharacter && activeCharacter.name === character.name ? 'active' : ''}`} onClick={() => handleCharacterClick(character)}>{character.name}</button>) })}
            {showButton && <button className="clickable upload no-print" onClick={handleUploadClick}>Upload Characters</button>}
            {activeCharacter && <CharSheet allClasses={classes} allEquipment={equipment} allSpells={spells} playerStats={activeCharacter}></CharSheet>}
        </div>
    )
}

export default App
