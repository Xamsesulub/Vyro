export const backgroundSupported = false;
export async function requestBackgroundAccess() {
  throw new Error("Bakgrunnsopptak krever mobilappen.");
}
export async function startBackground() {}
export async function stopBackground() {}
