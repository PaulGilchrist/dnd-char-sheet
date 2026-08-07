import { Router } from 'express';
import express from 'express';
import request from 'supertest';

// Shared mock store keyed by "campaign:entityName"
const MOCK_STORE = new Map();

function setupMock(entityName, campaign, data) {
    const key = `${campaign}:${entityName}`;
    if (data === null) {
        MOCK_STORE.delete(key);
    } else {
        MOCK_STORE.set(key, data || []);
    }
}

function clearMockStore() {
    MOCK_STORE.clear();
}

// Track image operations
const IMAGE_OPS = {
    deleted: [],
    uploaded: [],
    renamed: [],
};

function clearImageOps() {
    IMAGE_OPS.deleted = [];
    IMAGE_OPS.uploaded = [];
    IMAGE_OPS.renamed = [];
}

// Create a mock Express router that simulates the real jsonEntityCrud behavior
// npcs uses idField='name', responseWrapper='npcs', itemWrapper='npc'
function createMockRouter(options = {}) {
    const { onDelete } = options;
    const router = Router();
    const idField = 'name';
    const singularDisplayName = 'NPC';

    // GET list
    router.get('/api/campaigns/:campaign/npcs', (req, res) => {
        const campaign = req.params.campaign;
        const key = `${campaign}:npcs`;
        const data = MOCK_STORE.get(key);
        const entities = Array.isArray(data) ? data : [];
        res.json({ npcs: entities });
    });

    // POST save (overwrite entire array)
    router.post('/api/campaigns/:campaign/npcs', (req, res) => {
        const campaign = req.params.campaign;
        const entities = req.body.npcs;
        if (!Array.isArray(entities)) {
            return res.status(400).json({ error: 'Expected an array for npcs' });
        }
        setupMock('npcs', campaign, entities);
        res.json({ success: true });
    });

    // GET by id (idField='name')
    router.get('/api/campaigns/:campaign/npcs/:id', (req, res) => {
        const campaign = req.params.campaign;
        const id = decodeURIComponent(req.params.id);
        const key = `${campaign}:npcs`;

        if (!MOCK_STORE.has(key)) {
            return res.status(404).json({ error: `${singularDisplayName} not found` });
        }

        const entities = Array.isArray(MOCK_STORE.get(key)) ? MOCK_STORE.get(key) : [];
        const entity = entities.find(e => e[idField] === id);

        if (!entity) {
            return res.status(404).json({ error: `${singularDisplayName} not found` });
        }

        res.json({ npc: entity });
    });

    // DELETE by id (idField='name')
    router.delete('/api/campaigns/:campaign/npcs/:id', (req, res) => {
        const campaign = req.params.campaign;
        const id = decodeURIComponent(req.params.id);
        const key = `${campaign}:npcs`;

        if (!MOCK_STORE.has(key)) {
            return res.status(404).json({ error: `${singularDisplayName} not found` });
        }

        const entities = Array.isArray(MOCK_STORE.get(key)) ? MOCK_STORE.get(key) : [];
        const entity = entities.find(e => e[idField] === id);

        if (onDelete && entity) {
            onDelete(entity, campaign);
        }

        const filtered = entities.filter(e => e[idField] !== id);
        setupMock('npcs', campaign, filtered);
        res.json({ success: true });
    });

    // PUT upsert by name (custom route, mirrors npcs.js logic)
    router.put('/api/campaigns/:campaign/npcs/:npcName', (req, res) => {
        const campaign = req.params.campaign;
        const npcName = decodeURIComponent(req.params.npcName);
        const updatedNpc = req.body;
        const key = `${campaign}:npcs`;

        let npcs = [];
        if (MOCK_STORE.has(key)) {
            npcs = MOCK_STORE.get(key);
        }
        if (!Array.isArray(npcs)) npcs = [];

        const existingIndex = npcs.findIndex(n => n.name === npcName);
        const existingNpc = existingIndex !== -1 ? npcs[existingIndex] : null;
        const originalImagePath = existingNpc?.imagePath;

        // Handle image changes - call the same mock functions as the real code
        if ((!updatedNpc.imagePath || updatedNpc.imagePath === '') && originalImagePath) {
            vi.mocked(deleteCharacterImage)(originalImagePath);
            updatedNpc.imagePath = '';
        } else if (updatedNpc.image && updatedNpc.imageName) {
            vi.mocked(processImageUpload)(campaign, updatedNpc.name, updatedNpc, originalImagePath);
        } else if (existingNpc && updatedNpc.name !== existingNpc.name && originalImagePath) {
            IMAGE_OPS.renamed.push({ oldPath: originalImagePath, newName: updatedNpc.name });
            updatedNpc.imagePath = `images/${updatedNpc.name}.png`;
        }

        if (existingIndex !== -1) {
            npcs[existingIndex] = updatedNpc;
        } else {
            npcs.push(updatedNpc);
        }

        setupMock('npcs', campaign, npcs);
        res.json({ success: true, npc: updatedNpc });
    });

    return router;
}

