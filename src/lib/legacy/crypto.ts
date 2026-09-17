import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption untuk vault Legacy.
 *
 * SATU-SATUNYA berkas yang boleh menyebut LEGACY_MASTER_KEY. Aturan itu
 * dijaga `npm run check:gates` — bukan karena kuncinya lebih aman di sini,
 * tapi karena satu tempat berarti satu tempat untuk diperiksa saat ada
 * pertanyaan "kunci ini bisa terbaca dari mana saja?".
 *
 * Cara kerjanya:
 *   1. Tiap item dapat data key acak 32 byte
 *   2. Isi dienkripsi AES-256-GCM dengan data key itu
 *   3. Data key dibungkus master key, juga AES-256-GCM
 *   4. Data key mentah TIDAK PERNAH disimpan
 *
 * Yang dilindungi: kebocoran dump database. Yang TIDAK dilindungi: operator
 * aplikasi — server memang harus bisa mendekripsi supaya pemiliknya bisa
 * membaca vault-nya sendiri. Lihat rencana-fase-5-legacy.md §3.
 */

const ALGORITHM = "aes-256-gcm";

/** Versi 1 = master key dari env. Versi berikutnya untuk KMS. */
export const CURRENT_KEY_VERSION = 1;

function masterKey(): Buffer {
  const raw = process.env.LEGACY_MASTER_KEY;
  if (!raw) {
    // Fail closed. Menulis vault tanpa kunci berarti menulis data sensitif
    // dalam bentuk yang tidak pernah bisa dibuka lagi.
    throw new Error(
      "LEGACY_MASTER_KEY belum diset. Generate: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `LEGACY_MASTER_KEY harus 32 byte setelah didekode base64, bukan ${key.length}.`,
    );
  }
  return key;
}

/**
 * Uint8Array, bukan Buffer. Prisma 7 menuntut ArrayBuffer biasa, sementara
 * `Buffer.buffer` bertipe ArrayBufferLike yang juga mencakup
 * SharedArrayBuffer — dan itu ditolak type checker-nya.
 */
type Bytes = Uint8Array<ArrayBuffer>;

export type SealedPayload = {
  ciphertext: Bytes;
  iv: Bytes;
  authTag: Bytes;
  wrappedKey: Bytes;
  keyVersion: number;
};

/** Menyalin ke ArrayBuffer baru — bukan sekadar cast. */
const bytes = (buf: Buffer): Bytes => new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)) as Bytes;

/** Membungkus data key dengan master key. IV ikut disimpan di depan blob. */
function wrapDataKey(dataKey: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const wrapped = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), wrapped]);
}

function unwrapDataKey(blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const decipher = createDecipheriv(ALGORITHM, masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
}

/** Mengenkripsi objek apa pun yang bisa di-JSON. */
export function seal(value: unknown): SealedPayload {
  const dataKey = randomBytes(32);
  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, dataKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: bytes(ciphertext),
    iv: bytes(iv),
    authTag: bytes(cipher.getAuthTag()),
    wrappedKey: bytes(wrapDataKey(dataKey)),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

/**
 * Membuka kembali. Melempar kalau authTag tidak cocok — GCM memverifikasi
 * keutuhan, jadi ciphertext yang diubah di database akan ketahuan, bukan
 * menghasilkan sampah yang diam-diam dipakai.
 */
export function open<T>(payload: {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  wrappedKey: Uint8Array;
}): T {
  const dataKey = unwrapDataKey(Buffer.from(payload.wrappedKey));

  const decipher = createDecipheriv(ALGORITHM, dataKey, Buffer.from(payload.iv));
  decipher.setAuthTag(Buffer.from(payload.authTag));

  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext)),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plain) as T;
}

/** Apakah vault bisa dipakai sama sekali. Dipakai UI untuk memberi tahu. */
export function vaultReady(): boolean {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}
