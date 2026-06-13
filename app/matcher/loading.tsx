import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="stack">
      <SkeletonCard rows={3} />
      <SkeletonCard rows={6} />
    </div>
  );
}
