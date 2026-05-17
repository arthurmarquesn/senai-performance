"use client";

type CompetencyCardProps = {
  title: string;
  description: string;
  criteria: string[];
  value: number;
  name: string;
};

const scores = [0, 40, 80, 120, 160, 200];

export function CompetencyCard({
  title,
  description,
  criteria,
  value,
  name,
}: CompetencyCardProps) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-zinc-900">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>

      <div className="mb-6 grid gap-3">
        {criteria.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3"
          >
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />

            <p className="text-sm leading-relaxed text-zinc-600">
              {item}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Nota da competência
        </p>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {scores.map((score) => (
            <label
              key={score}
              className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                value === score
                  ? "border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-red-300"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={score}
                defaultChecked={value === score}
                className="hidden"
              />

              {score}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}