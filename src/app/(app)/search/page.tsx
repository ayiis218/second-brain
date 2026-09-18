import Link from "next/link";

import { SearchInput } from "@/components/search/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TYPE_LABEL } from "@/lib/entries/form";
import { searchEntries } from "@/lib/entries/repository";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q, type } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const typeFilter = typeof type === "string" && type ? type : undefined;

  const hits = query ? await searchEntries(query, { type: typeFilter }) : [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <SearchInput defaultQuery={query} defaultType={typeFilter} />

      {!query ? (
        <EmptyState>Ketik untuk mencari di seluruh entri.</EmptyState>
      ) : hits.length === 0 ? (
        <EmptyState>Tidak ada yang cocok dengan “{query}”.</EmptyState>
      ) : (
        <div className="space-y-3">
          {hits.map((hit, i) => (
            <FadeIn key={hit.id} index={i}>
              <Link href={`/entry/${hit.id}`} className="block">
                <Card className="transition-colors hover:border-ring">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{TYPE_LABEL[hit.type] ?? hit.type}</Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDateTime(hit.occurredAt)}
                      </span>
                    </div>
                    {hit.title ? (
                      <h3 className="font-medium leading-snug">{hit.title}</h3>
                    ) : null}
                    {/* headline berasal dari ts_headline: teks entry milik
                        user sendiri dengan <mark> di sekitar kata cocok.
                        Postgres meng-escape isi aslinya. */}
                    <p
                      className="text-sm text-muted-foreground [&_mark]:bg-primary/20 [&_mark]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: hit.headline }}
                    />
                  </CardContent>
                </Card>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
