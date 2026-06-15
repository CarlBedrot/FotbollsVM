import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="stack">
      <SkeletonCard rows={1} />
      <SkeletonCard rows={8} />
    </div>
  );
}
