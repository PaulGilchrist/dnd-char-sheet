import express  from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON data
app.use(express.json());

// In-memory storage (you can replace this with a database)
const dataStore = {};

// Endpoint to receive and store JSON data
app.post('/set/:key', (req, res) => {
    const { key } = req.params;
    const data = req.body;
    dataStore[key] = data;
    res.status(200).json({ message: 'Data stored successfully' });
});

// Endpoint to retrieve JSON data based on a key
app.get('/get/:key', (req, res) => {
    const { key } = req.params;
    const storedData = dataStore[key];
    if (storedData) {
        res.status(200).json(storedData);
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});