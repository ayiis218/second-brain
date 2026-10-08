import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit test untuk logic MURNI saja — bukan integrasi lewat database atau
 * sesi. Fungsi yang butuh Prisma/`auth()` tetap diverifikasi manual lewat
 * `npm run db:verify:*` dan script sekali-pakai (lihat README), bukan di
 * sini; memalsukan keduanya di test runner cuma menambah kerapuhan tanpa
 * menambah keyakinan.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
});
