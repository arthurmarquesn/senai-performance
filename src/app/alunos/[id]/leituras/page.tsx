import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";

function getRecommendationReason(book: any) {
  const text = `${book.themes ?? ""} ${book.enemRelevance ?? ""}`.toLowerCase();

  if (text.includes("desigualdade") || text.includes("racismo")) {
    return "Ajuda a fortalecer repertório sobre desigualdade social, racismo e exclusão.";
  }

  if (text.includes("política") || text.includes("estado") || text.includes("poder")) {
    return "Ajuda a desenvolver repertório sobre política, Estado, poder e cidadania.";
  }

  if (text.includes("ética") || text.includes("moral")) {
    return "Ajuda a construir repertório sobre ética, comportamento social e valores.";
  }

  if (text.includes("educação") || text.includes("verdade")) {
    return "Ajuda em temas sobre educação, conhecimento, alienação e busca pela verdade.";
  }

  return "Obra relevante para ampliar repertório sociocultural e interpretação crítica.";
}

export default async function StudentReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      classRoom: true,
      bookProgresses: {
        include: {
          book: true,
        },
      },
      essayCorrections: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!student) {
    return (
      <AppLayout>
        <p className="text-sm text-zinc-500">Aluno não encontrado.</p>
      </AppLayout>
    );
  }

  const books = await prisma.book.findMany({
    orderBy: {
      title: "asc",
    },
  });

  const progressMap = new Map(
    student.bookProgresses.map((progress) => [progress.bookId, progress])
  );

  const averageEssay =
    student.essayCorrections.length > 0
      ? Math.round(
          student.essayCorrections.reduce(
            (acc, item) => acc + item.totalScore,
            0
          ) / student.essayCorrections.length
        )
      : null;

  const recommendedBooks = books
    .map((book) => ({
      book,
      progress: progressMap.get(book.id),
      reason: getRecommendationReason(book),
    }))
    .sort((a, b) => {
      const aDone = a.progress?.status === "FINISHED" ? 1 : 0;
      const bDone = b.progress?.status === "FINISHED" ? 1 : 0;

      return aDone - bDone;
    });

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900">
            Recomendações de leitura
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            {student.name} • {student.classRoom.name}
          </p>
        </div>

        <Link
          href={`/alunos/${student.id}`}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          Voltar ao perfil
        </Link>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Leituras iniciadas</p>
          <p className="mt-2 text-4xl font-bold text-red-600">
            {student.bookProgresses.length}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Leituras concluídas</p>
          <p className="mt-2 text-4xl font-bold text-zinc-900">
            {
              student.bookProgresses.filter(
                (progress) => progress.status === "FINISHED"
              ).length
            }
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Média redação</p>
          <p className="mt-2 text-4xl font-bold text-zinc-900">
            {averageEssay ?? "-"}
          </p>
        </div>
      </section>

      <section className="grid gap-5">
        {recommendedBooks.map(({ book, progress, reason }) => (
          <Link
            key={book.id}
            href={`/leituras/${book.id}`}
            className="group rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  {book.category.replaceAll("_", " ")}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-zinc-900 group-hover:text-red-700">
                  {book.title}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">{book.author}</p>

                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-600">
                  {reason}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                  {book.difficulty}
                </span>

                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  {progress?.status === "FINISHED"
                    ? "Concluído"
                    : progress?.status === "READING"
                      ? "Lendo"
                      : "Recomendado"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </AppLayout>
  );
}