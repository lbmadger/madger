import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Export CSV des encaissements PAR CLIENT du coach connecté (lot 4) : une
// ligne par client avec nombre de paiements, encaissé, remboursé, versé,
// sous séquestre, crédits de pack en cours et dernier paiement. Format
// tableur français (« ; », virgule décimale, BOM). RLS = coach connecté.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: pays, error }, { data: packs }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "client_id, amount_cents, refunded_cents, released_cents, payout_cents, escrow_status, paid_at, clients(first_name, last_name, email)"
      )
      .not("paid_at", "is", null)
      .limit(5000),
    supabase
      .from("pack_credits")
      .select("client_id, total, used")
      .eq("status", "active"),
  ]);
  if (error) {
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }

  type Row = {
    name: string;
    email: string;
    count: number;
    collected: number;
    refunded: number;
    paidOut: number;
    escrow: number;
    credits: number;
    last: string;
  };
  const byClient = new Map<string, Row>();
  for (const p of pays ?? []) {
    const id = (p.client_id as string | null) ?? "-";
    const cl = Array.isArray(p.clients) ? p.clients[0] : p.clients;
    const cur =
      byClient.get(id) ??
      {
        name: [cl?.first_name, cl?.last_name].filter(Boolean).join(" ") || "-",
        email: (cl?.email as string | null) ?? "",
        count: 0,
        collected: 0,
        refunded: 0,
        paidOut: 0,
        escrow: 0,
        credits: 0,
        last: "",
      };
    const amount = (p.amount_cents as number) || 0;
    const refunded = (p.refunded_cents as number) || 0;
    const released = (p.released_cents as number) || 0;
    const status = p.escrow_status as string;
    cur.count += 1;
    cur.collected += amount;
    cur.refunded += refunded;
    cur.paidOut +=
      status === "released" || status === "canceled"
        ? (p.payout_cents as number) || released
        : released;
    if (status === "held" || status === "disputed") {
      cur.escrow += Math.max(0, amount - refunded - released);
    }
    if ((p.paid_at as string) > cur.last) cur.last = p.paid_at as string;
    byClient.set(id, cur);
  }
  for (const pk of packs ?? []) {
    const cur = byClient.get(pk.client_id as string);
    if (cur) cur.credits += Math.max(0, (pk.total as number) - (pk.used as number));
  }

  const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const cell = (v: string) =>
    /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const header = [
    "Client",
    "Email",
    "Paiements",
    "Encaisse (EUR)",
    "Rembourse (EUR)",
    "Verse (EUR)",
    "Sous sequestre (EUR)",
    "Seances de pack restantes",
    "Dernier paiement",
  ];
  const rows = Array.from(byClient.values())
    .sort((a, b) => b.collected - a.collected)
    .map((r) =>
      [
        cell(r.name),
        cell(r.email),
        String(r.count),
        money(r.collected),
        money(r.refunded),
        money(r.paidOut),
        money(r.escrow),
        String(r.credits),
        r.last
          ? new Date(r.last).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
          : "-",
      ].join(";")
    );
  const csv = "﻿" + [header.join(";"), ...rows].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="madger-clients-encaissements.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
