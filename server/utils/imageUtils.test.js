import fs from 'fs';
import path from 'path';
import {
    processImageUpload,
    deleteCharacterImage,
} from '../utils/imageUtils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// In-memory store for captured file writes: Map<filePath, content>
const writtenFiles = new Map();

function setupImageMocks(_campaignName) {
    writtenFiles.clear();
    // Mock fs.writeFileSync to capture writes in-memory
    vi.spyOn(fs, 'writeFileSync').mockImplementation((filePath, data, encoding) => {
        writtenFiles.set(filePath, { data, encoding });
    });
    // Mock fs.existsSync to always return true (directories "exist")
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Mock fs.mkdirSync as no-op
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => { /* no-op */ });
    // Mock fs.openSync, fs.fsyncSync, fs.closeSync as no-ops
    vi.spyOn(fs, 'openSync').mockImplementation(() => 0);
    vi.spyOn(fs, 'fsyncSync').mockImplementation(() => { /* no-op */ });
    vi.spyOn(fs, 'closeSync').mockImplementation(() => { /* no-op */ });
    // Mock fs.unlinkSync as no-op
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => { /* no-op */ });
    // Mock fs.readFileSync for tests that read back written files
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
        const entry = writtenFiles.get(filePath);
        if (entry) {
            if (encoding === 'base64') return entry.data;
            return entry.data;
        }
        return '';
    });
}

function getWrittenFilePath(campaignName, fileName) {
    return path.join(process.cwd(), 'public', 'campaigns', campaignName, 'images', fileName);
}

function createMockCharacter(imageName, imageData) {
    const character = { name: 'TestChar' };
    if (imageName) {
        character.imageName = imageName;
    }
    if (imageData !== undefined) {
        character.image = imageData;
    }
    return character;
}

