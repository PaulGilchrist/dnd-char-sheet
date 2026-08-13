import React from 'react'

export function setupGlobalEventSource() {
  const MockEventSource = vi.fn()
  MockEventSource.prototype.close = vi.fn()
  Object.defineProperty(globalThis, 'EventSource', {
    value: MockEventSource,
    writable: true,
    configurable: true,
  })
}

export function createCharacter(name, saveModifiers) {
  return {
    name,
    computedStats: {
      abilities: [{ name: 'Constitution', bonus: 3 }],
    },
    saveModifiers: saveModifiers || [],
  }
}

export function createMockSubscriber(campaignName) {
  return function MockSubscriber({ handleEvent }) {
    return React.createElement(
      'div',
      { 'data-testid': 'subscriber' },
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-concentrationPrompt-testTarget`,
              data: {
                promptId: 'test-prompt-1',
                targetName: 'testTarget',
                spellName: 'Bless',
                dc: 10,
                attackerName: 'Elarielle',
              },
            }),
        },
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger-second',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-concentrationPrompt-testTarget2`,
              data: {
                promptId: 'test-prompt-2',
                targetName: 'testTarget2',
                spellName: 'Haste',
                dc: 13,
              },
            }),
        },
      ),
    )
  }
}
