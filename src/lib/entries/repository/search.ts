import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { buildPrefixQuery } from "./search-query";

export type SearchHit = {
  id: string;
  type: string;
  title: string | null;
  occurredAt: Date;
  headline: string;
  rank: number;
};

/**
 * Full-text search di atas kolom `searchVector` yang dipelihara trigger.
 *
 * INI SATU-SATUNYA QUERY YANG TIDAK DILINDUNGI Prisma Client Extension:
 * SQL mentah tidak tersentuh penyuntik userId di src/lib/db.ts. Filter
 * "userId" = ${userId} di bawah adalah pertahanan tunggalnya — jangan
 * dihapus, dan jangan menambah query raw lain tanpa filter serupa.
 * `npm run check:gates` memeriksa keberadaannya.
 */
export async function searchEntries(query: string, opts?: { type?: string; limit?: number }) {
  const userId = await requireUserId();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const prefixQuery = buildPrefixQuery(trimmed);

  const typeFilter = opts?.type ?? null;
  const limit = opts?.limit ?? 50;

  const rows = await prisma.$queryRaw<SearchHit[]>`
    WITH q AS (
      SELECT CASE
               WHEN ${prefixQuery}::text IS NULL
                 THEN websearch_to_tsquery('simple', ${trimmed})
               ELSE to_tsquery('simple', ${prefixQuery}::text)
             END AS tsq
    )
    SELECT e."id",
           e."type",
           e."title",
           e."occurredAt",
           ts_headline(
             'simple',
             coalesce(e."title", '') || ' — ' || coalesce(e."content"->>'body', ''),
             q.tsq,
             'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=24, MinWords=8'
           ) AS headline,
           ts_rank(e."searchVector", q.tsq) AS rank
      FROM "Entry" e, q
     WHERE e."userId" = ${userId}
       AND e."deletedAt" IS NULL
       AND (${typeFilter}::text IS NULL OR e."type" = ${typeFilter}::text)
       AND e."searchVector" @@ q.tsq
     ORDER BY rank DESC, e."occurredAt" DESC
     LIMIT ${limit}
  `;

  return rows;
}
