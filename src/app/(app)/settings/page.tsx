import { DeleteAccount } from "@/components/settings/delete-account";
import { InviteManager, type InviteRow } from "@/components/settings/invite-manager";
import { SecurityPanel, type DeviceRow } from "@/components/settings/security-panel";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { TagManager } from "@/components/settings/tag-manager";
import { VaultFunnelSummaryCard } from "@/components/settings/vault-funnel-summary";
import { VaultPinSettings } from "@/components/settings/vault-pin-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser, isOwner, requireUserId } from "@/lib/auth-user";
import { listTagsWithCount } from "@/lib/entries/repository";
import { listInvites } from "@/lib/invites";
import { hasVaultAccess } from "@/lib/legacy/access";
import { listVaultFunnelSummary, type VaultFunnelSummary } from "@/lib/legacy/vault-funnel";
import { listKnownDevices } from "@/lib/security/devices";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, owner, vaultAccess, tags] = await Promise.all([
    getSessionUser(),
    isOwner(),
    hasVaultAccess(),
    listTagsWithCount(),
  ]);

  // Hanya owner yang boleh melihat funnel lintas-user, jadi query-nya
  // dipanggil sesudah tahu `owner` — bukan di Promise.all di atas yang
  // menjalankan semuanya terlepas dari perannya.
  const vaultFunnel: VaultFunnelSummary | null = owner ? await listVaultFunnelSummary() : null;

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
      <h1 className="px-1 text-lg font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
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

      {/* Entitlement vault, bukan isOwner(): pelanggan vault-only (daftar
          lewat /vault) juga butuh mengelola PIN-nya sendiri, bukan cuma
          pemilik aplikasi. */}
      {vaultAccess ? <VaultPinSettings /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Ambil seluruh entri, tag, dan tautanmu. Data yang tidak bisa dikeluarkan
            membuat aplikasi ini penjara data — jadi ini bukan fitur pelengkap.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {/* Unduhan biasa, bukan server action: browser perlu respons dengan
              Content-Disposition supaya berkasnya tersimpan. */}
          <Button size="touch" variant="outline" render={<a href="/api/export" download />}>
            Download JSON
          </Button>
          <Button
            size="touch"
            variant="outline"
            render={<a href="/api/export?format=md" download />}
          >
            Download Markdown
          </Button>
        </CardContent>
      </Card>

      <TagManager tags={tags} />

      {owner ? <InviteManager invites={invites} /> : null}

      {vaultFunnel ? <VaultFunnelSummaryCard summary={vaultFunnel} /> : null}

      {/* Pemilik tidak bisa menghapus akunnya lewat aplikasi — datanya
          menaungi undangan pengguna lain. */}
      {owner ? null : <DeleteAccount />}
    </div>
  );
}