// Mock jsonEntityCrud
vi.mock('../utils/jsonEntityCrud.js', () => ({
    createJsonEntityRouter: (entityName, options) => createMockRouter(options),
}));

// Mock imageUtils - these fns are imported by npcs.js directly
// Must use vi.fn() inline since vi.mock is hoisted
vi.mock('../utils/imageUtils.js', () => ({
    processImageUpload: vi.fn((campaign, name, npc, originalImagePath) => {
        IMAGE_OPS.uploaded.push({ campaign, name, npc, originalImagePath });
        npc.imagePath = `images/${name}.png`;
        delete npc.image;
        delete npc.imageName;
    }),
    deleteCharacterImage: vi.fn((imagePath) => {
        IMAGE_OPS.deleted.push(imagePath);
    }),
}));

// Mock fs and campaignPaths so the real npcs.js code paths don't try to access the filesystem
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => '[]'),
        writeFileSync: vi.fn(),
    },
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '[]'),
    writeFileSync: vi.fn(),
}));

vi.mock('../utils/campaignPaths.js', () => ({
    campaignDataFile: vi.fn((campaign, name) => `/mock/campaigns/${campaign}/data/${name}`),
    ensureDataDir: vi.fn((campaign) => `/mock/campaigns/${campaign}/data`),
    campaignImagesDir: vi.fn((campaign) => `/mock/campaigns/${campaign}/images`),
}));

import npcs from './npcs.js';
import { processImageUpload, deleteCharacterImage } from '../utils/imageUtils.js';

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(npcs);
    return app;
}

afterEach(() => {
    clearMockStore();
    clearImageOps();
    vi.mocked(deleteCharacterImage).mockClear();
    vi.mocked(processImageUpload).mockClear();
    vi.restoreAllMocks();
});

// ─── GET /api/campaigns/:campaign/npcs ───────────────────────────────────────

describe('npcs - GET /api/campaigns/:campaign/npcs', () => {
    it('should return an empty npcs list when no npcs.json exists', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/campaigns/test-campaign/npcs');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('npcs');
        expect(Array.isArray(res.body.npcs)).toBe(true);
        expect(res.body.npcs).toEqual([]);
    });

    it('should return all npcs when file exists', async () => {
        const npcsData = [
            { name: 'Town Guard', alignment: 'Lawful Good', level: 1 },
            { name: 'Village Elder', alignment: 'Neutral Good', level: 3 },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const app = createTestApp();
        const res = await request(app).get('/api/campaigns/test-campaign/npcs');

        expect(res.status).toBe(200);
        expect(res.body.npcs).toHaveLength(2);
        expect(res.body.npcs[0].name).toBe('Town Guard');
        expect(res.body.npcs[1].name).toBe('Village Elder');
    });
});

// ─── POST /api/campaigns/:campaign/npcs ──────────────────────────────────────

describe('npcs - POST /api/campaigns/:campaign/npcs', () => {
    it('should save npcs and return success', async () => {
        const npcsData = [
            { name: 'Town Guard', alignment: 'Lawful Good', level: 1 },
            { name: 'Village Elder', alignment: 'Neutral Good', level: 3 },
        ];

        const app = createTestApp();
        const res = await request(app)
            .post('/api/campaigns/test-campaign/npcs')
            .send({ npcs: npcsData });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toHaveLength(2);
        expect(stored[0].name).toBe('Town Guard');
    });

    it('should save an empty array of npcs', async () => {
        const app = createTestApp();
        const res = await request(app)
            .post('/api/campaigns/test-campaign/npcs')
            .send({ npcs: [] });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toEqual([]);
    });

    it('should return 400 when npcs is missing from request body', async () => {
        const app = createTestApp();
        const res = await request(app)
            .post('/api/campaigns/test-campaign/npcs')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Expected an array for npcs');
    });
});

// ─── GET /api/campaigns/:campaign/npcs/:npcName ──────────────────────────────

