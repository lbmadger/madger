import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { loadInvoicePdfInput } from "@/lib/invoices/send";
import { renderInvoicePdf } from "@/lib/invoices/pdf";

export const dynamic = "force-dynamic";

// PDF d'une facture ou d'un avoir, pour le coach connecté. L'accès passe par
// la RLS (invoices_read_own) : une pièce d'un autre coach renvoie 404.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data: own } = await supabase
    .from("invoices")
    .select("id, number")
    .eq("id", params.id)
    .maybeSingle();
  if (!own?.number) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const loaded = await loadInvoicePdfInput(admin, params.id);
  if (!loaded) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const bytes = await renderInvoicePdf(loaded.input);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${own.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
