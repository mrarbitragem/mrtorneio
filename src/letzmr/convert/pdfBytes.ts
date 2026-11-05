/** Cópia própria: o pdf.js solta (detaches) o ArrayBuffer original. */
export function copyPdfBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) return new Uint8Array(data);
  return new Uint8Array(data.slice(0));
}
