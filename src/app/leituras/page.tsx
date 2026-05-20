import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";

export default async function LeiturasPage() {
  const books = await prisma.book.findMany({
    orderBy: {
      title: "asc",
    },
  });

  return (
    <AppLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-zinc-900">
          + Leitura
        </h1>

        <p className="mt-3 max-w-3xl text-zinc-500">
          Biblioteca institucional com obras fundamentais
          para vestibulares, ENEM, filosofia e formação intelectual.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/leituras/${book.id}`}
            className="group rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  {book.category.replaceAll("_", " ")}
                </p>

                <h2 className="mt-3 text-2xl font-bold text-zinc-900 transition group-hover:text-red-600">
                  {book.title}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {book.author}
                </p>
              </div>

              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                {book.difficulty}
              </div>
            </div>

            <div className="mt-6">
              <p className="line-clamp-4 text-sm leading-relaxed text-zinc-600">
                {book.enemRelevance}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-400">
                {book.originalYear}
              </span>

              <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                Vestibular
              </span>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}