// API for saving character changes like Gold, Hit Points, Initiative Order, Inspiration, Classes, Barbarian Rage Points, Bard Inpiration Uses, Cleric Channel Divinity Charges, Fighter Action Surges, Fighter Indomitable Uses, Monk Ki Points, Sorcerer Sorcery Points, Wizard Arcane Recovery Levels, Spell Slots, Spells Prepared
// Changes are cached in memory, and batch persisted to disk (backed up) at a configurable interval
import cors from 'cors'
import express from 'express';
import fs from 'fs'

const app = express();
const PORT = process.env.PORT || 3000;
const persistDataDebounceMilliseconds = 5 * 60 * 1000; // 5 minutes in milliseconds

app.use(cors({
    methods: ['GET', 'POST'],
    origin: ['http://localhost:5173', 'https://paulgilchrist.github.io']
}));
app.use(express.json());
const readFile = () => {
    fs.readFile('characterChangeData.json', 'utf-8', (err, data) => {
        if (err) {
            console.log('Character change data file not found');
        } else {
            console.log('Character change data retrieved');
            characterChangeData = JSON.parse(data.toString());
        }
    });
}
const saveFile = () => {
    const data = JSON.stringify(characterChangeData);
    fs.writeFile('characterChangeData.json', data, (err) => {
        if (err) {
            console.error('Failed to save character change data');
        }
        console.log('Character change data saved');
    });
}
app.get('/:key', (req, res) => {
    const { key } = req.params;
    const storedData = characterChangeData[key];
    if (storedData) {
        res.status(200).json(storedData);
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});
app.post('/:key', (req, res) => {
    const { key } = req.params;
    const data = req.body;
    characterChangeData[key] = data;
    res.status(200).json({ message: 'Data stored successfully' });
    if(!saveTimer) {
        saveTimer = setTimeout(() => {
            saveFile();
            clearTimeout(saveTimer);
            saveTimer = null;
        }, persistDataDebounceMilliseconds);
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

let characterChangeData = {}
readFile(); // Read once at startup
let saveTimer = null;