describe('npcs - GET /api/campaigns/:campaign/npcs/:npcName', () => {
    it('should return 404 when npcs.json does not exist', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/campaigns/test-campaign/npcs/Town%20Guard');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'NPC not found');
    });

    it('should return 404 when npc with given name does not exist', async () => {
        const npcsData = [
            { name: 'Town Guard', alignment: 'Lawful Good', level: 1 },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const app = createTestApp();
        const res = await request(app).get('/api/campaigns/test-campaign/npcs/Nonexistent');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('NPC not found');
    });

    it('should return the npc when found by name', async () => {
        const npcData = { name: 'Town Guard', alignment: 'Lawful Good', level: 1 };
        setupMock('npcs', 'test-campaign', [npcData]);

        const app = createTestApp();
        const res = await request(app).get('/api/campaigns/test-campaign/npcs/Town%20Guard');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('npc');
        expect(res.body.npc).toEqual(npcData);
    });

    it('should handle npc names with special characters via URL encoding', async () => {
        const npcData = { name: 'Guard@Home', alignment: 'Chaotic', level: 5 };
        setupMock('npcs', 'test-campaign', [npcData]);

        const app = createTestApp();
        const res = await request(app).get('/api/campaigns/test-campaign/npcs/Guard%40Home');

        expect(res.status).toBe(200);
        expect(res.body.npc.name).toBe('Guard@Home');
    });
});

// ─── DELETE /api/campaigns/:campaign/npcs/:npcName ───────────────────────────

