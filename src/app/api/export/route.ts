import { getSessionUser } from "@/lib/auth-user";
import { exportAll } from "@/lib/entries/repository";
import { notifySecurity } from "@/lib/security/notify";
import { formatDateTime } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export seluruh data milik user yang sedang login.
 *
 * Route ini SENGAJA tidak dikecualikan dari matcher di src/proxy.ts —
 * justru perlindungan sesi itulah yang membuatnya aman. exportAll() sendiri
 * ber-scope user, jadi tidak ada jalan mengunduh data orang lain.
 */
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "md" ? "md" : "json";
  const { entries, tags, links } = await exportAll();

  // Satu permintaan ini memuat SELURUH data. Itu menjadikannya permintaan
  // paling bernilai bagi penyerang — dan karena kamu jarang melakukannya,
  // notifikasinya nyaris tidak pernah mengganggu, tapi sekali muncul tanpa
  // kamu picu, itu tanda paling terang yang bisa didapat.
  const user = await getSessionUser();
  if (user?.email) {
    await notifySecurity(user.email, { kind: "data_exported", format, at: new Date() });
  }
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "md") {
    const lines: string[] = ["# Second Brain — export", "", `Diambil ${stamp}`, ""];

    for (const entry of entries) {
      lines.push(`## ${entry.title || "(tanpa judul)"}`);
      lines.push("");
      lines.push(`- Tipe: ${entry.type}`);
      lines.push(`- Waktu: ${formatDateTime(entry.occurredAt)}`);
      if (entry.tags.length) {
        lines.push(`- Tag: ${entry.tags.map(({ tag }) => tag.label).join(", ")}`);
      }
      lines.push("");
      const content = entry.content as Record<string, unknown> | null;
      lines.push(typeof content?.body === "string" ? content.body : "");
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="second-brain-${stamp}.md"`,
      },
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    // Versi ikut disimpan supaya script import tahu bentuk apa yang dibacanya.
    version: 1,
    entries,
    tags,
    links,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="second-brain-${stamp}.json"`,
    },
  });
}
