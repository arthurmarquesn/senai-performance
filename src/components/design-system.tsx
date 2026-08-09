import type { ReactNode } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  stats,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
}) {
  return (
    <header className="performance-page-header mb-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex max-w-3xl items-start gap-4">
          {icon && (
            <div className="performance-icon-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              {icon}
            </div>
          )}

          <div>
            {eyebrow && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>

      {stats && <div className="mt-5">{stats}</div>}
    </header>
  );
}

export function MetricStrip({
  children,
  columns = "md:grid-cols-4",
}: {
  children: ReactNode;
  columns?: string;
}) {
  return (
    <div className={cx("performance-kpi-row grid gap-px overflow-hidden rounded-3xl", columns)}>
      {children}
    </div>
  );
}

export function MetricCell({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className="bg-white/72 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p
        className={cx(
          "mt-2 text-3xl font-semibold tracking-tight",
          tone === "brand" ? "text-red-600" : "text-zinc-950"
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

export function Panel({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cx("performance-panel rounded-3xl p-5 md:p-6", className)}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-10 text-center">
      <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "brand" && "border-red-200 bg-red-50 text-red-700",
        tone === "success" && "border-green-200 bg-green-50 text-green-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "neutral" && "border-zinc-200 bg-zinc-50 text-zinc-600"
      )}
    >
      {children}
    </span>
  );
}
