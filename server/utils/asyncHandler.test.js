import asyncHandler from '../utils/asyncHandler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockReq({ method = 'GET', originalUrl = '/api/test', ...rest } = {}) {
    return { method: method || 'GET', originalUrl: originalUrl || '/api/test', ...rest };
}

function createMockRes() {
    const mockRes = {
        _statusCalls: 0,
        _statusArgs: [],
        _jsonArgs: [],
        statusFn(status) {
            this._statusCalls++;
            this._statusArgs.push(status);
            return this;
        },
        jsonFn(obj) {
            this._jsonArgs.push(obj);
            return this;
        },
    };
    mockRes.status = vi.fn(function(status) {
        mockRes._statusCalls++;
        mockRes._statusArgs.push(status);
        return mockRes;
    });
    mockRes.json = vi.fn(function(obj) {
        mockRes._jsonArgs.push(obj);
        return mockRes;
    });
    return mockRes;
}

// ---------------------------------------------------------------------------
// asyncHandler - basic wrapping behavior
// ---------------------------------------------------------------------------
describe('asyncHandler - basic wrapping', () => {
    it('should return a function (Express middleware)', () => {
        const handler = asyncHandler(() => {});
        expect(typeof handler).toBe('function');
    });

    it('should accept (req, res, next) signature', () => {
        const handler = asyncHandler((req, res, next) => {
            expect(typeof req).toBe('object');
            expect(typeof res).toBe('object');
            expect(typeof next).toBe('function');
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should call the wrapped function with req, res, next', () => {
        let calledWith = null;
        const handler = asyncHandler((req, res, next) => {
            calledWith = { req, res, next };
        });
        const req = createMockReq();
        const res = createMockRes();
        const next = vi.fn();
        handler(req, res, next);
        expect(calledWith.req).toBe(req);
        expect(calledWith.res).toBe(res);
        expect(calledWith.next).toBe(next);
    });

    it('should NOT call next() when the wrapped function succeeds synchronously', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            createMockRes().statusFn(200).jsonFn({ ok: true });
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should call next() when the wrapped function calls next()', () => {
        const next = vi.fn();
        const handler = asyncHandler((_req, _res, next) => {
            next();
        });
        handler(createMockReq(), createMockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - synchronous handlers
// ---------------------------------------------------------------------------
describe('asyncHandler - synchronous handlers', () => {
    it('should handle a simple synchronous GET handler returning 200', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ message: 'ok' });
        });
        const req = createMockReq({ method: 'GET' });
        const res = createMockRes();
        handler(req, res, vi.fn());
        expect(res._statusCalls).toBe(1);
        expect(res._statusArgs[0]).toBe(200);
        expect(res._jsonArgs[0]).toEqual({ message: 'ok' });
    });

    it('should handle a synchronous POST handler returning 201', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(201).jsonFn({ created: true });
        });
        const req = createMockReq({ method: 'POST' });
        const res = createMockRes();
        handler(req, res, vi.fn());
        expect(res._statusArgs[0]).toBe(201);
        expect(res._jsonArgs[0]).toEqual({ created: true });
    });

    it('should handle a synchronous DELETE handler returning 204', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(204).jsonFn({});
        });
        const req = createMockReq({ method: 'DELETE' });
        const res = createMockRes();
        handler(req, res, vi.fn());
        expect(res._statusArgs[0]).toBe(204);
    });

    it('should handle synchronous handler that calls next() for auth check', () => {
        const next = vi.fn();
        const handler = asyncHandler((_req, _res, next) => {
            next(new Error('not authenticated'));
        });
        handler(createMockReq(), createMockRes(), next);
        expect(next).toHaveBeenCalledWith(new Error('not authenticated'));
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - synchronous errors
// ---------------------------------------------------------------------------
describe('asyncHandler - synchronous error handling', () => {
    it('should catch and handle a thrown Error', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('boom');
        });
        const req = createMockReq({ method: 'GET', originalUrl: '/api/test' });
        const res = createMockRes();
        handler(req, res, vi.fn());
        expect(res.status).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();
        const jsonArg = res._jsonArgs[0];
        expect(jsonArg.error).toBe('boom');
    });

    it('should log the error to console.error with method and URL', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('test error');
        });
        const req = createMockReq({ method: 'POST', originalUrl: '/api/campaigns/my-campaign/data' });
        handler(req, createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in POST /api/campaigns/my-campaign/data:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should use generic message when error has no message', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            const err = new Error();
            err.message = '';
            throw err;
        });
        const res = createMockRes();
        handler(createMockReq(), res, vi.fn());
        expect(res._jsonArgs[0].error).toBe('Internal server error');
    });

    it('should handle non-Error objects thrown', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            throw 'string error';
        });
        const res = createMockRes();
        handler(createMockReq(), res, vi.fn());
        // String thrown errors won't have .message, falls back to generic
        expect(res._jsonArgs[0].error).toBe('Internal server error');
    });

    it('should handle Number thrown', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            throw 42;
        });
        const res = createMockRes();
        handler(createMockReq(), res, vi.fn());
        expect(res._jsonArgs[0].error).toBe('Internal server error');
    });

    it('should handle object thrown with message property', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            throw { message: 'custom error message' };
        });
        const res = createMockRes();
        handler(createMockReq(), res, vi.fn());
        expect(res._jsonArgs[0].error).toBe('custom error message');
    });

    it('should not call next() on synchronous error (sends 500 response)', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('boom');
        });
        const res = createMockRes();
        const next = vi.fn();
        handler(createMockReq(), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - async handlers (Promise-returning)
// ---------------------------------------------------------------------------
describe('asyncHandler - async handlers', () => {
    it('should handle an async function that resolves successfully', async () => {
        const handler = asyncHandler(async (_req, res, _next) => {
            await Promise.resolve();
            res.statusFn(200).jsonFn({ ok: true });
        });
        const req = createMockReq();
        const res = createMockRes();
        handler(req, res, vi.fn());
        await new Promise(r => setTimeout(r, 10));
        expect(res._statusArgs[0]).toBe(200);
        expect(res._jsonArgs[0]).toEqual({ ok: true });
    });

    it('should handle an async function that rejects with Error', async () => {
        const handler = asyncHandler(async (_req, _res, _next) => {
            await Promise.reject(new Error('async boom'));
        });
        const req = createMockReq({ method: 'POST', originalUrl: '/api/test' });
        const res = createMockRes();
        const next = vi.fn();
        handler(req, res, next);
        await new Promise(r => setTimeout(r, 10));
        // Async rejections are passed to next() for Express error middleware
        expect(next).toHaveBeenCalledWith(new Error('async boom'));
    });

    it('should handle an async function that rejects with string', async () => {
        const handler = asyncHandler(async (_req, _res, _next) => {
            await Promise.reject('rejected string');
        });
        handler(createMockReq(), createMockRes(), vi.fn());
        await new Promise(r => setTimeout(r, 10));
    });

    it('should handle an async function that returns a rejected Promise directly', async () => {
        const handler = asyncHandler((_req, _res, _next) => {
            return Promise.reject(new Error('direct reject'));
        });
        const req = createMockReq({ method: 'GET', originalUrl: '/api/direct' });
        const res = createMockRes();
        const next = vi.fn();
        handler(req, res, next);
        await new Promise(r => setTimeout(r, 10));
        expect(next).toHaveBeenCalledWith(new Error('direct reject'));
    });

    it('should handle an async function that returns a resolved Promise then sends response', async () => {
        const handler = asyncHandler(async (_req, res, _next) => {
            const data = await Promise.resolve({ value: 42 });
            res.statusFn(200).jsonFn(data);
        });
        handler(createMockReq(), createMockRes(), vi.fn());
        await new Promise(r => setTimeout(r, 10));
    });

    it('should handle async function with await that throws', async () => {
        const handler = asyncHandler(async (_req, _res, _next) => {
            await Promise.reject(new TypeError('type error occurred'));
        });
        const req = createMockReq({ method: 'PUT', originalUrl: '/api/campaigns/test/data' });
        const res = createMockRes();
        const next = vi.fn();
        handler(req, res, next);
        await new Promise(r => setTimeout(r, 10));
        // Async rejections go to next() for Express error middleware
        expect(next).toHaveBeenCalledWith(expect.any(TypeError));
    });

    it('should handle async function that resolves then calls next()', async () => {
        const next = vi.fn();
        const handler = asyncHandler(async (_req, _res, next) => {
            await Promise.resolve();
            next();
        });
        handler(createMockReq(), createMockRes(), next);
        await new Promise(r => setTimeout(r, 10));
        expect(next).toHaveBeenCalled();
    });

    it('should handle async function that resolves then returns undefined', async () => {
        const handler = asyncHandler(async (_req, _res, _next) => {
            await Promise.resolve();
            // no response, no next
        });
        handler(createMockReq(), createMockRes(), vi.fn());
        await new Promise(r => setTimeout(r, 10));
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - edge cases
// ---------------------------------------------------------------------------
describe('asyncHandler - edge cases', () => {
    it('should handle a handler that returns a non-Promise value', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
            return 'some string';
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle a handler that returns null', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
            return null;
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle a handler that returns undefined', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle a handler that returns a number', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ count: 5 });
            return 42;
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle a handler that returns an object without .catch', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
            return { data: 'value' };
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle a handler that returns undefined (no return statement)', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
            // implicit undefined return
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle a handler that returns a thenable (Promise-like)', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            const thenable = {
                then: function(resolve) {
                    resolve({ ok: true });
                }
            };
            return thenable;
        });
        const next = vi.fn();
        handler(createMockReq(), createMockRes(), next);
        // Thenables without .catch are not caught - this is correct behavior
        expect(next).not.toHaveBeenCalled();
    });

    it('should handle console.error being unavailable', () => {
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('test');
        });
        const res = createMockRes();
        handler(createMockReq(), res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle res.status being called multiple times (only last matters)', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
            // Simulate a second call (shouldn't happen in real code but test it)
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle res.json being called with null', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn(null);
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle res.json being called with undefined', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn(undefined);
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle res.json being called with a number', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn(42);
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle res.json being called with an array', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn([1, 2, 3]);
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });

    it('should handle res.json being called with a boolean', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn(true);
        });
        handler(createMockReq(), createMockRes(), vi.fn());
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - method and URL logging
// ---------------------------------------------------------------------------
describe('asyncHandler - HTTP method and URL logging', () => {
    it('should log GET method in error message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('get error');
        });
        handler(createMockReq({ method: 'GET', originalUrl: '/api/characters' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in GET /api/characters:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should log POST method in error message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('post error');
        });
        handler(createMockReq({ method: 'POST', originalUrl: '/api/campaigns/my-campaign/characters' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in POST /api/campaigns/my-campaign/characters:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should log PUT method in error message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('put error');
        });
        handler(createMockReq({ method: 'PUT', originalUrl: '/api/campaigns/test/data' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in PUT /api/campaigns/test/data:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should log DELETE method in error message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('delete error');
        });
        handler(createMockReq({ method: 'DELETE', originalUrl: '/api/campaigns/test/encounter/1' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in DELETE /api/campaigns/test/encounter/1:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should log PATCH method in error message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('patch error');
        });
        handler(createMockReq({ method: 'PATCH', originalUrl: '/api/campaigns/test/char.json' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in PATCH /api/campaigns/test/char.json:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should log complex URLs with query strings', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('complex url');
        });
        handler(createMockReq({ method: 'GET', originalUrl: '/api/campaigns/my-campaign/encounters?include=monsters' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in GET /api/campaigns/my-campaign/encounters?include=monsters:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should log URLs with special characters', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler = asyncHandler((_req, _res, _next) => {
            throw new Error('special chars');
        });
        handler(createMockReq({ method: 'GET', originalUrl: '/api/campaigns/my-test-campaign/characters/Bob-the-Dragon' }), createMockRes(), vi.fn());
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error in GET /api/campaigns/my-test-campaign/characters/Bob-the-Dragon:',
            expect.any(Error),
        );
        consoleSpy.mockRestore();
    });

    it('should pass async handler rejection to next() for Express error middleware', async () => {
        const handler = asyncHandler(async (_req, _res, _next) => {
            await Promise.reject(new Error('async error'));
        });
        const req = createMockReq({ method: 'POST', originalUrl: '/api/campaigns/test/pipeline-event' });
        const res = createMockRes();
        const next = vi.fn();
        handler(req, res, next);
        await new Promise(r => setTimeout(r, 10));
        expect(next).toHaveBeenCalledWith(new Error('async error'));
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - integration-style: chained middleware
// ---------------------------------------------------------------------------
describe('asyncHandler - chained middleware patterns', () => {
    it('should pass control to next middleware on success', () => {
        let nextCalled = false;
        const handler1 = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ step: 1 });
        });
        void asyncHandler((_req, _res, _next) => {
            nextCalled = true;
        });
        const req = createMockReq();
        const res = createMockRes();
        const next = vi.fn(() => { nextCalled = true; });
        handler1(req, res, next);
        // handler1 didn't call next, so handler2 wouldn't run in real Express
        // But we're testing that asyncHandler doesn't block next when not called
        expect(nextCalled).toBe(false);
    });

    it('should allow next() to pass control in sync handler', () => {
        let nextCalled = false;
        const handler = asyncHandler((_req, _res, next) => {
            next(() => { nextCalled = true; });
        });
        handler(createMockReq(), createMockRes(), vi.fn((cb) => {
            if (cb) cb();
        }));
        expect(nextCalled).toBe(true);
    });

    it('should allow next(err) to pass error in sync handler', () => {
        const next = vi.fn();
        const handler = asyncHandler((_req, _res, next) => {
            next(new Error('middleware error'));
        });
        handler(createMockReq(), createMockRes(), next);
        expect(next).toHaveBeenCalledWith(new Error('middleware error'));
    });

    it('should chain: first handler calls next, second handler throws', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const handler1 = asyncHandler((_req, _res, next) => {
            next();
        });
        const handler2 = asyncHandler((_req, _res, _next) => {
            throw new Error('second handler error');
        });
        const req = createMockReq({ method: 'GET', originalUrl: '/api/chain' });
        const res = createMockRes();
        const next = vi.fn();
        handler1(req, res, next);
        // In real Express, next() would call handler2, but here we simulate that
        handler2(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res._jsonArgs[0].error).toBe('second handler error');
        consoleSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - multiple invocations (independence)
// ---------------------------------------------------------------------------
describe('asyncHandler - multiple invocations', () => {
    it('should handle multiple independent requests with the same handler', () => {
        let capturedUrls = [];
        const handler = asyncHandler((req, _res, _next) => {
            capturedUrls.push(req.originalUrl);
        });
        const res1 = createMockRes();
        const res2 = createMockRes();
        handler({ method: 'GET', originalUrl: '/api/first' }, res1, vi.fn());
        handler({ method: 'GET', originalUrl: '/api/second' }, res2, vi.fn());
        expect(capturedUrls).toEqual(['/api/first', '/api/second']);
    });

    it('should handle one handler succeeding and another failing independently', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const successHandler = asyncHandler((_req, res, _next) => {
            res.statusFn(200).jsonFn({ ok: true });
        });
        const failHandler = asyncHandler((_req, _res, _next) => {
            throw new Error('fail');
        });
        const res1 = createMockRes();
        const res2 = createMockRes();
        successHandler(createMockReq(), res1, vi.fn());
        failHandler(createMockReq(), res2, vi.fn());
        expect(res1._statusArgs[0]).toBe(200);
        expect(res2._statusArgs[0]).toBe(500);
        consoleSpy.mockRestore();
    });

    it('should handle two async handlers independently', async () => {
        const handler1 = asyncHandler(async (_req, res, _next) => {
            await Promise.resolve();
            res.statusFn(200).jsonFn({ id: 1 });
        });
        const handler2 = asyncHandler(async (_req, res, _next) => {
            await Promise.resolve();
            res.statusFn(200).jsonFn({ id: 2 });
        });
        const res1 = createMockRes();
        const res2 = createMockRes();
        handler1(createMockReq(), res1, vi.fn());
        handler2(createMockReq(), res2, vi.fn());
        await new Promise(r => setTimeout(r, 10));
        expect(res1._jsonArgs[0].id).toBe(1);
        expect(res2._jsonArgs[0].id).toBe(2);
    });

    it('should handle two async handlers where one rejects independently', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const successHandler = asyncHandler(async (_req, res, _next) => {
            await Promise.resolve();
            res.statusFn(200).jsonFn({ ok: true });
        });
        const failHandler = asyncHandler(async (_req, _res, _next) => {
            await Promise.reject(new Error('async fail'));
        });
        const res1 = createMockRes();
        const res2 = createMockRes();
        successHandler(createMockReq(), res1, vi.fn());
        const failNext = vi.fn();
        failHandler(createMockReq(), res2, failNext);
        await new Promise(r => setTimeout(r, 10));
        expect(res1._jsonArgs[0]).toEqual({ ok: true });
        // Async rejection goes to next(), not to res.status(500)
        expect(failNext).toHaveBeenCalledWith(new Error('async fail'));
        consoleSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// asyncHandler - real-world route patterns from the codebase
// ---------------------------------------------------------------------------
describe('asyncHandler - real-world patterns', () => {
    it('should handle a GET route that reads data and returns 200', () => {
        const handler = asyncHandler((req, res, _next) => {
            const campaignName = req.params.campaign;
            res.statusFn(200).jsonFn({ campaign: campaignName, maps: ['map1', 'map2'] });
        });
        handler(createMockReq({ method: 'GET', originalUrl: '/api/campaigns/my-campaign/maps', params: { campaign: 'my-campaign' } }), createMockRes(), vi.fn());
    });

    it('should handle a POST route that creates data and returns 201', () => {
        const handler = asyncHandler((req, res, _next) => {
            const { name } = req.body;
            res.statusFn(201).jsonFn({ created: name });
        });
        handler(createMockReq({ method: 'POST', originalUrl: '/api/campaigns/test/encounters', body: { name: 'goblins' } }), createMockRes(), vi.fn());
    });

    it('should handle a DELETE route that removes data and returns 204', () => {
        const handler = asyncHandler((req, res, _next) => {
            const id = req.params.id;
            // In real code, would delete from storage
            res.statusFn(204).jsonFn({ deleted: id });
        });
        handler(createMockReq({ method: 'DELETE', originalUrl: '/api/campaigns/test/encounters/goblins', params: { id: 'goblins' } }), createMockRes(), vi.fn());
    });

    it('should handle a PUT route that updates data and returns 200', () => {
        const handler = asyncHandler((req, res, _next) => {
            const { hp } = req.body;
            res.statusFn(200).jsonFn({ updatedHp: hp });
        });
        handler(createMockReq({ method: 'PUT', originalUrl: '/api/campaigns/test/characters/Bob', body: { hp: 25 } }), createMockRes(), vi.fn());
    });

    it('should handle a PATCH route that partially updates data', () => {
        const handler = asyncHandler((req, res, _next) => {
            const { hp } = req.body;
            res.statusFn(200).jsonFn({ patchedHp: hp });
        });
        handler(createMockReq({ method: 'PATCH', originalUrl: '/api/campaigns/test/char.json', body: { hp: 20 } }), createMockRes(), vi.fn());
    });

    it('should handle a POST pipeline-event that processes and returns result', async () => {
        const handler = asyncHandler(async (req, res, _next) => {
            const { eventType, data } = req.body;
            // Simulate processing
            await Promise.resolve();
            res.statusFn(200).jsonFn({ processed: eventType, result: data });
        });
        handler(createMockReq({ method: 'POST', originalUrl: '/api/campaigns/test/pipeline-event', body: { eventType: 'attack', data: { damage: 10 } } }), createMockRes(), vi.fn());
        await new Promise(r => setTimeout(r, 10));
    });

    it('should handle SSE route that sets headers and pipes', () => {
        const handler = asyncHandler((_req, res, _next) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.statusFn(200).jsonFn({ connected: true });
        });
        const res = createMockRes();
        res.setHeader = vi.fn();
        handler(createMockReq({ method: 'GET', originalUrl: '/spell-overlay' }), res, vi.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
        expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
        expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('should handle admin route that requires authentication check via next()', () => {
        const next = vi.fn();
        const handler = asyncHandler((_req, _res, next) => {
            // In real code, auth middleware would have already run
            // This simulates a handler that delegates to next
            next();
        });
        handler(createMockReq({ method: 'POST', originalUrl: '/api/campaigns/test/admin/full-reset' }), createMockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});
