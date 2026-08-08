import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    it('should render as a vi.fn component', () => {
      expect(MockCharSheet).toBeTypeOf('function');
    });

    it('should render character name from props', () => {
      render(<MockCharSheet playerSummary={{ name: 'TestChar' }} />);
      expect(screen.getByTestId('character-name')).toHaveTextContent('TestChar');
    });

    it('should render "no character" when no playerSummary', () => {
      render(<MockCharSheet />);
      expect(screen.getByTestId('character-name')).toHaveTextContent('no character');
    });

    it('should render delete button with onClick handler', () => {
      const onDelete = vi.fn();
      render(<MockCharSheet playerSummary={{ name: 'TestChar' }} onDeleteCharacter={onDelete} />);
      screen.getByTitle('Delete Character').click();
      expect(onDelete).toHaveBeenCalledWith('TestChar');
    });

    it('should call onDeleteCharacter with undefined when no name', () => {
      const onDelete = vi.fn();
      render(<MockCharSheet onDeleteCharacter={onDelete} />);
      screen.getByTitle('Delete Character').click();
      expect(onDelete).toHaveBeenCalledWith(undefined);
    });

    it('should render upload button with onClick handler', () => {
      const onUploadClick = vi.fn();
      render(<MockCharSheet onUploadClick={onUploadClick} />);
      screen.getByText('Upload').click();
      expect(onUploadClick).toHaveBeenCalled();
    });

    it('should render download button with onClick handler', () => {
      const onSaveClick = vi.fn();
      render(<MockCharSheet onSaveClick={onSaveClick} />);
      screen.getByText('Download').click();
      expect(onSaveClick).toHaveBeenCalled();
    });

    it('should render edit button with onClick handler', () => {
      const onEditCharacter = vi.fn();
      render(<MockCharSheet onEditCharacter={onEditCharacter} />);
      screen.getByText('Edit').click();
      expect(onEditCharacter).toHaveBeenCalled();
    });
  });

  describe('MockInitiative', () => {
    it('should render as a vi.fn component', () => {
      expect(MockInitiative).toBeTypeOf('function');
    });

    it('should render character count', () => {
      render(<MockInitiative characters={['a', 'b', 'c']} campaignName="test" />);
      expect(screen.getByTestId('init-char-count')).toHaveTextContent('3');
    });

    it('should render 0 when characters is undefined', () => {
      render(<MockInitiative campaignName="test" />);
      expect(screen.getByTestId('init-char-count')).toHaveTextContent('0');
    });

    it('should render campaign name', () => {
      render(<MockInitiative characters={[]} campaignName="test-campaign" />);
      expect(screen.getByTestId('init-campaign')).toHaveTextContent('test-campaign');
    });
  });

  describe('MockCampaignSelection', () => {
    it('should render as a vi.fn component', () => {
      expect(MockCampaignSelection).toBeTypeOf('function');
    });

    it('should render campaign selection button', () => {
      const onSelect = vi.fn();
      render(<MockCampaignSelection onCampaignSelect={onSelect} />);
      screen.getByText('Select Campaign').click();
      expect(onSelect).toHaveBeenCalledWith('test-campaign', []);
    });

    it('should call onCampaignSelect with mockState values', () => {
      const onSelect = vi.fn();
      render(<MockCampaignSelection onCampaignSelect={onSelect} />);
      screen.getByTestId('select-campaign-btn').click();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0]).toBe('test-campaign');
      expect(onSelect.mock.calls[0][1]).toEqual([]);
    });
  });

  describe('MockWizard', () => {
    it('should render as a vi.fn component', () => {
      expect(MockWizard).toBeTypeOf('function');
    });

    it('should render complete and cancel buttons', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();
      render(<MockWizard onComplete={onComplete} onCancel={onCancel} />);
      screen.getByTestId('wizard-complete-btn').click();
      expect(onComplete).toHaveBeenCalledWith({ name: 'New Character', level: 1 });
      screen.getByTestId('wizard-cancel-btn').click();
      expect(onCancel).toHaveBeenCalled();
    });

    it('should render character data name when provided', () => {
      render(<MockWizard characterData={{ name: 'EditMe' }} />);
      expect(screen.getByTestId('editing-character')).toHaveTextContent('EditMe');
    });

    it('should not render editing-character when characterData is null', () => {
      render(<MockWizard characterData={null} />);
      expect(screen.queryByTestId('editing-character')).toBeNull();
    });

    it('should render editing mode indicator when isEditing is true', () => {
      render(<MockWizard isEditing={true} />);
      expect(screen.getByTestId('editing-mode')).toHaveTextContent('Editing Mode');
    });

    it('should not render editing mode when isEditing is false', () => {
      render(<MockWizard isEditing={false} />);
      expect(screen.queryByTestId('editing-mode')).toBeNull();
    });
  });

  describe('MockSidebar', () => {
    it('should render as a vi.fn component', () => {
      expect(MockSidebar).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockSidebar campaignName="test-campaign" />);
      expect(screen.getByTestId('sidebar-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render localhost as true when isLocalhost is true', () => {
      render(<MockSidebar campaignName="test" isLocalhost={true} />);
      expect(screen.getByTestId('sidebar-localhost')).toHaveTextContent('true');
    });

    it('should render localhost as false when isLocalhost is false', () => {
      render(<MockSidebar campaignName="test" isLocalhost={false} />);
      expect(screen.getByTestId('sidebar-localhost')).toHaveTextContent('false');
    });

    it('should render active indicator when activeView and activeCharacter provided', () => {
      render(<MockSidebar activeView="charSheet" activeCharacter={{ name: 'Hero' }} campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Hero');
    });

    it('should render view label when activeView has no activeCharacter', () => {
      render(<MockSidebar activeView="encounter" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator')).toHaveTextContent('Encounters');
    });

    it('should render empty active indicator for unknown view', () => {
      render(<MockSidebar activeView="unknownView" campaignName="test" />);
      expect(screen.getByTestId('sidebar-active-indicator').textContent).toBe('');
    });

    it('should render back to campaigns button', () => {
      const onBack = vi.fn();
      render(<MockSidebar campaignName="test" onBackToCampaigns={onBack} />);
      screen.getByTestId('back-to-campaigns-btn').click();
      expect(onBack).toHaveBeenCalled();
    });

    it('should render add character button', () => {
      const onAdd = vi.fn();
      render(<MockSidebar campaignName="test" onAddCharacter={onAdd} />);
      screen.getByTestId('add-character-btn').click();
      expect(onAdd).toHaveBeenCalled();
    });

    it('should render character buttons from characters array', () => {
      const onClick = vi.fn();
      render(<MockSidebar campaignName="test" characters={[{ name: 'Char1' }, { name: 'Char2' }]} onCharacterClick={onClick} />);
      expect(screen.getByTestId('char-btn-Char1')).toHaveTextContent('Char1');
      expect(screen.getByTestId('char-btn-Char2')).toHaveTextContent('Char2');
      screen.getByTestId('char-btn-Char1').click();
      expect(onClick).toHaveBeenCalledWith({ name: 'Char1' });
    });

    it('should not render character buttons when characters is undefined', () => {
      render(<MockSidebar campaignName="test" onCharacterClick={vi.fn()} />);
      expect(screen.queryByTestId('char-btn-Char1')).toBeNull();
    });

    it('should mark active character button with active class', () => {
      render(<MockSidebar campaignName="test" characters={[{ name: 'ActiveChar' }]} activeView="charSheet" activeCharacter={{ name: 'ActiveChar' }} onCharacterClick={vi.fn()} />);
      const btn = screen.getByTestId('char-btn-ActiveChar');
      expect(btn).toHaveClass('active');
    });

    it('should not mark inactive character button with active class', () => {
      render(<MockSidebar campaignName="test" characters={[{ name: 'InactiveChar' }]} activeView="charSheet" activeCharacter={{ name: 'OtherChar' }} onCharacterClick={vi.fn()} />);
      const btn = screen.getByTestId('char-btn-InactiveChar');
      expect(btn).not.toHaveClass('active');
    });

    it('should render initiative button', () => {
      const onInit = vi.fn();
      render(<MockSidebar campaignName="test" onInitiativeClick={onInit} />);
      screen.getByTestId('initiative-btn').click();
      expect(onInit).toHaveBeenCalled();
    });

    it('should render maps button with "Maps" when localhost', () => {
      render(<MockSidebar campaignName="test" isLocalhost={true} onMapsClick={vi.fn()} />);
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Maps');
    });

    it('should render maps button with "Map" when not localhost', () => {
      render(<MockSidebar campaignName="test" isLocalhost={false} onMapsClick={vi.fn()} />);
      expect(screen.getByTestId('maps-btn')).toHaveTextContent('Map');
    });

    it('should render all navigation buttons', () => {
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

    it('should render admin button only when localhost', () => {
      const onRepair = vi.fn();
      render(<MockSidebar campaignName="test" isLocalhost={true} onRepairClick={onRepair} />);
      expect(screen.getByTestId('admin-btn')).toBeInTheDocument();
      screen.getByTestId('admin-btn').click();
      expect(onRepair).toHaveBeenCalled();
    });

    it('should not render admin button when not localhost', () => {
      render(<MockSidebar campaignName="test" isLocalhost={false} />);
      expect(screen.queryByTestId('admin-btn')).toBeNull();
    });
  });

  describe('MockMapsManager', () => {
    it('should render as a vi.fn component', () => {
      expect(MockMapsManager).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockMapsManager campaignName="test-campaign" onOpenMap={vi.fn()} onBack={vi.fn()} />);
      expect(screen.getByTestId('mm-campaign')).toHaveTextContent('test-campaign');
    });

    it('should call onOpenMap with dungeon-1 when open map button clicked', () => {
      const onOpenMap = vi.fn();
      const onBack = vi.fn();
      render(<MockMapsManager campaignName="test" onOpenMap={onOpenMap} onBack={onBack} />);
      screen.getByTestId('open-map-btn').click();
      expect(onOpenMap).toHaveBeenCalledWith('dungeon-1');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockMapsManager campaignName="test" onOpenMap={vi.fn()} onBack={onBack} />);
      screen.getByTestId('mm-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockMap', () => {
    it('should render as a vi.fn component', () => {
      expect(MockMap).toBeTypeOf('function');
    });

    it('should render map name', () => {
      render(<MockMap mapName="dungeon-1" campaignName="test" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-name')).toHaveTextContent('dungeon-1');
    });

    it('should render campaign name', () => {
      render(<MockMap mapName="test-map" campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render character count', () => {
      render(<MockMap mapName="m" campaignName="t" characters={['a', 'b']} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-char-count')).toHaveTextContent('2');
    });

    it('should render 0 character count when undefined', () => {
      render(<MockMap mapName="m" campaignName="t" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-char-count')).toHaveTextContent('0');
    });

    it('should render npc count', () => {
      render(<MockMap mapName="m" campaignName="t" characters={[]} npcs={['n1']} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-npc-count')).toHaveTextContent('1');
    });

    it('should render 0 npc count when undefined', () => {
      render(<MockMap mapName="m" campaignName="t" onBack={vi.fn()} />);
      expect(screen.getByTestId('map-npc-count')).toHaveTextContent('0');
    });

    it('should render localhost as string', () => {
      render(<MockMap mapName="m" campaignName="t" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('map-localhost')).toHaveTextContent('true');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockMap mapName="m" campaignName="t" onBack={onBack} />);
      screen.getByTestId('map-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockEncounterBuilder', () => {
    it('should render as a vi.fn component', () => {
      expect(MockEncounterBuilder).toBeTypeOf('function');
    });

    it('should render character count', () => {
      render(<MockEncounterBuilder characters={['c1', 'c2', 'c3']} campaignName="test" />);
      expect(screen.getByTestId('eb-char-count')).toHaveTextContent('3');
    });

    it('should render 0 character count when undefined', () => {
      render(<MockEncounterBuilder campaignName="test" />);
      expect(screen.getByTestId('eb-char-count')).toHaveTextContent('0');
    });

    it('should render campaign name', () => {
      render(<MockEncounterBuilder characters={[]} campaignName="test-campaign" />);
      expect(screen.getByTestId('eb-campaign')).toHaveTextContent('test-campaign');
    });
  });

  describe('MockNotes', () => {
    it('should render as a vi.fn component', () => {
      expect(MockNotes).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockNotes campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('notes-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render localhost as string', () => {
      render(<MockNotes campaignName="test" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('notes-localhost')).toHaveTextContent('true');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockNotes campaignName="test" isLocalhost={false} onBack={onBack} />);
      screen.getByTestId('notes-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockQuests', () => {
    it('should render as a vi.fn component', () => {
      expect(MockQuests).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockQuests campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render localhost as string', () => {
      render(<MockQuests campaignName="test" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('quests-localhost')).toHaveTextContent('true');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockQuests campaignName="test" isLocalhost={false} onBack={onBack} />);
      screen.getByTestId('quests-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockNPCs', () => {
    it('should render as a vi.fn component', () => {
      expect(MockNPCs).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockNPCs campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render character count', () => {
      render(<MockNPCs campaignName="test" characters={['c1', 'c2']} onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-char-count')).toHaveTextContent('2');
    });

    it('should render 0 character count when undefined', () => {
      render(<MockNPCs campaignName="test" onBack={vi.fn()} />);
      expect(screen.getByTestId('npcs-char-count')).toHaveTextContent('0');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockNPCs campaignName="test" characters={[]} onBack={onBack} />);
      screen.getByTestId('npcs-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockSettlements', () => {
    it('should render as a vi.fn component', () => {
      expect(MockSettlements).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockSettlements campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('settlements-campaign')).toHaveTextContent('test-campaign');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockSettlements campaignName="test" onBack={onBack} />);
      screen.getByTestId('settlements-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockLog', () => {
    it('should render as a vi.fn component', () => {
      expect(MockLog).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockLog campaignName="test-campaign" characters={[]} />);
      expect(screen.getByTestId('log-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render character count', () => {
      render(<MockLog campaignName="test" characters={['c1', 'c2', 'c3']} />);
      expect(screen.getByTestId('log-char-count')).toHaveTextContent('3');
    });

    it('should render 0 character count when undefined', () => {
      render(<MockLog campaignName="test" />);
      expect(screen.getByTestId('log-char-count')).toHaveTextContent('0');
    });
  });

  describe('MockFactions', () => {
    it('should render as a vi.fn component', () => {
      expect(MockFactions).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockFactions campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render localhost as string', () => {
      render(<MockFactions campaignName="test" isLocalhost={true} onBack={vi.fn()} />);
      expect(screen.getByTestId('factions-localhost')).toHaveTextContent('true');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockFactions campaignName="test" isLocalhost={false} onBack={onBack} />);
      screen.getByTestId('factions-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('MockCampaignAdmin', () => {
    it('should render as a vi.fn component', () => {
      expect(MockCampaignAdmin).toBeTypeOf('function');
    });

    it('should render campaign name', () => {
      render(<MockCampaignAdmin campaignName="test-campaign" onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-campaign')).toHaveTextContent('test-campaign');
    });

    it('should render theme', () => {
      render(<MockCampaignAdmin campaignName="test" theme="dark" onBack={vi.fn()} />);
      expect(screen.getByTestId('admin-theme')).toHaveTextContent('dark');
    });

    it('should call onBack when back button clicked', () => {
      const onBack = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onBack={onBack} />);
      screen.getByTestId('admin-back-btn').click();
      expect(onBack).toHaveBeenCalled();
    });

    it('should call toggleTheme when toggle theme button clicked', () => {
      const toggleTheme = vi.fn();
      render(<MockCampaignAdmin campaignName="test" theme="light" toggleTheme={toggleTheme} onBack={vi.fn()} />);
      screen.getByTestId('admin-toggle-theme-btn').click();
      expect(toggleTheme).toHaveBeenCalled();
    });

    it('should call onRenameCampaign when rename button clicked', () => {
      const onRename = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onRenameCampaign={onRename} onBack={vi.fn()} />);
      screen.getByTestId('admin-rename-btn').click();
      expect(onRename).toHaveBeenCalled();
    });

    it('should call onDeleteCampaign when delete button clicked', () => {
      const onDelete = vi.fn();
      render(<MockCampaignAdmin campaignName="test" onDeleteCampaign={onDelete} onBack={vi.fn()} />);
      screen.getByTestId('admin-delete-btn').click();
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
