import { ChartsPageSkeleton } from "@/components/ui/Skeleton";

// Les stats agrègent un an de réservations : c'est la page la plus lente du
// dashboard, elle ne doit surtout pas rester blanche.
export default function StatsLoading() {
  return <ChartsPageSkeleton />;
}
