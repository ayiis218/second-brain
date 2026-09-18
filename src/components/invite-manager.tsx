"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createInviteAction, revokeInviteAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InviteRow = {
  id: string;
  code: string;
  email: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  usedByEmail: string | null;
};

function statusOf(invite: InviteRow) {
  if (invite.usedAt) return { label: "Used", variant: "secondary" as const };
  if (invite.revokedAt) return { label: "Revoked", variant: "outline" as const };
  if (invite.expiresAt <= new Date()) return { label: "Expired", variant: "outline" as const };
  return { label: "Active", variant: "default" as const };
}

export function InviteManager({ invites }: { invites: InviteRow[] }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  function onCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createInviteAction(formData);
        toast.success("Undangan dibuat");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal membuat undangan");
      }
    });
  }

  function onRevoke(id: string) {
    startTransition(async () => {
      try {
        await revokeInviteAction(id);
        toast.success("Undangan dicabut");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mencabut undangan");
      }
    });
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/invite/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Tautan disalin");
    } catch {
      // clipboard bisa ditolak browser; tampilkan agar tetap bisa disalin manual
      toast.error(url);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invites</CardTitle>
        <CardDescription>
          Pendaftaran hanya lewat tautan undangan. Tautan berlaku 14 hari dan sekali pakai.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={onCreate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Lock to email (optional)</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="orang@gmail.com"
              className="h-11 md:h-8"
            />
          </div>
          <Button type="submit" size="touch" disabled={pending} className="w-full md:w-auto">
            Create invite
          </Button>
        </form>

        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada undangan.</p>
        ) : (
          <ul className="space-y-3">
            {invites.map((invite) => {
              const status = statusOf(invite);
              const active = status.label === "Active";
              return (
                <li key={invite.id} className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="truncate text-muted-foreground">
                      {invite.usedByEmail ?? invite.email ?? "siapa saja"}
                    </span>
                  </div>
                  {active ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="touch"
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyLink(invite.code)}
                      >
                        {copied === invite.code ? (
                          <Check className="size-4" aria-hidden />
                        ) : (
                          <Copy className="size-4" aria-hidden />
                        )}
                        Copy link
                      </Button>
                      <Button
                        type="button"
                        size="icon-touch"
                        variant="outline"
                        aria-label="Revoke invite"
                        disabled={pending}
                        onClick={() => onRevoke(invite.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
