export type WatchConnection = {
  paired: boolean;
  installed: boolean;
  reachable: boolean;
};
export interface WatchNative {
  setOwner(owner: string): Promise<void>;
  status(): Promise<WatchConnection>;
  pending(owner: string): Promise<unknown[]>;
  acknowledge(id: string, owner: string): Promise<void>;
  addListener(event: "change", listener: () => void): { remove(): void };
}
export const watchNative: WatchNative | null = null;
