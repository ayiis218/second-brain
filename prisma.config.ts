import { defineConfig } from "prisma/config";

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
