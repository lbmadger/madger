import { ListPageSkeleton } from "@/components/ui/Skeleton";

// Espace client : squelette immédiat pendant que séances et notifications
// se chargent, au lieu d'un écran figé.
export default function Loading() {
  return <ListPageSkeleton />;
}
