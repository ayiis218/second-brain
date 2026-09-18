/**
 * Satu-satunya modul yang boleh menyentuh Prisma untuk Entry, Tag, dan
 * EntryLink. Dua aturan yang ditegakkan di sini:
 *
 * 1. Semua tulis ke Entry.content melewati parseEntryContent().
 * 2. Semua query terikat user dari sesi — fungsi di bawah tidak menerima
 *    userId sebagai parameter, jadi pemanggil tidak bisa lupa mengirimnya.
 *
 * Keduanya diperiksa `npm run check:gates`, yang mengizinkan SELURUH isi
 * folder ini — bukan satu berkas tertentu.
 *
 * Dipecah per domain karena versi satu-berkasnya sudah memuat delapan hal
 * yang tidak saling berhubungan; barrel ini menjaga alamat impornya tetap
 * `@/lib/entries/repository` seperti semula.
 */
export { deleteOwnAccount, exportAll } from "./account";
export {
  countEntries,
  createEntry,
  getEntry,
  listEntries,
  softDeleteEntry,
  updateEntry,
  type EntryWithTags,
} from "./entries";
export { listHabits, toggleHabitDay, type HabitSummary } from "./habits";
export { createLink, deleteLink, listLinks } from "./links";
export { searchEntries, type SearchHit } from "./search";
export { encodeEntryCursor } from "./shared";
export {
  deleteTag,
  listTags,
  listTagsWithCount,
  parseTagList,
  renameTag,
  upsertTags,
} from "./tags";
export { listTasks, setTaskStatus } from "./tasks";
export { listTrash, purgeEntry, purgeOldTrash, restoreEntry } from "./trash";
