import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 tidak lagi memuat berkas .env secara otomatis. Next.js membaca
// .env.local, jadi CLI Prisma harus dibuat membaca sumber yang sama —
// kalau tidak, `prisma migrate` jalan tanpa DATABASE_URL.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

// Prisma 7 tidak lagi membaca `url` dari schema.prisma. Connection string
// untuk perintah Migrate/Introspect dideklarasikan di sini; runtime aplikasi
// tetap memakai driver adapter Neon di src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
