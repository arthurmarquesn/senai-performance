import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Search } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
  brand: "border-red-200 bg-red-50 text-red-700",
  accent: "border-orange-200 bg-orange-50 text-orange-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]",
        variant === "primary" && "performance-primary-action",
        variant === "secondary" && "performance-secondary-action",
        variant === "ghost" && "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cx(
        "performance-field min-h-10 rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10",
        className
      )}
      {...props}
    />
  );
}

export function SearchInput({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <label
      className={cx(
        "performance-field flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm text-zinc-500",
        className
      )}
    >
      <Search size={16} />
      <input
        className="min-w-0 flex-1 bg-transparent py-2 outline-none disabled:cursor-not-allowed"
        {...props}
      />
    </label>
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cx(
        "performance-field min-h-10 rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex max-w-4xl items-start gap-3">
          {icon && (
            <div className="performance-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
              {icon}
            </div>
          )}

          <div>
            {eyebrow && (
              <p className="mb-1 text-xs font-semibold uppercase text-red-700">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-semibold text-zinc-950 md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      {stats && <div className="mt-4">{stats}</div>}
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
    <div className={cx("performance-kpi-row grid gap-px overflow-hidden", columns)}>
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
  tone?: "default" | "brand" | "accent";
}) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p
        className={cx(
          "mt-1 text-2xl font-semibold",
          tone === "brand" && "text-red-700",
          tone === "accent" && "text-orange-700",
          tone === "default" && "text-zinc-950"
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
    <section id={id} className={cx("performance-panel p-4 md:p-5", className)}>
      {children}
    </section>
  );
}

export const Card = Panel;

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
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase text-red-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabLink({
  children,
  active,
  className,
  ...props
}: ComponentPropsWithoutRef<"a"> & { active?: boolean }) {
  return (
    <a
      className={cx(
        "whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold",
        active
          ? "bg-red-50 text-red-700"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("overflow-x-auto rounded-lg border border-zinc-200 bg-white", className)}>
      <table className="min-w-full divide-y divide-zinc-200 text-sm">{children}</table>
    </div>
  );
}

export function Alert({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={cx("rounded-lg border p-4 text-sm", toneClasses[tone])}>
      {children}
    </div>
  );
}

export function ModalShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-lg">
      {children}
    </div>
  );
}
