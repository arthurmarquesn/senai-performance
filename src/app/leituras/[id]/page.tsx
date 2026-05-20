import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";
import { updateReadingStatus } from "../actions";
import { BookAIChat } from "@/components/leituras/BookAIChat";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: {
      id,
    },
    include: {
      progresses: {
        include: {
          student: {
            include: {
              classRoom: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!book) {
    return (
      <AppLayout>
        <p>Obra não encontrada.</p>
      </AppLayout>
    );
  }

  const students = await prisma.student.findMany({
    include: {
      classRoom: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const totalFinished = book.progresses.filter(
    (item) => item.status === "FINISHED"
  ).length;

  const totalReading = book.progresses.filter(
    (item) => item.status === "READING"
  ).length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-10 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex h-[360px] w-[250px] shrink-0 items-center justify-center rounded-[28px] bg-zinc-100 text-center">
              <span className="px-6 text-lg font-semibold text-zinc-500">
                {book.title}
              </span>
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                {book.category.replaceAll("_", " ")}
              </p>

              <h1 className="mt-3 text-5xl font-bold text-zinc-900">
                {book.title}
              </h1>

              <p className="mt-4 text-xl text-zinc-500">{book.author}</p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">Escola Literária</p>

                  <p className="mt-2 font-semibold text-zinc-900">
                    {book.literarySchool ?? "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">Ano original</p>

                  <p className="mt-2 font-semibold text-zinc-900">
                    {book.originalYear ?? "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">Dificuldade</p>

                  <p className="mt-2 font-semibold text-zinc-900">
                    {book.difficulty}
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="text-2xl font-bold text-zinc-900">
                  Importância para vestibulares
                </h2>

                <p className="mt-4 leading-relaxed text-zinc-600">
                  {book.enemRelevance ?? "Nenhuma descrição cadastrada."}
                </p>
              </div>

              <div className="mt-10">
                <h2 className="text-2xl font-bold text-zinc-900">
                  Temas centrais
                </h2>

                <p className="mt-4 leading-relaxed text-zinc-600">
                  {book.themes ?? "Nenhum tema cadastrado."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">
                Progresso de leitura
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Registre o acompanhamento de leitura por aluno.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-2xl bg-red-50 px-5 py-3">
                <p className="text-xs font-medium text-red-700">Lendo</p>
                <p className="text-2xl font-bold text-red-600">
                  {totalReading}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 px-5 py-3">
                <p className="text-xs font-medium text-zinc-500">Concluíram</p>
                <p className="text-2xl font-bold text-zinc-900">
                  {totalFinished}
                </p>
              </div>
            </div>
          </div>

          <form
            action={updateReadingStatus}
            className="grid gap-4 md:grid-cols-[1fr_auto_auto]"
          >
            <input type="hidden" name="bookId" value={book.id} />

            <select
              name="studentId"
              required
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            >
              <option value="">Selecione o aluno</option>

              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — {student.classRoom.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              name="status"
              value="READING"
              className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Marcar lendo
            </button>

            <button
              type="submit"
              name="status"
              value="FINISHED"
              className="rounded-2xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Marcar concluído
            </button>
          </form>

          <div className="mt-8 grid gap-3">
            {book.progresses.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-zinc-900">
                    {item.student.name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.student.classRoom.name}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                    {item.progress}%
                  </span>

                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    {item.status === "FINISHED"
                      ? "Concluído"
                      : item.status === "READING"
                        ? "Lendo"
                        : item.status === "PAUSED"
                          ? "Pausado"
                          : "Planejado"}
                  </span>
                </div>
              </div>
            ))}

            {book.progresses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
                <p className="text-sm text-zinc-500">
                  Nenhum progresso registrado para esta obra.
                </p>
              </div>
            )}
          </div>
        </section>
        <BookAIChat bookId={book.id} />
      </div>
    </AppLayout>
  );
}