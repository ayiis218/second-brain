"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Input tag bebas ketik. Nilainya dikirim sebagai satu field `tags`
 * dipisah koma; normalisasi ke lowercase terjadi di server
 * (upsertTags di repository), bukan di sini — klien tidak boleh jadi
 * satu-satunya penjaga bentuk data.
 */
export function TagInput({
  suggestions = [],
  defaultTags = [],
}: {
  suggestions?: string[];
  defaultTags?: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const value = raw.trim().replace(/,+$/, "");
    if (!value) return;
    // Pembandingan case-insensitive supaya 'Kerja' tidak ditambahkan
    // dua kali ketika 'kerja' sudah ada di daftar.
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    setTags([...tags, value]);
    setDraft("");
  }

  const unused = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor="tag-draft">Tag (opsional)</Label>
      <input type="hidden" name="tags" value={tags.join(",")} />

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 py-1 pr-1 pl-2">
              {tag}
              <button
                type="button"
                aria-label={`Hapus tag ${tag}`}
                className="rounded-full p-0.5 hover:bg-background/60"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
              >
                <X className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        id="tag-draft"
        value={draft}
        placeholder="Ketik lalu Enter"
        className="h-11 md:h-8"
        onChange={(e) => {
          // Koma juga menutup tag, kebiasaan umum di input semacam ini.
          if (e.target.value.includes(",")) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Enter menambah tag, bukan mengirim form.
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length > 0) {
            setTags(tags.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />

      {unused.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {unused.slice(0, 8).map((tag) => (
            <Button
              key={tag}
              type="button"
              size="xs"
              variant="outline"
              onClick={() => add(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
