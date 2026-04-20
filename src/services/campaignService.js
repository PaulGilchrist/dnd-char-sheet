export const getCharacterFolders = async () => {
  try {
    const response = await fetch('/api/characters');
    if (!response.ok) {
      throw new Error('Failed to fetch character folders');
    }
    
    const data = await response.json();
    return data.folders || [];
  } catch (error) {
    console.error('Error fetching character folders:', error);
    return [];
  }
};

export const getCharacterFiles = async (campaign) => {
  try {
    const response = await fetch(`/dnd-char-sheet/characters/${campaign}/.vite-plugin-campaign-list.json`);
    if (!response.ok) {
      throw new Error('Failed to fetch character files');
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching character files:', error);
    return [];
  }
};

export const loadCharacters = async (campaign, characterFiles) => {
  const urls = characterFiles.map(file => `/dnd-char-sheet/characters/${campaign}/${file}`);
  const promises = urls.map(url => fetch(url).then(response => response.json()));
  
  try {
    const data = await Promise.all(promises);
    return data;
  } catch (error) {
    console.error('Error loading characters:', error);
    return [];
  }
};
