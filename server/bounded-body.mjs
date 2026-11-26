/**
 * Reads at most maxBytes of a response stream to prevent buffer overflow attacks.
 * Cancels the underlying stream as soon as the limit is crossed, before full allocation.
 *
 * @param {Response} r - Fetch Response object
 * @param {number} maxBytes - Maximum byte limit permitted
 * @returns {Promise<string>} Decoded UTF-8 string payload
 * @throws {Error} If content-length header or received byte stream exceeds maxBytes
 */
export async function readCapped(r, maxBytes) {
  const declared = Number(r.headers?.get?.("content-length") || 0);
  if (declared > maxBytes) throw Error("Response too large");
  if (r.body && typeof r.body.getReader === "function") {
    const reader = r.body.getReader(),
      parts = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Error("Response too large");
      }
      parts.push(value);
    }
    const all = new Uint8Array(size);
    let o = 0;
    for (const x of parts) {
      all.set(x, o);
      o += x.byteLength;
    }
    return new TextDecoder().decode(all);
  }
  const t =
    typeof r.text === "function"
      ? await r.text()
      : JSON.stringify(await r.json());
  if (t.length > maxBytes) throw Error("Response too large");
  return t;
}
