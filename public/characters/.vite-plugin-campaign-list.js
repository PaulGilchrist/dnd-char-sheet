// This file is not used by Vite directly, but documents the approach
// We need to create a JSON file that lists the campaigns
const fs = require('fs');
const path = require('path');

const charactersDir = path.join(__dirname, 'characters');
const items = fs.readdirSync(charactersDir, { withFileTypes: true });
const folders = items
  .filter(item => item.isDirectory())
  .map(item => item.name)
  .sort();

const outputPath = path.join(__dirname, 'campaigns.json');
fs.writeFileSync(outputPath, JSON.stringify({ folders }));
console.log('Campaign list created:', outputPath);
