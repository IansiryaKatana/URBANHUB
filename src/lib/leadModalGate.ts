type Listener = () => void;

let openCount = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** True while any lead / payment form modal or drawer is open. */
export function isAnyLeadModalOpen() {
  return openCount > 0;
}

/** Subscribe to lead-modal open/close changes. Returns unsubscribe. */
export function subscribeLeadModalGate(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Register whether a lead modal is currently open.
 * Call with the dialog's `open` boolean; cleans up on unmount.
 */
export function setLeadModalOpen(open: boolean) {
  if (open) {
    openCount += 1;
  } else {
    openCount = Math.max(0, openCount - 1);
  }
  emit();
}
