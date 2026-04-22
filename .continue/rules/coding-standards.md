---
name: Coding Standards
description: Coding Standards
---

- Use JavaScript, not TypeScript.
- Match the existing folder structure.
- Never use inline styles.
- Never use !important in CSS.
- Do not create any new CSS class if a global class already provides the needed styling.
- Before generating any new CSS, the AI must assume a global class may already exist and must reuse it unless explicitly told otherwise.
- Component‑specific CSS must be in a file named after the component (e.g., Component.css).
- Component‑specific class names must begin with the component name (e.g., .Component-button).