import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { UnderConstructionBanner } from "@/components/UnderConstructionBanner";

export default async function LeiturasDashboardPage() {
  

  const books = await prisma.book.findMany({

    include: {
      progresses: {
        include: {
          student: {
            include: {
              classRoom: true,
            },
          },
        },
      },
    },
  });

  const totalBooks = books.length;

  const totalReading = books.reduce(
    (acc, book) =>
      acc +
      book.progresses.filter((p) => p.status === "READING").length,
    0
  );

  const totalFinished = books.reduce(
    (acc, book) =>
      acc +
      book.progresses.filter((p) => p.status === "FINISHED").length,
    0
  );

  const ranking = books
    .flatMap((book) => book.progresses)
    .reduce((acc: any[], progress) => {
      const existing = acc.find(
        (item) => item.student.id === progress.student.id
      );

      if (existing) {
        existing.points += progress.progress;
      } else {
        acc.push({
          student: progress.student,
          points: progress.progress,
        });
      }

      return acc;
    }, [])
    .sort((a, b) => b.points - a.points);

  const mostReadBooks = books
    .map((book) => ({
      title: book.title,
      total: book.progresses.length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <AppLayout>
      <UnderConstructionBanner pageName="Leituras Dashboard" />
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-zinc-900">
          Dashboard + Leitura
        </h1>

        <p className="mt-3 text-zinc-500">
          Monitoramento institucional de leitura e repertório.
        </p>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">
            Obras cadastradas
          </p>

          <p className="mt-2 text-4xl font-bold text-red-600">
            {totalBooks}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">
            Leituras em andamento
          </p>

          <p className="mt-2 text-4xl font-bold text-zinc-900">
            {totalReading}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">
            Leituras concluídas
          </p>

          <p className="mt-2 text-4xl font-bold text-zinc-900">
            {totalFinished}
          </p>
        </div>
      </section>

      <section className="mb-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900">
            Ranking intelectual
          </h2>

          <div className="mt-6 grid gap-3">
            {ranking.slice(0, 10).map((item, index) => (
              <div
                key={item.student.id}
                className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
              >
                <div>
                  <p className="font-semibold text-zinc-900">
                    #{index + 1} — {item.student.name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.student.classRoom.name}
                  </p>
                </div>

                <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  {item.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900">
            Obras mais lidas
          </h2>

          <div className="mt-6 grid gap-3">
            {mostReadBooks.map((book, index) => (
              <div
                key={book.title}
                className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
              >
                <div>
                  <p className="font-semibold text-zinc-900">
                    #{index + 1} — {book.title}
                  </p>
                </div>

                <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  {book.total} leitores
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}