import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

    it('renders "no character" when playerSummary is missing', () => {
      render(<MockCharSheet />);
      expect(screen.getByTestId('character-name')).toHaveTextContent('no character');
    });

    it('renders "no character" when playerSummary has no name', () => {
      render(<MockCharSheet playerSummary={{}} />);
      expect(screen.getByTestId('character-name')).toHaveTextContent('no character');
    });

    it('calls onDeleteCharacter with the character name when delete is clicked', () => {
      const onDelete = vi.fn();
      render(<MockCharSheet playerSummary={{ name: 'TestChar' }} onDeleteCharacter={onDelete} />);
      screen.getByTitle('Delete Character').click();
      expect(onDelete).toHaveBeenCalledWith('TestChar');
    });

    it('calls onDeleteCharacter with undefined when no name', () => {
      const onDelete = vi.fn();
      render(<MockCharSheet onDeleteCharacter={onDelete} />);
      screen.getByTitle('Delete Character').click();
      expect(onDelete).toHaveBeenCalledWith(undefined);
    });

    it('calls onDeleteCharacter with undefined when playerSummary exists but has no name', () => {
      const onDelete = vi.fn();
      render(<MockCharSheet playerSummary={{}} onDeleteCharacter={onDelete} />);
      screen.getByTitle('Delete Character').click();
      expect(onDelete).toHaveBeenCalledWith(undefined);
    });

    it('invokes onUploadClick when upload button is clicked', () => {
      const onUploadClick = vi.fn();
      render(<MockCharSheet onUploadClick={onUploadClick} />);
      screen.getByText('Upload').click();
      expect(onUploadClick).toHaveBeenCalled();
    });

    it('invokes onSaveClick when download button is clicked', () => {
      const onSaveClick = vi.fn();
      render(<MockCharSheet onSaveClick={onSaveClick} />);
      screen.getByText('Download').click();
      expect(onSaveClick).toHaveBeenCalled();
    });

    it('invokes onEditCharacter when edit button is clicked', () => {
      const onEditCharacter = vi.fn();
      render(<MockCharSheet onEditCharacter={onEditCharacter} />);
      screen.getByText('Edit').click();
      expect(onEditCharacter).toHaveBeenCalled();
    });
  });

  describe('MockInitiative', () => {
    it('renders the correct character count', () => {
      render(<MockInitiative characters={['a', 'b', 'c']} campaignName="test" />);
      expect(screen.getByTestId('init-char-count')).toHaveTextContent('3');
    });

    it('renders 0 when characters is undefined', () => {
      render(<MockInitiative campaignName="test" />);
      expect(screen.getByTestId('init-char-count')).toHaveTextContent('0');
    });

    it('renders 0 when characters is an empty array', () => {
      render(<MockInitiative characters={[]} campaignName="test" />);
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
      screen.getByTestId('select-campaign-btn').click();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0]).toBe('test-campaign');
      expect(onSelect.mock.calls[0][1]).toEqual([]);
    });
  });

  describe('MockWizard', () => {
    it('calls onComplete with default character data when complete is clicked', () => {
      const onComplete = vi.fn();
      render(<MockWizard onComplete={onComplete} onCancel={vi.fn()} />);
      screen.getByTestId('wizard-complete-btn').click();
      expect(onComplete).toHaveBeenCalledWith({ name: 'New Character', level: 1 });
    });

    it('calls onCancel when cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<MockWizard onComplete={vi.fn()} onCancel={onCancel} />);
      screen.getByTestId('wizard-cancel-btn').click();
      expect(onCancel).toHaveBeenCalled();
    });

    it('renders the editing character name when characterData is provided', () => {
      render(<MockWizard characterData={{ name: 'EditMe' }} />);
      expect(screen.getByTestId('editing-character')).toHaveTextContent('EditMe');
    });

    it('does not render editing-character indicator when characterData is null', () => {
      render(<MockWizard characterData={null} />);
      expect(screen.queryByTestId('editing-character')).toBeNull();
    });

    it('does not render editing-character indicator when characterData is undefined', () => {
      render(<MockWizard />);
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

    it('renders localhost as a string', () => {
      render(<MockSidebar campaignName="test" isLocalhost={true} />);
      expect(screen.getByTestId('sidebar-localhost')).toHaveTextContent('true');
    });

    it('renders an active indicator when activeView is provided', () => {
      render(<MockSidebar activeView="charSheet" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toBeInTheDocument();
    });

    it('shows the active character name for charSheet view', () => {
      render(<MockSidebar activeView="charSheet" activeCharacter={{ name: 'Hero' }} campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Hero');
    });

    it('shows the view label when activeView has no activeCharacter', () => {
      render(<MockSidebar activeView="encounter" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Encounters');
    });

    it('shows "Character" label when activeView is charSheet without activeCharacter', () => {
      render(<MockSidebar activeView="charSheet" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Character');
    });

    it('shows the view label even when activeCharacter is present but view is not charSheet', () => {
      render(<MockSidebar activeView="encounter" activeCharacter={{ name: 'Hero' }} campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Encounters');
    });

    it('renders an empty active indicator for an unknown view', () => {
      render(<MockSidebar activeView="unknownView" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator').textContent).toBe('');
    });

    it('does not render an active indicator when activeView is not provided', () => {
      render(<MockSidebar campaignName="test" />);
      expect(screen.queryByTestId('sidebar-active-indicator')).toBeNull();
    });

    it('calls onBackToCampaigns when the back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockSidebar campaignName="test" onBackToCampaigns={onBack} />);
      screen.getByTestId('back-to-campaigns-btn').click();
      expect(onBack).toHaveBeenCalled();
    });

    it('calls onAddCharacter when the add character button is clicked', () => {
      const onAdd = vi.fn();
      render(<MockSidebar campaignName="test" onAddCharacter={onAdd} />);
      screen.getByTestId('add-character-btn').click();
      expect(onAdd).toHaveBeenCalled();
    });

    it('renders character buttons and invokes onCharacterClick', () => {
      const onClick = vi.fn();
      render(<MockSidebar campaignName="test" characters={[{ name: 'Char1' }, { name: 'Char2' }]} onCharacterClick={onClick} />);
      expect(screen.getByTestId('char-btn-Char1')).toHaveTextContent('Char1');
      expect(screen.getByTestId('char-btn-Char2')).toHaveTextContent('Char2');
      screen.getByTestId('char-btn-Char1').click();
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
      screen.getByTestId('initiative-btn').click();
      expect(onInit).toHaveBeenCalled();
    });

    it('renders "Maps" on localhost and "Map" on non-localhost', () => {
      render(<MockSidebar campaignName="test" isLocalhost={true} onMapsClick={vi.fn()} />);
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Maps');
      cleanup();
      render(<MockSidebar campaignName="test" isLocalhost={false} onMapsClick={vi.fn()} />);
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Map');
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

    it('renders the admin button only on localhost', () => {
      const onRepair = vi.fn();
      render(<MockSidebar campaignName="test" isLocalhost={true} onRepairClick={onRepair} />);
      expect(screen.getByTestId('admin-btn')).toBeInTheDocument();
      screen.getByTestId('admin-btn').click();
      expect(onRepair).toHaveBeenCalled();
      cleanup();
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
      screen.getByTestId('notes-btn').click();
      screen.getByTestId('encounter-btn').click();
      screen.getByTestId('factions-btn').click();
      screen.getByTestId('npcs-btn').click();
      screen.getByTestId('quests-btn').click();
      screen.getByTestId('settlements-btn').click();
      screen.getByTestId('log-btn').click();
      expect(callbacks.onNotesClick).toHaveBeenCalled();
      expect(callbacks.onEncounterClick).toHaveBeenCalled();
      expect(callbacks.onFactionsClick).toHaveBeenCalled();
      expect(callbacks.onNPCsClick).toHaveBeenCalled();
      expect(callbacks.onQuestsClick).toHaveBeenCalled();
      expect(callbacks.onSettlementsClick).toHaveBeenCalled();
      expect(callbacks.onLogClick).toHaveBeenCalled();
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
      screen.getByTestId('open-map-btn').click();
      expect(onOpenMap).toHaveBeenCalledWith('dungeon-1');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockMapsManager campaignName="test" onOpenMap={vi.fn()} onBack={onBack} />);
      screen.getByTestId('mm-back-btn').click();
      expect(onBack).toHaveBeenCalled();
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

    it('renders the correct character count', () => {
      render(<MockMap mapName="m" campaignName="t" characters={['a', 'b']} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-char-count')).toHaveTextContent('2');
    });

    it('renders 0 character count when characters is undefined or empty', () => {
      render(<MockMap mapName="m" campaignName="t" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-char-count')).toHaveTextContent('0');
      cleanup();
      render(<MockMap mapName="m" campaignName="t" characters={[]} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-char-count')).toHaveTextContent('0');
    });

    it('renders the correct npc count', () => {
      render(<MockMap mapName="m" campaignName="t" characters={[]} npcs={['n1', 'n2']} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-npc-count')).toHaveTextContent('2');
    });

    it('renders 0 npc count when npcs is undefined or empty', () => {
      render(<MockMap mapName="m" campaignName="t" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-npc-count')).toHaveTextContent('0');
      cleanup();
      render(<MockMap mapName="m" campaignName="t" characters={[]} npcs={[]} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-npc-count')).toHaveTextContent('0');
    });

    it('renders localhost as a string', () => {
      render(<MockMap mapName="m" campaignName="t" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-localhost')).toHaveTextContent('true');
      cleanup();
      render(<MockMap mapName="m" campaignName="t" isLocalhost={false} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-localhost')).toHaveTextContent('false');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockMap mapName="m" campaignName="t" onBack={onBack} />);
      screen.getByTestId('map-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockEncounterBuilder', () => {
    it('renders the correct character count', () => {
      render(<MockEncounterBuilder characters={['c1', 'c2', 'c3']} campaignName="test" />);
      expect(screen.getByTestId('eb-char-count')).toHaveTextContent('3');
    });

    it('renders 0 character count when characters is undefined or empty', () => {
      render(<MockEncounterBuilder campaignName="test" />);
      expect(screen.getByTestId('eb-char-count')).toHaveTextContent('0');
      cleanup();
      render(<MockEncounterBuilder characters={[]} campaignName="test" />);
      expect(screen.getByTestId('eb-char-count')).toHaveTextContent('0');
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

    it('renders localhost as a string', () => {
      render(<MockNotes campaignName="test" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('notes-localhost')).toHaveTextContent('true');
      cleanup();
      render(<MockNotes campaignName="test" isLocalhost={false} onBack={vi.fn()} />);
      expect(screen.getByTestId('notes-localhost')).toHaveTextContent('false');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockNotes campaignName="test" isLocalhost={false} onBack={onBack} />);
      screen.getByTestId('notes-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockQuests', () => {
    it('renders the campaign name', () => {
      render(<MockQuests campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-campaign')).toHaveTextContent('my-campaign');
    });

    it('renders localhost as a string', () => {
      render(<MockQuests campaignName="test" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-localhost')).toHaveTextContent('true');
      cleanup();
      render(<MockQuests campaignName="test" isLocalhost={false} onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-localhost')).toHaveTextContent('false');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockQuests campaignName="test" isLocalhost={false} onBack={onBack} />);
      screen.getByTestId('quests-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockNPCs', () => {
    it('renders the campaign name', () => {
      render(<MockNPCs campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-campaign')).toHaveTextContent('my-campaign');
    });

    it('renders the correct character count', () => {
      render(<MockNPCs campaignName="test" characters={['c1', 'c2']} onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-char-count')).toHaveTextContent('2');
    });

    it('renders 0 character count when characters is undefined or empty', () => {
      render(<MockNPCs campaignName="test" onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-char-count')).toHaveTextContent('0');
      cleanup();
      render(<MockNPCs campaignName="test" characters={[]} onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-char-count')).toHaveTextContent('0');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockNPCs campaignName="test" characters={[]} onBack={onBack} />);
      screen.getByTestId('npcs-back-btn').click();
      expect(onBack).toHaveBeenCalled();
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
      screen.getByTestId('settlements-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockLog', () => {
    it('renders the campaign name', () => {
      render(<MockLog campaignName="my-campaign" characters={[]} />);
      expect(screen.getByTestId('log-campaign')).toHaveTextContent('my-campaign');
    });

    it('renders the correct character count', () => {
      render(<MockLog campaignName="test" characters={['c1', 'c2', 'c3']} />);
      expect(screen.getByTestId('log-char-count')).toHaveTextContent('3');
    });

    it('renders 0 character count when characters is undefined or empty', () => {
      render(<MockLog campaignName="test" />);
      expect(screen.getByTestId('log-char-count')).toHaveTextContent('0');
      cleanup();
      render(<MockLog campaignName="test" characters={[]} />);
      expect(screen.getByTestId('log-char-count')).toHaveTextContent('0');
    });
  });

  describe('MockFactions', () => {
    it('renders the campaign name', () => {
      render(<MockFactions campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-campaign')).toHaveTextContent('my-campaign');
    });

    it('renders localhost as a string', () => {
      render(<MockFactions campaignName="test" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-localhost')).toHaveTextContent('true');
      cleanup();
      render(<MockFactions campaignName="test" isLocalhost={false} onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-localhost')).toHaveTextContent('false');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockFactions campaignName="test" isLocalhost={false} onBack={onBack} />);
      screen.getByTestId('factions-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockCampaignAdmin', () => {
    it('renders the campaign name', () => {
      render(<MockCampaignAdmin campaignName="my-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-campaign')).toHaveTextContent('my-campaign');
    });

    it('renders the theme value', () => {
      render(<MockCampaignAdmin campaignName="test" theme="dark" onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-theme')).toHaveTextContent('dark');
      cleanup();
      render(<MockCampaignAdmin campaignName="test" theme="light" onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-theme')).toHaveTextContent('light');
    });

    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onBack={onBack} />);
      screen.getByTestId('admin-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });

    it('calls toggleTheme when toggle theme button is clicked', () => {
      const toggleTheme = vi.fn();
      render(<MockCampaignAdmin campaignName="test" theme="light" toggleTheme={toggleTheme} onBack={vi.fn()} />);
      screen.getByTestId('admin-toggle-theme-btn').click();
      expect(toggleTheme).toHaveBeenCalled();
    });

    it('calls onRenameCampaign when rename button is clicked', () => {
      const onRename = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onRenameCampaign={onRename} onBack={vi.fn()} />);
      screen.getByTestId('admin-rename-btn').click();
      expect(onRename).toHaveBeenCalled();
    });

    it('calls onDeleteCampaign when delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onDeleteCampaign={onDelete} onBack={vi.fn()} />);
      screen.getByTestId('admin-delete-btn').click();
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
