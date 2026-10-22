import { create } from "zustand";
export const useTrackingStatus = create<{
  backgroundActive: boolean;
  starting: boolean;
  error: string | null;
}>(() => ({ backgroundActive: false, starting: false, error: null }));
