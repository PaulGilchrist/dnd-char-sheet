const INTERACTIVE_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']);
const INTERACTIVE_ROLES = new Set(['button', 'checkbox', 'radio', 'link', 'menuitem', 'tab', 'switch', 'option']);

export function isInteractive(element) {
  if (!element) return false;

  if (INTERACTIVE_TAGS.has(element.tagName)) return true;

  const role = element.getAttribute?.('role');
  if (role && INTERACTIVE_ROLES.has(role)) return true;

  if (element.closest?.('label')) return true;

  if (element.closest?.('[data-modal-action]')) return true;

  return false;
}