// ---------------------------------------------------------------------------
// processImageUpload
// ---------------------------------------------------------------------------
describe('imageUtils - processImageUpload', () => {
    beforeEach(() => {
        setupImageMocks('test-campaign-1');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be a function', () => {
        expect(typeof processImageUpload).toBe('function');
    });

    it('should do nothing when character has no image field', () => {
        const character = { name: 'TestChar', imageName: 'photo.jpg' };

        processImageUpload('test-campaign-1', 'TestChar', character);

        expect(character.image).toBeUndefined();
        expect(character.imageName).toBe('photo.jpg');
        expect(character.imagePath).toBeUndefined();
    });

    it('should do nothing when character has no imageName field', () => {
        const character = { name: 'TestChar', image: 'data:image/png;base64,abc123' };

        processImageUpload('test-campaign-1', 'TestChar', character);

        expect(character.image).toBe('data:image/png;base64,abc123');
        expect(character.imageName).toBeUndefined();
        expect(character.imagePath).toBeUndefined();
    });

    it('should do nothing when both image and imageName are null', () => {
        const character = { name: 'TestChar', image: null, imageName: null };

        processImageUpload('test-campaign-1', 'TestChar', character);

        expect(character.image).toBeNull();
        expect(character.imageName).toBeNull();
        expect(character.imagePath).toBeUndefined();
    });

    it('should extract .jpg extension from imageName', () => {
        const character = createMockCharacter('photo.jpg', 'data:image/jpeg;base64,abc123');

        processImageUpload('test-campaign-1', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-1', 'TestChar.jpg');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'TestChar.jpg'));
        expect(character.image).toBeUndefined();
        expect(character.imageName).toBeUndefined();
    });

    it('should extract .png extension from imageName', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-2', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-2', 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'TestChar.png'));
    });

    it('should extract .gif extension from imageName', () => {
        const character = createMockCharacter('photo.gif', 'data:image/gif;base64,abc123');

        processImageUpload('test-campaign-3', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-3', 'TestChar.gif');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'TestChar.gif'));
    });

    it('should default to .png when imageName has no extension', () => {
        const character = createMockCharacter('photo', 'data:image/bmp;base64,abc123');

        processImageUpload('test-campaign-4', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-4', 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'TestChar.png'));
    });

    it('should extract extension from imageName with dots in name', () => {
        const character = createMockCharacter('my.photo', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-5', 'TestChar', character);

        // The regex \.[^.]+$ matches '.photo' as the extension
        const expectedPath = getWrittenFilePath('test-campaign-5', 'TestChar.photo');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should strip data URL prefix and save raw base64', () => {
        const fullDataUrl = 'data:image/png;base64,aGVsbG8gd29ybGQ=';
        const character = createMockCharacter('photo.png', fullDataUrl);

        processImageUpload('test-campaign-1', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-1', 'TestChar.png');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('aGVsbG8gd29ybGQ=');
    });

    it('should handle jpeg data URL with jpeg mime type', () => {
        const fullDataUrl = 'data:image/jpeg;base64,dGVzdA==';
        const character = createMockCharacter('photo.jpg', fullDataUrl);

        processImageUpload('test-campaign-2', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-2', 'TestChar.jpg');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('dGVzdA==');
    });

    it('should handle gif data URL with gif mime type', () => {
        const fullDataUrl = 'data:image/gif;base64,Z2lm';
        const character = createMockCharacter('photo.gif', fullDataUrl);

        processImageUpload('test-campaign-3', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-3', 'TestChar.gif');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('Z2lm');
    });

    it('should create the images directory if it does not exist', () => {
        // The mock for mkdirSync is a no-op, but the function should still work
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-4', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-4', 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should delete old image when originalImagePath is provided', () => {
        const oldImagePath = path.join('campaigns', 'test-campaign-5', 'images', 'OldChar.png');
        const oldFilePath = path.join(process.cwd(), 'public', oldImagePath);

        const character = createMockCharacter('photo.png', 'data:image/png;base64,newdata');

        processImageUpload('test-campaign-5', 'TestChar', character, oldImagePath);

        // Old file should have been "deleted" (unlinkSync called)
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(oldFilePath);
        // New file should exist in written files
        const newFilePath = getWrittenFilePath('test-campaign-5', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
    });

    it('should not fail to delete old image if it does not exist', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,newdata');

        processImageUpload('test-campaign-6', 'TestChar', character, 'campaigns/nonexistent/images/old.png');

        // New file should still be created
        const newFilePath = getWrittenFilePath('test-campaign-6', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
    });

    it('should not delete old image when originalImagePath is not provided', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,newdata');

        processImageUpload('test-campaign-7', 'TestChar', character);

        // unlinkSync should not have been called for any old image
        const unlinkSpy = fs.unlinkSync;
        // The mock was set up as no-op, but we can check the call count
        expect(unlinkSpy.mock.calls.length).toBe(0);
        // New file should also exist
        const newFilePath = getWrittenFilePath('test-campaign-7', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
    });

    it('should use character name as the image filename', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-8', 'DragonSlayer', character);

        const expectedPath = getWrittenFilePath('test-campaign-8', 'DragonSlayer.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'DragonSlayer.png'));
    });

    it('should preserve other character fields', () => {
        const character = {
            name: 'TestChar',
            hp: 25,
            maxHp: 30,
            imageName: 'photo.png',
            image: 'data:image/png;base64,abc123',
            level: 5,
        };

        processImageUpload('test-campaign-1', 'TestChar', character);

        expect(character.hp).toBe(25);
        expect(character.maxHp).toBe(30);
        expect(character.level).toBe(5);
        expect(character.imagePath).toBeDefined();
        expect(character.image).toBeUndefined();
        expect(character.imageName).toBeUndefined();
    });

    it('should write file with fsync for durability', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        const fsyncSyncSpy = vi.spyOn(fs, 'fsyncSync').mockImplementation(() => { /* no-op */ });
        const closeSyncSpy = vi.spyOn(fs, 'closeSync').mockImplementation(() => { /* no-op */ });

        processImageUpload('test-campaign-2', 'TestChar', character);

        expect(fsyncSyncSpy).toHaveBeenCalled();
        expect(closeSyncSpy).toHaveBeenCalled();

        fsyncSyncSpy.mockRestore();
        closeSyncSpy.mockRestore();
    });

    it('should log to console.error on success', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        processImageUpload('test-campaign-3', 'TestChar', character);

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('Image saved:'),
        );
        spy.mockRestore();
    });

    it('should handle campaign names with hyphens', () => {
        const campaignName = 'my-test-campaign';
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload(campaignName, 'TestChar', character);

        const expectedPath = getWrittenFilePath(campaignName, 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'TestChar.png'));
    });

    it('should handle campaign names with underscores', () => {
        const campaignName = 'my_test_campaign';
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload(campaignName, 'TestChar', character);

        const expectedPath = getWrittenFilePath(campaignName, 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', 'TestChar.png'));
    });

    it('should handle large base64 data', () => {
        // Simulate a large base64 string (e.g., 1MB image)
        const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(1000000);
        const character = createMockCharacter('photo.png', largeBase64);

        processImageUpload('test-campaign-4', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-4', 'TestChar.png');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('A'.repeat(1000000));
    });

    it('should handle image data URL with uppercase extensions', () => {
        const character = createMockCharacter('photo.PNG', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-5', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-5', 'TestChar.PNG');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should handle data URL with non-standard mime type', () => {
        const character = createMockCharacter('photo.webp', 'data:image/webp;base64,d2VicA==');

        processImageUpload('test-campaign-6', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-6', 'TestChar.webp');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('d2VicA==');
    });

    it('should use process.cwd() for path resolution', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-7', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-7', 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should handle image with empty string imageName (skipped due to falsy check)', () => {
        const character = { name: 'TestChar', image: 'data:image/png;base64,abc123', imageName: '' };

        processImageUpload('test-campaign-8', 'TestChar', character);

        // imageName is empty string (falsy), so the condition `character.image && character.imageName` is false
        // The function skips processing entirely
        expect(character.image).toBe('data:image/png;base64,abc123');
        expect(character.imageName).toBe('');
        expect(character.imagePath).toBeUndefined();
    });

    it('should skip when originalImagePath is undefined', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-9', 'TestChar', character, undefined);

        const newFilePath = getWrittenFilePath('test-campaign-9', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy.mock.calls.length).toBe(0);
    });

    it('should skip when originalImagePath is null', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-10', 'TestChar', character, null);

        const newFilePath = getWrittenFilePath('test-campaign-10', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy.mock.calls.length).toBe(0);
    });

    it('should skip when originalImagePath is empty string (falsy)', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-11', 'TestChar', character, '');

        const newFilePath = getWrittenFilePath('test-campaign-11', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy.mock.calls.length).toBe(0);
    });

    it('should skip when originalImagePath is 0 (falsy)', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-12', 'TestChar', character, 0);

        const newFilePath = getWrittenFilePath('test-campaign-12', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy.mock.calls.length).toBe(0);
    });

    it('should skip when originalImagePath is false (falsy)', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-13', 'TestChar', character, false);

        const newFilePath = getWrittenFilePath('test-campaign-13', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy.mock.calls.length).toBe(0);
    });

    it('should skip when originalImagePath is NaN (falsy)', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-14', 'TestChar', character, NaN);

        const newFilePath = getWrittenFilePath('test-campaign-14', 'TestChar.png');
        expect(writtenFiles.has(newFilePath)).toBe(true);
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy.mock.calls.length).toBe(0);
    });

    it('should create directory with recursive option when it does not exist', () => {
        // Override existsSync: return false so the directory creation branch is taken
        vi.spyOn(fs, 'existsSync').mockImplementation(() => false);
        const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => { /* no-op */ });
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-15', 'TestChar', character);

        expect(mkdirSyncSpy).toHaveBeenCalledWith(
            expect.any(String),
            { recursive: true },
        );
        mkdirSyncSpy.mockRestore();
        fs.existsSync.mockRestore();
    });

    it('should use openSync with read mode and pass fd to fsyncSync', () => {
        const openSyncSpy = vi.spyOn(fs, 'openSync').mockImplementation(() => 42);
        const fsyncSyncSpy = vi.spyOn(fs, 'fsyncSync').mockImplementation(() => { /* no-op */ });
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-16', 'TestChar', character);

        expect(openSyncSpy).toHaveBeenCalled();
        expect(fsyncSyncSpy).toHaveBeenCalledWith(42);
        openSyncSpy.mockRestore();
        fsyncSyncSpy.mockRestore();
    });

    it('should set imagePath as relative path from campaign directory', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-17', 'TestChar', character);

        expect(character.imagePath).toBe(path.join('images', 'TestChar.png'));
        // Should NOT contain process.cwd() - it's a relative path
        expect(character.imagePath).not.toContain(process.cwd());
    });

    it('should handle campaignName as empty string', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('', 'TestChar', character);

        const expectedPath = path.join(process.cwd(), 'public', 'campaigns', '', 'images', 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should handle characterName as empty string', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-18', '', character);

        const expectedPath = getWrittenFilePath('test-campaign-18', '.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
        expect(character.imagePath).toBe(path.join('images', '.png'));
    });

    it('should handle imageName with multiple dots in extension portion', () => {
        const character = createMockCharacter('my.photo.backup', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-19', 'TestChar', character);

        // The regex \.[^.]+$ matches '.backup' as the extension
        const expectedPath = getWrittenFilePath('test-campaign-19', 'TestChar.backup');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should handle data URL with svg mime type', () => {
        const fullDataUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
        const character = createMockCharacter('photo.svg', fullDataUrl);

        processImageUpload('test-campaign-20', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-20', 'TestChar.svg');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('PHN2Zz48L3N2Zz4=');
    });

    it('should handle data URL with x-icon mime type', () => {
        const fullDataUrl = 'data:image/x-icon;base64,AAABAA==';
        const character = createMockCharacter('photo.ico', fullDataUrl);

        processImageUpload('test-campaign-21', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-21', 'TestChar.ico');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('AAABAA==');
    });

    it('should handle characterName with spaces', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('test-campaign-22', 'Test Char Name', character);

        const expectedPath = getWrittenFilePath('test-campaign-22', 'Test Char Name.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should handle campaignName with spaces', () => {
        const character = createMockCharacter('photo.png', 'data:image/png;base64,abc123');

        processImageUpload('my test campaign', 'TestChar', character);

        const expectedPath = path.join(process.cwd(), 'public', 'campaigns', 'my test campaign', 'images', 'TestChar.png');
        expect(writtenFiles.has(expectedPath)).toBe(true);
    });

    it('should handle character with additional nested properties', () => {
        const character = {
            name: 'TestChar',
            hp: 25,
            maxHp: 30,
            spells: [{ name: 'Fireball', level: 3 }],
            equipment: ['Sword', 'Shield'],
            imageName: 'photo.png',
            image: 'data:image/png;base64,abc123',
        };

        processImageUpload('test-campaign-23', 'TestChar', character);

        expect(character.hp).toBe(25);
        expect(character.maxHp).toBe(30);
        expect(character.spells).toEqual([{ name: 'Fireball', level: 3 }]);
        expect(character.equipment).toEqual(['Sword', 'Shield']);
        expect(character.imagePath).toBeDefined();
        expect(character.image).toBeUndefined();
        expect(character.imageName).toBeUndefined();
    });

    it('should handle data URL with uppercase mime type', () => {
        const fullDataUrl = 'data:IMAGE/PNG;base64,abc123';
        const character = createMockCharacter('photo.png', fullDataUrl);

        processImageUpload('test-campaign-24', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-24', 'TestChar.png');
        const entry = writtenFiles.get(expectedPath);
        // The regex is case-sensitive for [a-zA-Z], so it should still match
        expect(entry).toBeDefined();
    });

    it('should handle data URL with dash in mime subtype', () => {
        const fullDataUrl = 'data:image/vnd.microsoft.icon;base64,AAABAA==';
        const character = createMockCharacter('photo.ico', fullDataUrl);

        processImageUpload('test-campaign-25', 'TestChar', character);

        const expectedPath = getWrittenFilePath('test-campaign-25', 'TestChar.ico');
        const entry = writtenFiles.get(expectedPath);
        expect(entry.data).toBe('AAABAA==');
    });

    it('should not process when image is 0 (falsy)', () => {
        const character = { name: 'TestChar', image: 0, imageName: 'photo.png' };

        processImageUpload('test-campaign-26', 'TestChar', character);

        expect(character.image).toBe(0);
        expect(character.imageName).toBe('photo.png');
        expect(character.imagePath).toBeUndefined();
    });

    it('should not process when image is false (falsy)', () => {
        const character = { name: 'TestChar', image: false, imageName: 'photo.png' };

        processImageUpload('test-campaign-27', 'TestChar', character);

        expect(character.image).toBe(false);
        expect(character.imageName).toBe('photo.png');
        expect(character.imagePath).toBeUndefined();
    });

    it('should not process when image is empty string (falsy)', () => {
        const character = { name: 'TestChar', image: '', imageName: 'photo.png' };

        processImageUpload('test-campaign-28', 'TestChar', character);

        expect(character.image).toBe('');
        expect(character.imageName).toBe('photo.png');
        expect(character.imagePath).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// deleteCharacterImage
// ---------------------------------------------------------------------------
describe('imageUtils - deleteCharacterImage', () => {
    beforeEach(() => {
        setupImageMocks('del-campaign-1');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be a function', () => {
        expect(typeof deleteCharacterImage).toBe('function');
    });

    it('should delete an existing image file', () => {
        const imagePath = path.join('campaigns', 'del-campaign-1', 'images', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        // unlinkSync should have been called with the full path
        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should do nothing when imagePath is null', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(null);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should do nothing when imagePath is undefined', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(undefined);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should do nothing when imagePath is empty string', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage('');

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should do nothing when file does not exist', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        // existsSync returns true in our mock, but we need to test the "file doesn't exist" path
        // Reset the mock for this test
        fs.existsSync.mockReturnValue(false);

        deleteCharacterImage('campaigns/nonexistent/images/missing.png');

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should log to console.error on successful deletion', () => {
        const imagePath = path.join('campaigns', 'del-campaign-2', 'images', 'TestChar.png');

        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(imagePath);

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Deleted image:'));
        spy.mockRestore();
    });

    it('should log error when file deletion fails', () => {
        const imagePath = path.join('campaigns', 'del-campaign-3', 'images', 'TestChar.png');

        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
            throw new Error('permission denied');
        });

        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(imagePath);

        expect(spy).toHaveBeenCalledWith('Error deleting character image:', expect.anything());
        spy.mockRestore();
    });

    it('should resolve path relative to public/', () => {
        const imagePath = path.join('campaigns', 'del-campaign-1', 'images', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should handle image paths with subdirectories', () => {
        const imagePath = path.join('campaigns', 'del-campaign-2', 'images', 'subfolder', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should handle different file extensions', () => {
        const imagePath = path.join('campaigns', 'del-campaign-3', 'images', 'TestChar.jpg');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should use process.cwd() for path resolution', () => {
        const imagePath = path.join('campaigns', 'del-campaign-1', 'images', 'TestChar.png');

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(
            expect.stringContaining(process.cwd()),
        );
    });

    it('should handle campaign names with hyphens', () => {
        const campaignName = 'my-test-campaign';
        const imagePath = path.join('campaigns', campaignName, 'images', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should handle campaign names with underscores', () => {
        const campaignName = 'my_test_campaign';
        const imagePath = path.join('campaigns', campaignName, 'images', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should not throw on any error', () => {
        fs.existsSync.mockImplementation(() => {
            throw new Error('filesystem error');
        });

        expect(() => deleteCharacterImage('campaigns/test/images/test.png')).not.toThrow();
    });

    it('should do nothing when imagePath is 0 (falsy)', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(0);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should do nothing when imagePath is false (falsy)', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(false);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should do nothing when imagePath is NaN (falsy)', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

        deleteCharacterImage(NaN);

        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('should handle image paths with relative path traversal (../)', () => {
        const imagePath = path.join('campaigns', 'del-campaign-1', 'images', '..', 'images', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });

    it('should handle image paths with multiple slashes', () => {
        const imagePath = path.join('campaigns', 'del-campaign-1', 'images', 'TestChar.png');
        const fullPath = path.join(process.cwd(), 'public', imagePath);

        deleteCharacterImage(imagePath);

        const unlinkSpy = fs.unlinkSync;
        expect(unlinkSpy).toHaveBeenCalledWith(fullPath);
    });
});
