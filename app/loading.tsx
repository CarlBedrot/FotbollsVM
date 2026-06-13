import { SkeletonCard, SkeletonStatGrid } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="stack">
      <SkeletonCard rows={3} />
      <div className="twocol">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={4} />
      </div>
      <SkeletonStatGrid />
    </div>
  );
}
