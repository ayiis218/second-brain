import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-user";

/**
 * Lapis ketiga isolasi data (rencana-aplikasi-second-brain.md §5.1).
 *
 * Client Prisma yang dibungkus supaya `userId` disuntikkan otomatis ke setiap
 * query pada model ber-scope. Ini jaring pengaman, bukan pertahanan utama:
 * lapis pertama adalah aturan "akses Prisma hanya dari repository", lapis
 * kedua adalah repository yang membaca sesi sendiri.
 *
 * Prinsipnya fail closed. Operasi yang tidak ada di daftar di bawah akan
 * MELEMPAR, bukan diteruskan tanpa filter — supaya penambahan operasi baru
 * memaksa keputusan sadar, bukan lolos diam-diam.
 */

const SCOPED_MODELS = new Set(["Entry", "Tag", "EntryTag", "EntryLink"]);

/** Operasi yang userId-nya disuntikkan ke `where`. */
const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/** Operasi yang userId-nya disuntikkan ke `data`. */
const CREATE_OPS = new Set(["create", "createMany"]);

/**
 * Sengaja dilarang: `findUnique`, `update`, `delete`, dan `upsert` menerima
 * `where` yang hanya boleh berisi field unik, sehingga penyuntikan userId
 * di sana bergantung pada perilaku extendedWhereUnique yang halus.
 * Alih-alih mengandalkan itu, repository memakai findFirst/updateMany/
 * deleteMany yang penyuntikannya lugas dan mudah diperiksa.
 */
const FORBIDDEN_OPS: Record<string, string> = {
  findUnique: "findFirst",
  findUniqueOrThrow: "findFirstOrThrow",
  update: "updateMany",
  delete: "deleteMany",
  upsert: "findFirst + create/updateMany",
};

type AnyArgs = Record<string, unknown>;

function scopeExtension(userId: string) {
  return prisma.$extends({
    name: "user-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // EntryTag tidak punya kolom userId sendiri; isolasinya menumpang
          // relasi ke Entry yang sudah ber-scope.
          const scopeField =
            model === "EntryTag" ? { entry: { userId } } : { userId };

          if (WHERE_OPS.has(operation)) {
            const a = (args ?? {}) as AnyArgs;
            return query({
              ...a,
              where: { ...((a.where as AnyArgs) ?? {}), ...scopeField },
            });
          }

          if (CREATE_OPS.has(operation)) {
            if (model === "EntryTag") return query(args);
            const a = (args ?? {}) as AnyArgs;
            const data = a.data;
            return query({
              ...a,
              data: Array.isArray(data)
                ? data.map((d) => ({ ...(d as AnyArgs), userId }))
                : { ...((data as AnyArgs) ?? {}), userId },
            });
          }

          const alternative = FORBIDDEN_OPS[operation];
          if (alternative) {
            throw new Error(
              `${model}.${operation}() tidak diizinkan pada model ber-scope user. ` +
                `Pakai ${alternative} agar filter userId bisa disuntikkan dengan pasti.`,
            );
          }

          throw new Error(
            `${model}.${operation}() belum ditangani penyaring userId di src/lib/db.ts. ` +
              `Tambahkan penanganannya secara sadar sebelum memakainya.`,
          );
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof scopeExtension>;

/**
 * Client yang sudah terikat user pada request ini.
 *
 * Dibuat per pemanggilan, bukan singleton: identitasnya berbeda tiap request.
 * Biayanya murah — `$extends` hanya membungkus dengan proxy, tidak membuka
 * koneksi baru.
 */
export async function scopedDb(): Promise<ScopedDb> {
  const userId = await requireUserId();
  return scopeExtension(userId);
}
