import { DeleteAccount } from "@/components/delete-account";
import { InviteManager, type InviteRow } from "@/components/invite-manager";
import { SecurityPanel, type DeviceRow } from "@/components/security-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { TagManager } from "@/components/tag-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser, isOwner, requireUserId } from "@/lib/auth-user";
import { listTagsWithCount } from "@/lib/entries/repository";
import { listInvites } from "@/lib/invites";
import { listKnownDevices } from "@/lib/security/devices";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, owner, tags] = await Promise.all([
    getSessionUser(),
    isOwner(),
    listTagsWithCount(),
  ]);

  const devices: DeviceRow[] = user
    ? (await listKnownDevices(user.id)).map((d) => ({
        id: d.id,
        label: d.label,
        lastSeenLabel: formatDateTime(d.lastSeenAt),
      }))
    : [];

  let invites: InviteRow[] = [];
  if (owner) {
    const userId = await requireUserId();
    invites = (await listInvites(userId)).map((invite) => ({
      id: invite.id,
      code: invite.code,
      email: invite.email,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
      revokedAt: invite.revokedAt,
      usedByEmail: invite.usedBy?.email ?? null,
    }));
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="px-1 text-lg font-semibold">Pengaturan</h1>

      <Card>
        <CardHeader>
          <CardTitle>Akun</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {owner
              ? "Kamu pemilik ruang ini. Modul Finance dan Legacy hanya tersedia untukmu."
              : "Datamu terpisah dari pengguna lain."}
          </p>
          <SignOutButton />
        </CardContent>
      </Card>

      <SecurityPanel devices={devices} />

      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Ambil seluruh entry, tag, dan tautanmu. Data yang tidak bisa dikeluarkan
            membuat aplikasi ini penjara data — jadi ini bukan fitur pelengkap.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {/* Unduhan biasa, bukan server action: browser perlu respons dengan
              Content-Disposition supaya berkasnya tersimpan. */}
          <Button size="touch" variant="outline" render={<a href="/api/export" download />}>
            Unduh JSON
          </Button>
          <Button
            size="touch"
            variant="outline"
            render={<a href="/api/export?format=md" download />}
          >
            Unduh Markdown
          </Button>
        </CardContent>
      </Card>

      <TagManager tags={tags} />

      {owner ? <InviteManager invites={invites} /> : null}

      {/* Pemilik tidak bisa menghapus akunnya lewat aplikasi — datanya
          menaungi undangan pengguna lain. */}
      {owner ? null : <DeleteAccount />}
    </div>
  );
}
