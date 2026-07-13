function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className ?? ''}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando página">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-9 w-64" />
          <Shimmer className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Shimmer className="h-11 w-[220px]" />
          <Shimmer className="h-11 w-11" />
          <Shimmer className="h-11 w-36" />
        </div>
      </div>

      <Shimmer className="min-h-[220px] rounded-[28px]" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="min-h-[132px] rounded-[22px] sm:min-h-[158px]" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Shimmer className="h-[320px]" />
        <Shimmer className="h-[320px]" />
      </div>
    </div>
  );
}
