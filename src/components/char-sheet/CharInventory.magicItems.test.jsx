// @improved-by-ai
// CharInventory magic items tests
// This file re-exports the magic items tests from CharInventory.rendering.test.jsx
// Original tests moved to:
//   CharInventory.rendering.test.jsx - magic items rendering, attunement, quantity, missing description
//
// The following scenarios are now covered by CharInventory.rendering.test.jsx:
//   - requiresAttunement true with custom attunementRequirements
//   - requiresAttunement false (no attunement text)
//   - missing subtype (no parentheses)
//   - empty string attunementRequirements
//   - multiple magic items
//   - HTML description rendering
//   - quantity display
//   - subtype + attunement requirements combined
import './CharInventory.rendering.test.jsx';
