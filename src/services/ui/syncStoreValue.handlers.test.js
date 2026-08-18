// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function makeStore(initial = {}, putImpl = () => Promise.resolve()) {
  const data = new Map(Object.entries(initial))
  return {
    get: (k) => data.get(k),
    set: (k, v) => data.set(k, v),
    delete: (k) => data.delete(k),
    put: putImpl,
  }
}

let setStore
let readStore
let initSyncHandlers

let capturedListeners = []

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  capturedListeners = []
  vi.spyOn(window, 'addEventListener').mockImplementation((type, cb) => {
    capturedListeners.push({ type, cb })
  })
  const mod = await import('./syncStoreValue.js')
  setStore = mod.setStore
  readStore = mod.readStore
  initSyncHandlers = mod.initSyncHandlers
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function listener(type) {
  const entry = capturedListeners.find((l) => l.type === type)
  return entry ? entry.cb : null
}

describe('initSyncHandlers', () => {
  it('registers campaign-changed, condition-apply, and condition-remove listeners', () => {
    initSyncHandlers('test-campaign')

    expect(capturedListeners.map((l) => l.type)).toEqual([
      'campaign-changed',
      'condition-apply',
      'condition-remove',
    ])
  })

  it('ignores condition-apply events without name or key', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    initSyncHandlers('test-campaign')
    const cb = listener('condition-apply')

    expect(cb({})).toBeUndefined()
    expect(cb({ detail: { key: 'activeConditions', value: 'poisoned' } })).toBeUndefined()
    expect(cb({ detail: { name: 'target', value: 'poisoned' } })).toBeUndefined()

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('condition-apply logs an error when no store exists for the name', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    initSyncHandlers('test-campaign')

    listener('condition-apply')({ detail: { name: 'missing', key: 'activeConditions', value: 'poisoned' } })

    expect(errorSpy).toHaveBeenCalledWith('syncCondition: store not initialized for', 'missing')
  })

  it('condition-apply adds a condition to an existing array', async () => {
    const store = makeStore({ target: { activeConditions: [] } })
    setStore('target', store)
    initSyncHandlers('test-campaign')

    await listener('condition-apply')({ detail: { name: 'target', key: 'activeConditions', value: 'poisoned' } })

    expect(store.get('target')).toEqual({ activeConditions: ['poisoned'] })
  })

  it('condition-apply ignores a duplicate condition', async () => {
    const store = makeStore({ target: { activeConditions: ['poisoned'] } })
    setStore('target', store)
    initSyncHandlers('test-campaign')

    await listener('condition-apply')({ detail: { name: 'target', key: 'activeConditions', value: 'poisoned' } })

    expect(store.get('target')).toEqual({ activeConditions: ['poisoned'] })
  })

  it('condition-apply initializes a missing conditions array', async () => {
    const store = makeStore({ target: { hp: 100 } })
    setStore('target', store)
    initSyncHandlers('test-campaign')

    await listener('condition-apply')({ detail: { name: 'target', key: 'activeConditions', value: 'blinded' } })

    expect(store.get('target')).toEqual({ hp: 100, activeConditions: ['blinded'] })
  })

  it('ignores condition-remove events missing name, key, or condition', () => {
    initSyncHandlers('test-campaign')
    const cb = listener('condition-remove')

    expect(cb({})).toBeUndefined()
    expect(cb({ detail: { key: 'activeConditions', condition: 'poisoned' } })).toBeUndefined()
    expect(cb({ detail: { name: 'target', condition: 'poisoned' } })).toBeUndefined()
    expect(cb({ detail: { name: 'target', key: 'activeConditions' } })).toBeUndefined()
  })

  it('condition-remove removes a matching condition and triggers put', async () => {
    const put = vi.fn(() => Promise.resolve())
    const store = makeStore({ activeConditions: ['poisoned', 'blinded'] }, put)
    setStore('target', store)
    initSyncHandlers('test-campaign')

    await listener('condition-remove')({ detail: { name: 'target', key: 'activeConditions', condition: 'poisoned' } })

    expect(store.get('activeConditions')).toEqual(['blinded'])
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('condition-remove swallows a put rejection', () => {
    const store = makeStore({ activeConditions: ['poisoned'] }, () => Promise.reject(new Error('put failed')))
    setStore('target', store)
    initSyncHandlers('test-campaign')

    expect(() => listener('condition-remove')({
      detail: { name: 'target', key: 'activeConditions', condition: 'poisoned' },
    })).not.toThrow()

    expect(store.get('activeConditions')).toEqual([])
  })

  it('condition-remove replaces a non-array value with the filtered array', async () => {
    const store = makeStore({ activeConditions: 'not-an-array' })
    setStore('target', store)
    initSyncHandlers('test-campaign')

    await listener('condition-remove')({ detail: { name: 'target', key: 'activeConditions', condition: 'poisoned' } })

    expect(store.get('activeConditions')).toEqual([])
  })

  it('condition-remove for an unseeded name throws because a fresh Map has no put method', () => {
    initSyncHandlers('test-campaign')

    expect(() => listener('condition-remove')({
      detail: { name: 'missing', key: 'activeConditions', condition: 'poisoned' },
    })).toThrow(TypeError)
  })
})

describe('fetchAndSeedStores via campaign-changed', () => {
  it('fetches each seeded store key', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false }))
    vi.stubGlobal('fetch', fetchMock)
    setStore('a', makeStore({ a: 1 }))
    setStore('b', makeStore({ b: 2 }))
    initSyncHandlers('test-campaign')

    await listener('campaign-changed')()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/test-campaign/a')
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/test-campaign/b')
  })

  it('keeps the existing store value when the response contains a value', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ value: { hp: 99 } }) }))
    vi.stubGlobal('fetch', fetchMock)
    setStore('hero', makeStore({ hero: { hp: 1 } }))
    initSyncHandlers('test-campaign')

    await listener('campaign-changed')()

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/test-campaign/hero')
    expect(readStore('hero')).toEqual({ hp: 1 })
  })

  it('resets the store to an empty Map when the response has no value', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    setStore('hero', makeStore({ hero: { hp: 10 } }))
    initSyncHandlers('test-campaign')

    await listener('campaign-changed')()

    expect(readStore('hero')).toBeUndefined()
  })

  it('resets the store to an empty Map when the response is not ok', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false }))
    vi.stubGlobal('fetch', fetchMock)
    setStore('hero', makeStore({ hero: { hp: 10 } }))
    initSyncHandlers('test-campaign')

    await listener('campaign-changed')()

    expect(readStore('hero')).toBeUndefined()
  })

  it('resets the store to an empty Map when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))))
    setStore('hero', makeStore({ hero: { hp: 10 } }))
    initSyncHandlers('test-campaign')

    await listener('campaign-changed')()

    expect(readStore('hero')).toBeUndefined()
  })

  it('skips fetching and resets the store when there is no campaign name', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setStore('hero', makeStore({ hero: { hp: 10 } }))
    initSyncHandlers(null)

    await listener('campaign-changed')()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(readStore('hero')).toBeUndefined()
  })

  it('seeds stores after the SYNC_DELAY timeout', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    setStore('hero', makeStore({ hero: { hp: 10 } }))
    initSyncHandlers('test-campaign')

    expect(fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(40)

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/test-campaign/hero')
    expect(readStore('hero')).toBeUndefined()
  })
})
