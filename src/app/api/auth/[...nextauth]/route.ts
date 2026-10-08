import { handlers } from "@/auth";

// Eksplisit, bukan mengandalkan Next menyimpulkannya dari pemakaian cookies()
// internal NextAuth — gerbang di scripts/check-gates.mjs mewajibkan ini di
// setiap route.ts, pola yang sama dengan route cron/export/legacy lainnya.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const { GET, POST } = handlers;
