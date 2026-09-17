"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Link2, X } from "lucide-react";
import { toast } from "sonner";

import { linkEntryAction, searchForLinkAction, unlinkEntryAction } from "@/lib/actions";
import { TYPE_LABEL } from "@/lib/entries/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type LinkedEntry = {
  linkId: string;
  other: { id: string; type: string; title: string | null };
};

type Candidate = { id: string; type: string; title: string | null };

export function EntryLinks({
  entryId,
  links,
}: {
  entryId: string;
  links: LinkedEntry[];
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pending, startTransition] = useTransition();

  function onSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setCandidates([]);
      return;
    }
    startTransition(async () => {
      try {
        setCandidates(await searchForLinkAction(value, entryId));
      } catch {
        setCandidates([]);
      }
    });
  }

  function onLink(toId: string) {
    startTransition(async () => {
      try {
        await linkEntryAction(entryId, toId);
        setQuery("");
        setCandidates([]);
        toast.success("Tertaut");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menautkan");
      }
    });
  }

  function onUnlink(linkId: string) {
    startTransition(async () => {
      try {
        await unlinkEntryAction(linkId, entryId);
        toast.success("Tautan dilepas");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal melepas tautan");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4" aria-hidden />
          Tautan
        </CardTitle>
        <CardDescription>
          Hubungkan entry ini dengan yang lain — misalnya journal dengan transaksi
          yang memicunya.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.length > 0 ? (
          <ul className="space-y-2">
            {links.map(({ linkId, other }) => (
              <li key={linkId} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <Badge variant="secondary">{TYPE_LABEL[other.type] ?? other.type}</Badge>
                <Link href={`/entry/${other.id}`} className="min-w-0 flex-1 truncate">
                  {other.title || "(tanpa judul)"}
                </Link>
                <Button
                  type="button"
                  size="icon-touch"
                  variant="ghost"
                  aria-label="Lepas tautan"
                  disabled={pending}
                  onClick={() => onUnlink(linkId)}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <Input
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Cari entry untuk ditautkan…"
          aria-label="Cari entry untuk ditautkan"
          className="h-11 md:h-8"
        />

        {candidates.length > 0 ? (
          <ul className="space-y-1">
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={() => onLink(candidate.id)}
                >
                  <Badge variant="secondary">
                    {TYPE_LABEL[candidate.type] ?? candidate.type}
                  </Badge>
                  <span className="truncate">{candidate.title || "(tanpa judul)"}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
