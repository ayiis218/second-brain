import { del, get, put } from "@vercel/blob";

/**
 * Pembungkus tipis Vercel Blob (store privat) untuk byte lampiran vault.
 *
 * Yang dikirim ke sini SELALU ciphertext, tidak pernah isi asli berkas —
 * enkripsinya terjadi di legacy/repository.ts lewat sealBytes()/openBytes()
 * sebelum sampai di sini. `contentType` yang dikirim ke Blob sengaja generik
 * (`application/octet-stream`), bukan mime type berkas aslinya: yang
 * tersimpan di sini bukan berkas itu, melainkan blob acak hasil AES-GCM.
 * Mime type asli tetap tercatat di kolom LegacyAttachment.mimeType, dan
 * dipasang kembali saat diunduh.
 *
 * `addRandomSuffix: false`: pathname-nya sudah unik (lihat pemanggilnya di
 * repository.ts), dan kita butuh identifier yang pasti sama dengan yang
 * disimpan sebagai `objectKey` — bukan sesuatu yang diam-diam diubah Blob.
 */

export async function putAttachmentBytes(pathname: string, data: Buffer): Promise<string> {
  const blob = await put(pathname, data, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
  });
  return blob.pathname;
}

/** `null` kalau objek tidak ditemukan — pemanggil memutuskan itu 404 atau bukan. */
export async function getAttachmentBytes(objectKey: string): Promise<Buffer | null> {
  const result = await get(objectKey, { access: "private" });
  if (!result || result.statusCode !== 200) return null;

  // `.getReader()`, bukan `for await`: tipe ReadableStream bawaan TS belum
  // mendeklarasikan Symbol.asyncIterator meski "dom.iterable" sudah aktif —
  // keterbatasan definisi lib, bukan sesuatu yang perlu di-cast.
  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function deleteAttachmentBytes(objectKey: string): Promise<void> {
  await del(objectKey);
}
