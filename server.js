// API for saving character changes like Gold, Hit Points, Initiative Order, Inspiration, Classes, Barbarian Rage Points, Bard Inpiration Uses, Cleric Channel Divinity Charges, Fighter Action Surges, Fighter Indomitable Uses, Monk Ki Points, Sorcerer Sorcery Points, Wizard Arcane Recovery Levels, Spell Slots, Spells Prepared
// Changes are cached in memory, and batch persisted to disk (backed up) at a configurable interval
import express from 'express';
import fs from 'fs';
import guid from 'guid'

const PORT = process.env.PORT || 3000;
const persistDataDebounceMilliseconds = 1 * 60 * 1000; // 1 minute in milliseconds

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Connection, Content-Type, Authorization');
    next();
});
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
app.get('/api/:key', (req, res) => {
    const { key } = req.params;
    const storedData = characterChangeData[key];
    if (storedData) {
        res.status(200).json(storedData);
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});
app.post('/api/:key', (req, res) => {
    const { key } = req.params;
    const data = req.body;
    characterChangeData[key] = data;
    res.status(200).json({ message: 'Data stored successfully' });
    if (!saveTimer) {
        saveTimer = setTimeout(() => {
            saveFile();
            clearTimeout(saveTimer);
            saveTimer = null;
        }, persistDataDebounceMilliseconds);
    }
    publish(key, data);
});
app.get('/subscribe', (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    const clientId = guid.create().value;
    const newClient = {
        id: clientId,
        res
    };
    subscribers.push(newClient);
    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        subscribers = subscribers.filter(client => client.id !== clientId);
    });
    console.log(`Current subscriber count = ${subscribers.length}`)
});
const publish = (key, data) => {
    const event = {
        key,
        data
    }
    subscribers.forEach(subscriber => subscriber.res.write(`data: ${JSON.stringify(event)}\n\n`));
}
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

let characterChangeData = {}
let subscribers = [];
readFile(); // Read once at startup
let saveTimer = null;