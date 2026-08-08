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
let syncStoreValue
let readStore
let clearStore
let applyConditionOnSaveFail
let removeConditionsFromTarget

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('./syncStoreValue.js')
  setStore = mod.setStore
  syncStoreValue = mod.syncStoreValue
  readStore = mod.readStore
  clearStore = mod.clearStore
  applyConditionOnSaveFail = mod.applyConditionOnSaveFail
  removeConditionsFromTarget = mod.removeConditionsFromTarget
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('setStore', () => {
  it('seeds the module-level store so readStore can read it', () => {
    setStore('counter', makeStore({ counter: 42 }))
    expect(readStore('counter')).toBe(42)
  })

  it('replaces an existing store for the same key', () => {
    setStore('counter', makeStore({ counter: 42 }))
    setStore('counter', makeStore({ counter: 7 }))
    expect(readStore('counter')).toBe(7)
  })
})

describe('syncStoreValue', () => {
  it('resolves false when the store is not present', async () => {
    await expect(syncStoreValue('nonexistent', 'value')).resolves.toBe(false)
  })

  it('resolves false when the value has not changed', async () => {
    setStore('counter', makeStore({ counter: 42 }))
    await expect(syncStoreValue('counter', 42)).resolves.toBe(false)
  })

  it('writes the changed value, triggers put, and resolves true', async () => {
    const put = vi.fn(() => Promise.resolve())
    setStore('counter', makeStore({ counter: 42 }, put))
    await expect(syncStoreValue('counter', 99)).resolves.toBe(true)
    expect(readStore('counter')).toBe(99)
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('resolves false when put rejects but still updates the store', async () => {
    setStore('counter', makeStore({ counter: 42 }, () => Promise.reject(new Error('put failed'))))
    await expect(syncStoreValue('counter', 99)).resolves.toBe(false)
    expect(readStore('counter')).toBe(99)
  })
})

describe('readStore', () => {
  it('returns undefined when the store is not present', () => {
    expect(readStore('nonexistent')).toBeUndefined()
  })

  it('returns the stored value when the store is present', () => {
    setStore('character', makeStore({ character: { hp: 100, name: 'Gandalf' } }))
    expect(readStore('character')).toEqual({ hp: 100, name: 'Gandalf' })
  })
})

describe('clearStore', () => {
  it('resolves when there is no store', async () => {
    await expect(clearStore('nonexistent')).resolves.toBeUndefined()
  })

  it('deletes the key, triggers put, and resolves', async () => {
    const put = vi.fn(() => Promise.resolve())
    setStore('character', makeStore({ character: { hp: 100 } }, put))
    await expect(clearStore('character')).resolves.toBeUndefined()
    expect(readStore('character')).toBeUndefined()
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('resolves null when put rejects', async () => {
    setStore('character', makeStore({ character: { hp: 100 } }, () => Promise.reject(new Error('put failed'))))
    await expect(clearStore('character')).resolves.toBeNull()
  })
})

describe('applyConditionOnSaveFail', () => {
  it('POSTs the condition to the server when fetch resolves', async () => {
    setStore('target', makeStore({ target: { activeConditions: [] } }))
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await applyConditionOnSaveFail('test-campaign', 'attacker', 'target', 'poisoned')

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/test-campaign/applyCondition', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName: 'attacker', targetName: 'target', condition: 'poisoned' }),
    })
    expect(readStore('target')).toEqual({ activeConditions: [] })
  })

  it('applies the condition locally when fetch rejects and the store exists', async () => {
    setStore('target', makeStore({ target: { activeConditions: [] } }))
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))))

    await applyConditionOnSaveFail('test-campaign', 'attacker', 'target', 'poisoned')

    expect(readStore('target')).toEqual({ activeConditions: ['poisoned'] })
  })

  it('does not add a duplicate condition when fetch rejects', async () => {
    setStore('target', makeStore({ target: { activeConditions: ['poisoned'] } }))
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))))

    await applyConditionOnSaveFail('test-campaign', 'attacker', 'target', 'poisoned')

    expect(readStore('target')).toEqual({ activeConditions: ['poisoned'] })
  })

  it('logs an error and resolves when fetch rejects and no store exists', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))))

    await applyConditionOnSaveFail('test-campaign', 'attacker', 'target', 'poisoned')

    expect(errorSpy).toHaveBeenCalledWith('syncCondition: store not initialized for', 'target')
  })
})

describe('removeConditionsFromTarget', () => {
  it('resolves early when campaignName is missing', async () => {
    await expect(removeConditionsFromTarget(null, 'target', ['poisoned'])).resolves.toBeUndefined()
    await expect(removeConditionsFromTarget('', 'target', ['poisoned'])).resolves.toBeUndefined()
  })

  it('resolves early when targetName is missing', async () => {
    await expect(removeConditionsFromTarget('test-campaign', null, ['poisoned'])).resolves.toBeUndefined()
    await expect(removeConditionsFromTarget('test-campaign', '', ['poisoned'])).resolves.toBeUndefined()
  })

  it('resolves early when no store exists for the target', async () => {
    await expect(removeConditionsFromTarget('test-campaign', 'nonexistent', ['poisoned'])).resolves.toBeUndefined()
  })

  it('resolves early when activeConditions is not an array', async () => {
    const store = makeStore({ activeConditions: 'not-an-array' })
    setStore('target', store)

    await expect(removeConditionsFromTarget('test-campaign', 'target', ['poisoned'])).resolves.toBeUndefined()
    expect(store.get('activeConditions')).toBe('not-an-array')
  })

  it('resolves early when no conditions match', async () => {
    const store = makeStore({ activeConditions: ['blinded'] })
    setStore('target', store)

    await expect(removeConditionsFromTarget('test-campaign', 'target', ['poisoned'])).resolves.toBeUndefined()
    expect(store.get('activeConditions')).toEqual(['blinded'])
  })

  it('removes matching conditions and writes the filtered array', async () => {
    const put = vi.fn(() => Promise.resolve())
    const store = makeStore({ activeConditions: ['poisoned', 'blinded', 'prone'] }, put)
    setStore('target', store)

    await expect(removeConditionsFromTarget('test-campaign', 'target', ['poisoned', 'prone'])).resolves.toBeUndefined()
    expect(store.get('activeConditions')).toEqual(['blinded'])
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('resolves null when the underlying put rejects', async () => {
    const store = makeStore({ activeConditions: ['poisoned'] }, () => Promise.reject(new Error('put failed')))
    setStore('target', store)

    await expect(removeConditionsFromTarget('test-campaign', 'target', ['poisoned'])).resolves.toBeNull()
    expect(store.get('activeConditions')).toEqual([])
  })
})
