import { SkeletonCard, SkeletonStatGrid } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="stack">
      <SkeletonStatGrid />
      <div className="twocol">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={5} />
      </div>
    </div>
  );
}
