export const permissionWaitMessage =
  "Posisjon svarte ikke. Tillat posisjon i nettleseren eller telefoninnstillingene, og prøv igjen.";

export async function locationDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(permissionWaitMessage)),
          15_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
