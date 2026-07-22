import { useEffect } from "react";
import { setLeadModalOpen } from "@/lib/leadModalGate";

/** Keeps the global lead-modal gate in sync with this dialog/drawer open state. */
export function useLeadModalGate(open: boolean) {
  useEffect(() => {
    if (!open) return;
    setLeadModalOpen(true);
    return () => setLeadModalOpen(false);
  }, [open]);
}
