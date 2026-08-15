import Topbar from "@/components/dashboard/Topbar";
import ReviewsManager, {
  type CoachReview,
} from "@/components/dashboard/reviews/ReviewsManager";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Page Avis du coach : lire ses avis, répondre publiquement (façon Vinted),
// signaler un avis abusif à l'équipe Madger. RLS : le coach ne lit que les
// siens ; la jointure clients passe par ses propres lignes clients.
export default async function CoachReviewsPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, reply, replied_at, hidden, clients(first_name, last_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <Topbar title={dict.coachReviews.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ReviewsManager
          initialReviews={(reviews ?? []) as unknown as CoachReview[]}
        />
      </main>
    </>
  );
}
