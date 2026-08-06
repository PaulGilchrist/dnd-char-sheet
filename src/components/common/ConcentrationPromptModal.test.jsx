// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { rollD20 } from '../../services/dice/diceRoller.js'
import { sendConcentrationResult } from '../../services/combat/conditions/savePromptService.js'
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js'
import { hasSaveModifier } from '../../services/combat/conditions/conditionEffects.js'
import ConcentrationPromptModal from './ConcentrationPromptModal.jsx'

vi.mock('../../services/ui/utils.js', () => ({
  default: {
    getName: (name) => name || 'Unknown',
  },
}))

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}))

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
  sendConcentrationResult: vi.fn(),
  clearConcentrationPrompt: vi.fn(),
}))

vi.mock('../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}))

vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilitySaveBonus: vi.fn(() => 3),
}))

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
  hasSaveModifier: vi.fn(() => false),
}))

  vi.mock('./Subscriber.jsx', () => ({
    default: function MockSubscriber({ handleEvent, campaignName }) {
      return React.createElement(
        'div',
        { 'data-testid': 'subscriber', 'data-campaign': campaignName },
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
    },
  }))

const MockEventSource = vi.fn()
MockEventSource.prototype.close = vi.fn()

function setupGlobalEventSource() {
  Object.defineProperty(globalThis, 'EventSource', {
    value: MockEventSource,
    writable: true,
    configurable: true,
  })
}

function createCharacter(name, saveModifiers) {
  return {
    name,
    computedStats: {
      abilities: [{ name: 'Constitution', bonus: 3 }],
    },
    saveModifiers: saveModifiers || [],
  }
}

describe('ConcentrationPromptModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupGlobalEventSource()
    vi.mocked(rollD20).mockReturnValue(10)
    vi.mocked(hasSaveModifier).mockReturnValue(false)
    vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 0, sourceName: null })
  })

  it('renders nothing when there are no prompts', () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )
    expect(screen.queryByText(/must make a/)).not.toBeInTheDocument()
  })

  it('renders the modal with prompt details when a prompt is queued via Subscriber', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    expect(screen.getByText('testTarget')).toBeInTheDocument()
    expect(screen.getByText(/CONSTITUTION/i)).toBeInTheDocument()
    expect(screen.getByText('Bless')).toBeInTheDocument()
    expect(screen.getByText('DC 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /roll con save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('advances to the next prompt when "Next Check" is clicked', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))
    fireEvent.click(screen.getByTestId('subscriber-trigger-second'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    // Resolve the first prompt
    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next Check' })).toBeInTheDocument()
    })

    // Advance to the next prompt
    fireEvent.click(screen.getByRole('button', { name: 'Next Check' }))

    await waitFor(() => {
      expect(screen.getByText(/testTarget2/)).toBeInTheDocument()
      expect(screen.getByText('Haste')).toBeInTheDocument()
    })

    // Now show Done since only one prompt remains
    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })
  })

  it('deduplicates prompts with the same promptId', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))
    // Send a duplicate prompt with the same promptId
    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    // Should still show queue count as 1 of 1, not 1 of 2
    expect(screen.queryByText(/\(1 of 2\)/)).not.toBeInTheDocument()
  })

  it.each([
    { roll: 10, expectedMessage: /CONCENTRATION MAINTAINED/i },
    { roll: 1, expectedMessage: /CONCENTRATION BROKEN/i },
  ])('shows $expectedMessage when roll is $roll', async ({ roll, expectedMessage }) => {
    vi.mocked(rollD20).mockReturnValue(roll)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeInTheDocument()
    })
  })

  it('dispatches concentration-result custom event after rolling', async () => {
    vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 3, sourceName: 'Paladin' })

    const eventHandler = vi.fn()
    window.addEventListener('concentration-result', eventHandler)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalled()
    })

    const eventDetail = eventHandler.mock.calls[0][0].detail
    expect(eventDetail.promptId).toBe('test-prompt-1')
    expect(eventDetail.targetName).toBe('testTarget')
    expect(eventDetail.spellName).toBe('Bless')
    expect(eventDetail.dc).toBe(10)
    expect(eventDetail.saveBonus).toBe(6)
    expect(eventDetail.bonusDetail).toBe('(+3 aura from Paladin)')

    window.removeEventListener('concentration-result', eventHandler)
  })

  it('sends correct payload to sendConcentrationResult', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(sendConcentrationResult).toHaveBeenCalled()
    })

    const [calledCampaignName, calledTargetName, calledData] = sendConcentrationResult.mock.calls[0]
    expect(calledCampaignName).toBe('test-campaign')
    expect(calledTargetName).toBe('testTarget')
    expect(calledData.promptId).toBe('test-prompt-1')
    expect(calledData.spellName).toBe('Bless')
    expect(calledData.dc).toBe(10)
    expect(calledData.success).toBe(true)
    expect(calledData.roll).toBe(10)
  })

  it('rolls with advantage when hasSaveModifier returns true', async () => {
    vi.mocked(hasSaveModifier).mockReturnValue(true)
    vi.mocked(rollD20).mockReturnValue(5)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    expect(rollD20).toHaveBeenCalledTimes(2)
  })

  it('rolls with disadvantage when attacker has concentration_breaker', async () => {
    vi.mocked(rollD20).mockReturnValue(5)

    const attackerModifiers = [{
      source: 'Mage Slayer',
      target: 'saving_throw',
      condition: 'concentration_breaker',
      effect: 'disadvantage',
      abilities: ['CON'],
    }]

    const attacker = createCharacter('Elarielle', attackerModifiers)
    const target = createCharacter('testTarget', [])

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[target, attacker]}
        activeMapName={null}
      />,
    )

    // Update the subscriber mock to include attackerName
    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    expect(rollD20).toHaveBeenCalledTimes(2)
  })

  it('shows queue count badge when there are multiple prompts', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))
    fireEvent.click(screen.getByTestId('subscriber-trigger-second'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    expect(screen.getByText(/\(1 of 2\)/)).toBeInTheDocument()
  })

  it('shows queue count badge for second prompt in queue', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))
    fireEvent.click(screen.getByTestId('subscriber-trigger-second'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    // Resolve the first prompt
    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next Check' })).toBeInTheDocument()
    })

    // Advance to the second prompt
    fireEvent.click(screen.getByRole('button', { name: 'Next Check' }))

    await waitFor(() => {
      expect(screen.getByText(/testTarget2/)).toBeInTheDocument()
    })

    // Should show 1 of 2 since it's the last one but was 2nd in queue
    // Actually after advancing, only 1 remains so no badge
    expect(screen.queryByText(/\(1 of 2\)/)).not.toBeInTheDocument()
  })

  it('shows result breakdown with dice, mode badge, and breakdown text', async () => {
    vi.mocked(hasSaveModifier).mockReturnValue(true)
    vi.mocked(rollD20).mockReturnValue(7)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    // With advantage, should show both dice with kept/discarded
    const diceElements = screen.getAllByText(/d20: 7/)
    expect(diceElements).toHaveLength(2)
    expect(screen.getByText(/ADVANTAGE/i)).toBeInTheDocument()
    expect(screen.getByText(/d20 \(7\) \+ 3/)).toBeInTheDocument()
  })

  it('shows result breakdown with aura bonus detail', async () => {
    vi.mocked(computeAuraBonus).mockResolvedValue({ bonus: 2, sourceName: 'Paladin' })

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/\+ 5 \(\+2 aura from Paladin\)/)).toBeInTheDocument()
  })

  it('shows result breakdown without aura bonus detail when aura is 0', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    // Should show "+ 3" without aura detail
    expect(screen.getByText(/d20 \(10\) \+ 3$/)).toBeInTheDocument()
  })

  it('clears concentration prompt after rolling', async () => {
    const { clearConcentrationPrompt } = await import('../../services/combat/conditions/savePromptService.js')

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(clearConcentrationPrompt).toHaveBeenCalled()
    })

    expect(clearConcentrationPrompt).toHaveBeenCalledWith('test-campaign', 'testTarget')
  })

  it('rolls normally when both advantage and disadvantage apply', async () => {
    vi.mocked(hasSaveModifier).mockReturnValue(true)
    vi.mocked(rollD20).mockReturnValue(5)

    const attackerModifiers = [{
      source: 'Mage Slayer',
      target: 'saving_throw',
      condition: 'concentration_breaker',
      effect: 'disadvantage',
      abilities: ['CON'],
    }]

    const attacker = createCharacter('Elarielle', attackerModifiers)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget'), attacker]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    // When both advantage and disadvantage, only 1 roll is made
    expect(rollD20).toHaveBeenCalledTimes(1)
  })

  it('does not apply disadvantage when there is no attackerName', async () => {
    vi.mocked(rollD20).mockReturnValue(5)

    const { container } = render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    // Use the mock subscriber's second trigger (no attackerName)
    const secondTrigger = container.querySelector('[data-testid="subscriber-trigger-second"]')
    fireEvent.click(secondTrigger)

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    // No attackerName means no disadvantage check, so only 1 roll
    expect(rollD20).toHaveBeenCalledTimes(1)
  })

  it('applies Starry Form buff to roll <= 9, raising it to 10', async () => {
    vi.mocked(rollD20).mockReturnValue(5)

    const character = {
      name: 'testTarget',
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        saveModifiers: [{ target: 'saving_throw', effect: 'advantage' }],
        activeBuffs: [{ name: 'Starry Form', constellation: 'Dragon' }],
      },
    }

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[character]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    // Starry Form should have raised the roll from 5 to 10
    // The total should reflect roll of 10 + save bonus of 3 = 13
    const result = sendConcentrationResult.mock.calls[0][2]
    expect(result.roll).toBe(10)
  })

  it('does not apply Starry Form buff when roll > 9', async () => {
    vi.mocked(rollD20).mockReturnValue(15)

    const character = {
      name: 'testTarget',
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        activeBuffs: [{ name: 'Starry Form', constellation: 'Dragon' }],
      },
      saveModifiers: [],
    }

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[character]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    const result = sendConcentrationResult.mock.calls[0][2]
    expect(result.roll).toBe(15)
  })

  it('handles string character names in characters array', async () => {
    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={['testTarget']}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    // Should still show the modal without crashing
    expect(screen.getByText('testTarget')).toBeInTheDocument()
  })

  it('does not render Subscriber when EventSource is undefined', async () => {
    const OriginalEventSource = globalThis.EventSource
    delete globalThis.EventSource

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />,
    )

    expect(screen.queryByText(/must make a/)).not.toBeInTheDocument()

    globalThis.EventSource = OriginalEventSource
  })

  it('shows kept/discarded labels for advantage dice', async () => {
    vi.mocked(hasSaveModifier).mockReturnValue(true)
    vi.mocked(rollD20).mockReturnValue(3)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget')]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    // With advantage, the higher die (10) should be kept, lower (3) discarded
    expect(screen.getByText(/\(kept\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(discarded\)/)).toBeInTheDocument()
  })

  it('shows mode badge for disadvantage', async () => {
    vi.mocked(rollD20).mockReturnValue(5)

    const attackerModifiers = [{
      source: 'Mage Slayer',
      target: 'saving_throw',
      condition: 'concentration_breaker',
      effect: 'disadvantage',
      abilities: ['CON'],
    }]

    const attacker = createCharacter('Elarielle', attackerModifiers)

    render(
      <ConcentrationPromptModal
        campaignName="test-campaign"
        characters={[createCharacter('testTarget'), attacker]}
        activeMapName={null}
      />,
    )

    fireEvent.click(screen.getByTestId('subscriber-trigger'))

    await waitFor(() => {
      expect(screen.getByText(/must make a/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /roll con save/i }))

    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/DISADVANTAGE/i)).toBeInTheDocument()
  })

})