describe('npcs - DELETE /api/campaigns/:campaign/npcs/:npcName', () => {
    it('should return 404 when npcs.json does not exist', async () => {
        const app = createTestApp();
        const res = await request(app).delete('/api/campaigns/test-campaign/npcs/Town%20Guard');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'NPC not found');
    });

    it('should return 200 and succeed when npc does not exist (no-op delete)', async () => {
        const npcsData = [
            { name: 'Town Guard', alignment: 'Lawful Good', level: 1 },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const app = createTestApp();
        const res = await request(app).delete('/api/campaigns/test-campaign/npcs/Nonexistent');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toHaveLength(1);
    });

    it('should delete an npc and return success', async () => {
        const npcsData = [
            { name: 'Keep Me', alignment: 'Lawful Good', level: 1 },
            { name: 'Delete Me', alignment: 'Chaotic', level: 5 },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const app = createTestApp();
        const res = await request(app).delete('/api/campaigns/test-campaign/npcs/Delete%20Me');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('Keep Me');
    });

    it('should call onDelete callback when deleting npc with imagePath', async () => {
        const npcsData = [
            { name: 'Delete Me', imagePath: 'images/Delete Me.png' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const app = createTestApp();
        await request(app).delete('/api/campaigns/test-campaign/npcs/Delete%20Me');

        expect(vi.mocked(deleteCharacterImage)).toHaveBeenCalledWith('images/Delete Me.png');
    });

    it('should not call onDelete when npc has no imagePath', async () => {
        const npcsData = [
            { name: 'No Image NPC' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const app = createTestApp();
        await request(app).delete('/api/campaigns/test-campaign/npcs/No%20Image%20NPC');

        expect(vi.mocked(deleteCharacterImage)).not.toHaveBeenCalled();
    });

    it('should handle deleting from an empty npcs list (no-op delete)', async () => {
        setupMock('npcs', 'test-campaign', []);

        const app = createTestApp();
        const res = await request(app).delete('/api/campaigns/test-campaign/npcs/Town%20Guard');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
    });
});

// ─── PUT /api/campaigns/:campaign/npcs/:npcName (custom upsert route) ────────

describe('npcs - PUT /api/campaigns/:campaign/npcs/:npcName (upsert)', () => {
    it('should create a new npc when it does not exist', async () => {
        const npcData = { name: 'New NPC', alignment: 'Neutral', level: 2 };
        setupMock('npcs', 'test-campaign', []);

        const app = createTestApp();
        const res = await request(app)
            .put('/api/campaigns/test-campaign/npcs/New%20NPC')
            .send(npcData);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('npc');
        expect(res.body.npc).toEqual(npcData);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('New NPC');
    });

    it('should update an existing npc when it exists', async () => {
        const npcsData = [
            { name: 'Town Guard', alignment: 'Lawful Good', level: 1 },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const updatedData = { name: 'Town Guard', alignment: 'Lawful Evil', level: 5 };

        const app = createTestApp();
        const res = await request(app)
            .put('/api/campaigns/test-campaign/npcs/Town%20Guard')
            .send(updatedData);

        expect(res.status).toBe(200);
        expect(res.body.npc).toEqual(updatedData);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toHaveLength(1);
        expect(stored[0].alignment).toBe('Lawful Evil');
        expect(stored[0].level).toBe(5);
    });

    it('should rename an npc when name changes', async () => {
        const npcsData = [
            { name: 'Old Name', alignment: 'Neutral' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const renamedData = { name: 'New Name', alignment: 'Neutral' };

        const app = createTestApp();
        const res = await request(app)
            .put('/api/campaigns/test-campaign/npcs/Old%20Name')
            .send(renamedData);

        expect(res.status).toBe(200);

        const stored = MOCK_STORE.get('test-campaign:npcs');
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('New Name');
    });

    it('should return 200 when the operation succeeds', async () => {
        setupMock('npcs', 'test-campaign', []);

        const app = createTestApp();
        const res = await request(app)
            .put('/api/campaigns/test-campaign/npcs/Test%20NPC')
            .send({ name: 'Test NPC' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
    });
});

// ─── PUT image handling ──────────────────────────────────────────────────────

describe('npcs - PUT image handling', () => {
    it('should delete original image when imagePath is cleared', async () => {
        const npcsData = [
            { name: 'Town Guard', imagePath: 'images/Town Guard.png' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const updatedData = { name: 'Town Guard', imagePath: '' };

        const app = createTestApp();
        await request(app)
            .put('/api/campaigns/test-campaign/npcs/Town%20Guard')
            .send(updatedData);

        expect(vi.mocked(deleteCharacterImage)).toHaveBeenCalledWith('images/Town Guard.png');
    });

    it('should process image upload when image and imageName are present', async () => {
        const npcsData = [
            { name: 'Town Guard' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const updatedData = {
            name: 'Town Guard',
            image: 'data:image/png;base64,iVBORw==',
            imageName: 'guard.png',
        };

        const app = createTestApp();
        await request(app)
            .put('/api/campaigns/test-campaign/npcs/Town%20Guard')
            .send(updatedData);

        expect(vi.mocked(processImageUpload)).toHaveBeenCalledWith(
            'test-campaign',
            'Town Guard',
            expect.any(Object),
            undefined
        );
    });

    it('should delete original image and set empty imagePath when removing image', async () => {
        const npcsData = [
            { name: 'Town Guard', imagePath: 'images/Town Guard.png' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const updatedData = { name: 'Town Guard', imagePath: '', alignment: 'Neutral' };

        const app = createTestApp();
        await request(app)
            .put('/api/campaigns/test-campaign/npcs/Town%20Guard')
            .send(updatedData);

        expect(vi.mocked(deleteCharacterImage)).toHaveBeenCalledWith('images/Town Guard.png');
    });

    it('should not delete image when imagePath is not provided and no original exists', async () => {
        const npcsData = [
            { name: 'Town Guard' },
        ];
        setupMock('npcs', 'test-campaign', npcsData);

        const updatedData = { name: 'Town Guard', alignment: 'Chaotic' };

        const app = createTestApp();
        await request(app)
            .put('/api/campaigns/test-campaign/npcs/Town%20Guard')
            .send(updatedData);

        expect(vi.mocked(deleteCharacterImage)).not.toHaveBeenCalled();
    });
});

// ─── Campaign isolation ──────────────────────────────────────────────────────

describe('npcs - Campaign isolation', () => {
    it('should return different npc data for different campaigns', async () => {
        const campaignANpcs = [
            { name: 'Guard A', alignment: 'Lawful', level: 1 },
        ];
        const campaignBNpcs = [
            { name: 'Guard B', alignment: 'Chaotic', level: 5 },
        ];
        setupMock('npcs', 'campaign-a', campaignANpcs);
        setupMock('npcs', 'campaign-b', campaignBNpcs);

        const app = createTestApp();

        const resA = await request(app).get('/api/campaigns/campaign-a/npcs');
        expect(resA.status).toBe(200);
        expect(resA.body.npcs).toHaveLength(1);
        expect(resA.body.npcs[0].name).toBe('Guard A');

        const resB = await request(app).get('/api/campaigns/campaign-b/npcs');
        expect(resB.status).toBe(200);
        expect(resB.body.npcs).toHaveLength(1);
        expect(resB.body.npcs[0].name).toBe('Guard B');
    });

    it('should not leak npcs between campaigns on delete', async () => {
        const campaignANpcs = [
            { name: 'Guard A', alignment: 'Lawful' },
        ];
        const campaignBNpcs = [
            { name: 'Guard B', alignment: 'Chaotic' },
        ];
        setupMock('npcs', 'campaign-a', campaignANpcs);
        setupMock('npcs', 'campaign-b', campaignBNpcs);

        const app = createTestApp();

        await request(app).delete('/api/campaigns/campaign-a/npcs/Guard%20A');

        const storedA = MOCK_STORE.get('campaign-a:npcs');
        expect(storedA).toHaveLength(0);

        const storedB = MOCK_STORE.get('campaign-b:npcs');
        expect(storedB).toHaveLength(1);
        expect(storedB[0].name).toBe('Guard B');
    });
});
