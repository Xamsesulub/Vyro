import type { Workout } from "../activities/model";
import { watchReceipt, watchWorkout } from "./model";

export interface WatchPort {
  owner(): string | undefined;
  setOwner(owner: string): Promise<void>;
  pending(owner: string): Promise<unknown[]>;
  received(receipt: string): boolean;
  save(workout: Workout, receipt: string): void;
  persist(): Promise<void>;
  acknowledge(id: string, owner: string): Promise<void>;
}

/** An ACK means the encrypted phone copy is durable, not just that a file arrived. */
export async function importWatchWorkouts(port: WatchPort) {
  const owner = port.owner();
  await port.setOwner(owner ?? "");
  if (!owner || port.owner() !== owner) return 0;
  const pending = await port.pending(owner);
  let imported = 0;
  for (const raw of pending) {
    if (port.owner() !== owner) break;
    const workout = watchWorkout(raw, owner);
    const receipt = watchReceipt(owner, workout.id);
    if (!port.received(receipt)) {
      port.save(workout, receipt);
      imported++;
    }
    // Retry a previous failed write too, even if the receipt is already in memory.
    await port.persist();
    if (port.owner() !== owner) break;
    await port.acknowledge(workout.id.slice(6), owner);
  }
  return imported;
}
