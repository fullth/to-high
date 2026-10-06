// New capabilities must never be retained in error telemetry or breadcrumbs.
export function redactGuestCapabilities<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactGuestCapabilities) as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (
        /(xguesttoken|guestaccesstoken|guestaccesshash)$/i.test(
          key.replace(/[-_]/g, ''),
        )
      )
        continue;
      output[key] = redactGuestCapabilities(entry);
    }
    return output as T;
  }
  return value;
}
