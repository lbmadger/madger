import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/admin";
import AdminReviewsList, {
  type AdminReview,
} from "@/components/admin/AdminReviewsList";

export const dynamic = "force-dynamic";

// Modération des avis (façon Vinted) : l'admin voit tout, masque ou
// réaffiche. Un avis masqué disparaît de la page publique et du calcul de
// la note (trigger migration 0053).
export default async function AdminReviewsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  const admin = createAdmin(SUPABASE_URL, serviceKey);

  const { data: reviews } = await admin
    .from("reviews")
    .select(
      "id, rating, comment, created_at, reply, hidden, coaches(first_name, last_name, slug), clients(first_name, last_name)"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight">Avis</h1>
      <p className="mt-1 text-sm text-text-muted">
        Masquer retire l&apos;avis de la page publique et de la note moyenne
        (réversible). À utiliser sur signalement d&apos;un coach, quand
        l&apos;avis enfreint les règles : insultes, hors-sujet, faux avis.
      </p>
      <AdminReviewsList
        initialReviews={(reviews ?? []) as unknown as AdminReview[]}
      />
    </div>
  );
}
