import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

// Back-office équipe Madger. Réservé aux e-mails listés dans ADMIN_EMAILS.
// Le gating est fait ici une fois pour toutes les pages /admin/*.
export const metadata = { robots: { index: false } };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg text-text-base">
      <header className="border-b border-border bg-bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight">Madger</span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-black">
              admin
            </span>
          </Link>
          <span className="truncate text-xs text-text-dim">{user.email}</span>
        </div>
        <AdminNav />
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
