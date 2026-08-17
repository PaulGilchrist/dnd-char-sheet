// @cleaned-by-ai

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MockCharSheet,
  MockInitiative,
  MockCampaignSelection,
  MockWizard,
  MockSidebar,
  MockMapsManager,
  MockMap,
  MockEncounterBuilder,
  MockNotes,
  MockQuests,
  MockNPCs,
  MockSettlements,
  MockLog,
  MockFactions,
  MockCampaignAdmin,
} from './mockComponents';

describe('mockComponents', () => {
  describe('MockCharSheet', () => {
    it('renders character name from playerSummary', () => {
      render(<MockCharSheet playerSummary={{ name: 'TestChar' }} />);
      expect(screen.getByTestId('character-name')).toHaveTextContent('TestChar');
    });

    it.each([
      ['missing', undefined],
      ['has no name', {}],
    ])('renders "no character" when playerSummary is %s', (_label, playerSummary) => {
      render(<MockCharSheet playerSummary={playerSummary} />);
      expect(screen.getByTestId('character-name')).toHaveTextContent('no character');
    });

    it('calls onDeleteCharacter with the character name when delete is clicked', () => {
      const onDelete = vi.fn();
      render(<MockCharSheet playerSummary={{ name: 'TestChar' }} onDeleteCharacter={onDelete} />);
      fireEvent.click(screen.getByTitle('Delete Character'));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('TestChar');
    });

    it.each([
      ['missing', undefined],
      ['has no name', {}],
    ])('calls onDeleteCharacter with undefined when playerSummary is %s', (_label, playerSummary) => {
      const onDelete = vi.fn();
      render(<MockCharSheet playerSummary={playerSummary} onDeleteCharacter={onDelete} />);
      fireEvent.click(screen.getByTitle('Delete Character'));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(undefined);
    });

    it('invokes onUploadClick when upload button is clicked', () => {
      const onUploadClick = vi.fn();
      render(<MockCharSheet onUploadClick={onUploadClick} />);
      fireEvent.click(screen.getByText('Upload'));
      expect(onUploadClick).toHaveBeenCalledTimes(1);
    });

    it('invokes onSaveClick when download button is clicked', () => {
      const onSaveClick = vi.fn();
      render(<MockCharSheet onSaveClick={onSaveClick} />);
      fireEvent.click(screen.getByText('Download'));
      expect(onSaveClick).toHaveBeenCalledTimes(1);
    });

    it('invokes onEditCharacter when edit button is clicked', () => {
      const onEditCharacter = vi.fn();
      render(<MockCharSheet onEditCharacter={onEditCharacter} />);
      fireEvent.click(screen.getByText('Edit'));
      expect(onEditCharacter).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockInitiative', () => {
    it('renders the number of characters', () => {
      render(<MockInitiative characters={['a', 'b', 'c']} campaignName="test" />);
      expect(screen.getByTestId('init-char-count')).toHaveTextContent('3');
    });

    it.each([
      ['undefined', undefined],
      ['an empty array', []],
    ])('renders 0 when characters is %s', (_label, characters) => {
      render(<MockInitiative characters={characters} campaignName="test" />);
      expect(screen.getByTestId('init-char-count')).toHaveTextContent('0');
    });

    it('renders the campaign name', () => {
      render(<MockInitiative characters={[]} campaignName="my-campaign" />);
      expect(screen.getByTestId('init-campaign')).toHaveTextContent('my-campaign');
    });
  });

  describe('MockCampaignSelection', () => {
    it('calls onCampaignSelect with the mock campaign name and characters array', () => {
      const onSelect = vi.fn();
      render(<MockCampaignSelection onCampaignSelect={onSelect} />);
      fireEvent.click(screen.getByTestId('select-campaign-btn'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('test-campaign', []);
    });
  });

  describe('MockWizard', () => {
    it('calls onComplete with default character data when complete is clicked', () => {
      const onComplete = vi.fn();
      render(<MockWizard onComplete={onComplete} onCancel={vi.fn()} />);
      fireEvent.click(screen.getByTestId('wizard-complete-btn'));
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({ name: 'New Character', level: 1 });
    });

    it('calls onCancel when cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<MockWizard onComplete={vi.fn()} onCancel={onCancel} />);
      fireEvent.click(screen.getByTestId('wizard-cancel-btn'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('renders the editing character name when characterData is provided', () => {
      render(<MockWizard characterData={{ name: 'EditMe' }} />);
      expect(screen.getByTestId('editing-character')).toHaveTextContent('EditMe');
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('does not render the editing character indicator when characterData is %s', (_label, characterData) => {
      render(<MockWizard characterData={characterData} />);
      expect(screen.queryByTestId('editing-character')).toBeNull();
    });

    it('renders editing mode indicator when isEditing is true', () => {
      render(<MockWizard isEditing={true} />);
      expect(screen.getByTestId('editing-mode')).toHaveTextContent('Editing Mode');
    });

    it('does not render editing mode when isEditing is false', () => {
      render(<MockWizard isEditing={false} />);
      expect(screen.queryByTestId('editing-mode')).toBeNull();
    });
  });

  describe('MockSidebar', () => {
    it('renders the campaign name', () => {
      render(<MockSidebar campaignName="my-campaign" />);
      expect(screen.getByTestId('sidebar-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('renders the isLocalhost prop value when it is %s', (expected, isLocalhost) => {
      render(<MockSidebar campaignName="test" isLocalhost={isLocalhost} />);
      expect(screen.getByTestId('sidebar-localhost')).toHaveTextContent(expected);
    });

    it('renders an active indicator when activeView is provided', () => {
      render(<MockSidebar activeView="charSheet" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toBeInTheDocument();
    });

    it('shows the active character name in the indicator for charSheet view', () => {
      render(<MockSidebar activeView="charSheet" activeCharacter={{ name: 'Hero' }} campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Hero');
    });

    it.each([
      ['Encounters', 'encounter'],
      ['Factions', 'factions'],
      ['Initiative', 'initiative'],
      ['Maps', 'mapsManager'],
      ['Notes', 'notes'],
      ['Quests', 'quests'],
      ['NPCs', 'npcs'],
      ['Settlements', 'settlements'],
      ['Log', 'campaignLog'],
      ['', 'unknownView'],
    ])('shows "%s" in the active indicator for the %s view', (expected, activeView) => {
      render(<MockSidebar activeView={activeView} campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent(expected);
    });

    it('ignores activeCharacter for non-charSheet views', () => {
      render(<MockSidebar activeView="encounter" activeCharacter={{ name: 'Hero' }} campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Encounters');
    });

    it('does not render an active indicator when activeView is not provided', () => {
      render(<MockSidebar campaignName="test" />);
      expect(screen.queryByTestId('sidebar-active-indicator')).toBeNull();
    });

    it('calls onBackToCampaigns when the back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockSidebar campaignName="test" onBackToCampaigns={onBack} />);
      fireEvent.click(screen.getByTestId('back-to-campaigns-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onAddCharacter when the add character button is clicked', () => {
      const onAdd = vi.fn();
      render(<MockSidebar campaignName="test" onAddCharacter={onAdd} />);
      fireEvent.click(screen.getByTestId('add-character-btn'));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('renders character buttons and invokes onCharacterClick with the character', () => {
      const onClick = vi.fn();
      render(<MockSidebar campaignName="test" characters={[{ name: 'Char1' }, { name: 'Char2' }]} onCharacterClick={onClick} />);
      expect(screen.getByTestId('char-btn-Char1')).toHaveTextContent('Char1');
      expect(screen.getByTestId('char-btn-Char2')).toHaveTextContent('Char2');
      fireEvent.click(screen.getByTestId('char-btn-Char1'));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith({ name: 'Char1' });
    });

    it('does not render character buttons when characters is undefined', () => {
      render(<MockSidebar campaignName="test" onCharacterClick={vi.fn()} />);
      expect(screen.queryByTestId('char-btn-Char1')).toBeNull();
    });

    it('applies active class to the active character button', () => {
      render(<MockSidebar campaignName="test" characters={[{ name: 'ActiveChar' }]} activeView="charSheet" activeCharacter={{ name: 'ActiveChar' }} onCharacterClick={vi.fn()} />);
      expect(screen.getByTestId('char-btn-ActiveChar')).toHaveClass('active');
    });

    it('does not apply active class to inactive character buttons', () => {
      render(<MockSidebar campaignName="test" characters={[{ name: 'InactiveChar' }]} activeView="charSheet" activeCharacter={{ name: 'OtherChar' }} onCharacterClick={vi.fn()} />);
      expect(screen.getByTestId('char-btn-InactiveChar')).not.toHaveClass('active');
    });

    it('calls onInitiativeClick when initiative button is clicked', () => {
      const onInit = vi.fn();
      render(<MockSidebar campaignName="test" onInitiativeClick={onInit} />);
      fireEvent.click(screen.getByTestId('initiative-btn'));
      expect(onInit).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['Maps', true],
      ['Map', false],
    ])('renders the maps button as "%s" on %s-localhost', (label, isLocalhost) => {
      render(<MockSidebar campaignName="test" isLocalhost={isLocalhost} onMapsClick={vi.fn()} />);
      expect(screen.getByTestId('maps-btn')).toHaveTextContent(label);
    });

    it('renders all navigation buttons', () => {
      render(<MockSidebar campaignName="test" isLocalhost={true}
        onNotesClick={vi.fn()} onEncounterClick={vi.fn()} onFactionsClick={vi.fn()}
        onNPCsClick={vi.fn()} onQuestsClick={vi.fn()} onSettlementsClick={vi.fn()} onLogClick={vi.fn()}
      />);
      expect(screen.getByTestId('notes-btn')).toBeInTheDocument();
      expect(screen.getByTestId('encounter-btn')).toBeInTheDocument();
      expect(screen.getByTestId('factions-btn')).toBeInTheDocument();
      expect(screen.getByTestId('npcs-btn')).toBeInTheDocument();
      expect(screen.getByTestId('quests-btn')).toBeInTheDocument();
      expect(screen.getByTestId('settlements-btn')).toBeInTheDocument();
      expect(screen.getByTestId('log-btn')).toBeInTheDocument();
    });

    it('renders the admin button and invokes onRepairClick on localhost', () => {
      const onRepair = vi.fn();
      render(<MockSidebar campaignName="test" isLocalhost={true} onRepairClick={onRepair} />);
      fireEvent.click(screen.getByTestId('admin-btn'));
      expect(onRepair).toHaveBeenCalledTimes(1);
    });

    it('does not render the admin button on non-localhost', () => {
      render(<MockSidebar campaignName="test" isLocalhost={false} />);
      expect(screen.queryByTestId('admin-btn')).toBeNull();
    });

    it('invokes all navigation callbacks when their buttons are clicked', () => {
      const callbacks = {
        onNotesClick: vi.fn(),
        onEncounterClick: vi.fn(),
        onFactionsClick: vi.fn(),
        onNPCsClick: vi.fn(),
        onQuestsClick: vi.fn(),
        onSettlementsClick: vi.fn(),
        onLogClick: vi.fn(),
      };
      render(<MockSidebar campaignName="test" isLocalhost={true} {...callbacks} />);
      fireEvent.click(screen.getByTestId('notes-btn'));
      fireEvent.click(screen.getByTestId('encounter-btn'));
      fireEvent.click(screen.getByTestId('factions-btn'));
      fireEvent.click(screen.getByTestId('npcs-btn'));
      fireEvent.click(screen.getByTestId('quests-btn'));
      fireEvent.click(screen.getByTestId('settlements-btn'));
      fireEvent.click(screen.getByTestId('log-btn'));
      Object.values(callbacks).forEach((cb) => {
        expect(cb).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('MockMapsManager', () => {
    it('renders the campaign name', () => {
      render(<MockMapsManager campaignName="my-campaign" onOpenMap={vi.fn()} onBack={vi.fn()} />);
      expect(screen.getByTestId('mm-campaign')).toHaveTextContent('my-campaign');
    });

    it('calls onOpenMap with "dungeon-1" when open map button is clicked', () => {
      const onOpenMap = vi.fn();
      render(<MockMapsManager campaignName="test" onOpenMap={onOpenMap} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('open-map-btn'));
      expect(onOpenMap).toHaveBeenCalledTimes(1);
      expect(onOpenMap).toHaveBeenCalledWith('dungeon-1');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockMapsManager campaignName="test" onOpenMap={vi.fn()} onBack={onBack} />);
      fireEvent.click(screen.getByTestId('mm-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockMap', () => {
    it('renders the map name', () => {
      render(<MockMap mapName="dungeon-1" campaignName="test" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-name')).toHaveTextContent('dungeon-1');
    });

    it('renders the campaign name', () => {
      render(<MockMap mapName="m" campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['two characters', ['a', 'b'], '2'],
      ['an empty array', [], '0'],
      ['no characters prop', undefined, '0'],
    ])('renders the character count for %s', (_label, characters, expected) => {
      render(<MockMap mapName="m" campaignName="t" characters={characters} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-char-count')).toHaveTextContent(expected);
    });

    it.each([
      ['two npcs', ['n1', 'n2'], '2'],
      ['an empty array', [], '0'],
      ['no npcs prop', undefined, '0'],
    ])('renders the npc count for %s', (_label, npcs, expected) => {
      render(<MockMap mapName="m" campaignName="t" characters={[]} npcs={npcs} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-npc-count')).toHaveTextContent(expected);
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('renders the isLocalhost prop value when it is %s', (expected, isLocalhost) => {
      render(<MockMap mapName="m" campaignName="t" isLocalhost={isLocalhost} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-localhost')).toHaveTextContent(expected);
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockMap mapName="m" campaignName="t" onBack={onBack} />);
      fireEvent.click(screen.getByTestId('map-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockEncounterBuilder', () => {
    it.each([
      ['three characters', ['c1', 'c2', 'c3'], '3'],
      ['an empty array', [], '0'],
      ['no characters prop', undefined, '0'],
    ])('renders the character count for %s', (_label, characters, expected) => {
      render(<MockEncounterBuilder characters={characters} campaignName="test" />);
      expect(screen.getByTestId('eb-char-count')).toHaveTextContent(expected);
    });

    it('renders the campaign name', () => {
      render(<MockEncounterBuilder characters={[]} campaignName="my-campaign" />);
      expect(screen.getByTestId('eb-campaign')).toHaveTextContent('my-campaign');
    });
  });

  describe('MockNotes', () => {
    it('renders the campaign name', () => {
      render(<MockNotes campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('notes-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('renders the isLocalhost prop value when it is %s', (expected, isLocalhost) => {
      render(<MockNotes campaignName="test" isLocalhost={isLocalhost} onBack={vi.fn()} />);
      expect(screen.getByTestId('notes-localhost')).toHaveTextContent(expected);
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockNotes campaignName="test" isLocalhost={false} onBack={onBack} />);
      fireEvent.click(screen.getByTestId('notes-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockQuests', () => {
    it('renders the campaign name', () => {
      render(<MockQuests campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('renders the isLocalhost prop value when it is %s', (expected, isLocalhost) => {
      render(<MockQuests campaignName="test" isLocalhost={isLocalhost} onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-localhost')).toHaveTextContent(expected);
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockQuests campaignName="test" isLocalhost={false} onBack={onBack} />);
      fireEvent.click(screen.getByTestId('quests-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockNPCs', () => {
    it('renders the campaign name', () => {
      render(<MockNPCs campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['two characters', ['c1', 'c2'], '2'],
      ['an empty array', [], '0'],
      ['no characters prop', undefined, '0'],
    ])('renders the character count for %s', (_label, characters, expected) => {
      render(<MockNPCs campaignName="test" characters={characters} onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-char-count')).toHaveTextContent(expected);
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockNPCs campaignName="test" characters={[]} onBack={onBack} />);
      fireEvent.click(screen.getByTestId('npcs-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockSettlements', () => {
    it('renders the campaign name', () => {
      render(<MockSettlements campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('settlements-campaign')).toHaveTextContent('my-campaign');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockSettlements campaignName="test" onBack={onBack} />);
      fireEvent.click(screen.getByTestId('settlements-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockLog', () => {
    it('renders the campaign name', () => {
      render(<MockLog campaignName="my-campaign" characters={[]} />);
      expect(screen.getByTestId('log-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['three characters', ['c1', 'c2', 'c3'], '3'],
      ['an empty array', [], '0'],
      ['no characters prop', undefined, '0'],
    ])('renders the character count for %s', (_label, characters, expected) => {
      render(<MockLog campaignName="test" characters={characters} />);
      expect(screen.getByTestId('log-char-count')).toHaveTextContent(expected);
    });
  });

  describe('MockFactions', () => {
    it('renders the campaign name', () => {
      render(<MockFactions campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-campaign')).toHaveTextContent('my-campaign');
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('renders the isLocalhost prop value when it is %s', (expected, isLocalhost) => {
      render(<MockFactions campaignName="test" isLocalhost={isLocalhost} onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-localhost')).toHaveTextContent(expected);
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockFactions campaignName="test" isLocalhost={false} onBack={onBack} />);
      fireEvent.click(screen.getByTestId('factions-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('MockCampaignAdmin', () => {
    it('renders the campaign name', () => {
      render(<MockCampaignAdmin campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-campaign')).toHaveTextContent('my-campaign');
    });

    it.each(['dark', 'light'])('renders the theme value "%s"', (theme) => {
      render(<MockCampaignAdmin campaignName="test" theme={theme} onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-theme')).toHaveTextContent(theme);
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onBack={onBack} />);
      fireEvent.click(screen.getByTestId('admin-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls toggleTheme when toggle theme button is clicked', () => {
      const toggleTheme = vi.fn();
      render(<MockCampaignAdmin campaignName="test" theme="light" toggleTheme={toggleTheme} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('admin-toggle-theme-btn'));
      expect(toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('calls onRenameCampaign when rename button is clicked', () => {
      const onRename = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onRenameCampaign={onRename} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('admin-rename-btn'));
      expect(onRename).toHaveBeenCalledTimes(1);
    });

    it('calls onDeleteCampaign when delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onDeleteCampaign={onDelete} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('admin-delete-btn'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });
});
