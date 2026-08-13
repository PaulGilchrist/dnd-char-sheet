// CharInventory edge cases and special scenarios
// This file re-exports the split test modules for backward compatibility
// Original tests split into:
//   CharInventory.itemLookup.test.jsx - item lookup, case sensitivity, whitespace, index variations, parentheses, empty data
//   CharInventory.equipmentData.test.jsx - equipment field edge cases, ability/utilize/craft, error logging
//   CharInventory.rendering.test.jsx - section rendering, magic items, null handling

import './CharInventory.itemLookup.test.jsx';
import './CharInventory.equipmentData.test.jsx';
import './CharInventory.rendering.test.jsx';
