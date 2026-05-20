import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  FileText,
  GraduationCap,
  Layers3,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/AppLayout";

export default async function HomePage() {
  const [
    totalTurmas,
    totalAlunos,
    totalSimulados,
    totalRedacoes,
    totalObras,
    totalLeiturasAtivas,
    ultimosSimulados,
    ultimasRedacoes,
    leiturasRecentes,
  ] = await Promise.all([
    prisma.classRoom.count(),
    prisma.student.count(),
    prisma.exam.count(),
    prisma.essayCorrection.count(),
    prisma.book.count(),
    prisma.bookProgress.count({
      where: {
        status: "READING",
      },
    }),
    prisma.exam.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.essayCorrection.findMany({
      include: {
        student: {
          include: {
            classRoom: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.bookProgress.findMany({
      include: {
        book: true,
        student: {
          include: {
            classRoom: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    }),
  ]);

  const alunosSemLeitura = Math.max(totalAlunos - totalLeiturasAtivas, 0);

  return (
    <AppLayout>
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-8 text-white shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/20">
              <BarChart3 size={28} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Dashboard institucional
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Visão estratégica do Alfred: desempenho acadêmico, redações,
              simulados, leitura, repertório e acompanhamento pedagógico.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/simulados"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              Ver simulados
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/assistente"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Alfred IA
              <Brain size={16} />
            </Link>
          </div>
        </div>
      </div>

      <section className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-6">
        <DashboardCard
          title="Turmas"
          value={totalTurmas}
          icon={<Users size={22} />}
          highlight={false}
        />

        <DashboardCard
          title="Alunos"
          value={totalAlunos}
          icon={<GraduationCap size={22} />}
          highlight
        />

        <DashboardCard
          title="Simulados"
          value={totalSimulados}
          icon={<BookOpen size={22} />}
          highlight={false}
        />

        <DashboardCard
          title="Redações"
          value={totalRedacoes}
          icon={<FileText size={22} />}
          highlight={false}
        />

        <DashboardCard
          title="Obras"
          value={totalObras}
          icon={<Layers3 size={22} />}
          highlight={false}
        />

        <DashboardCard
          title="Leituras ativas"
          value={totalLeiturasAtivas}
          icon={<TrendingUp size={22} />}
          highlight
        />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[32px] border border-red-200 bg-red-50 p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-red-700">
                Alertas pedagógicos
              </h2>

              <p className="mt-1 text-sm text-red-600">
                Pontos que merecem atenção da coordenação e professores.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <AlertItem
              title="Alunos sem leitura ativa"
              description={`${alunosSemLeitura} aluno(s) ainda não possuem leitura em andamento registrada.`}
            />

            <AlertItem
              title="Acompanhamento de redação"
              description={`${totalRedacoes} redação(ões) corrigidas até o momento. Verifique turmas com baixa cobertura.`}
            />

            <AlertItem
              title="Simulados e análise"
              description="Acompanhe rankings, questões críticas e desempenho por disciplina após cada simulado."
            />
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900">
            Ações rápidas
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Atalhos para os principais fluxos do sistema.
          </p>

          <div className="mt-6 grid gap-3">
            <QuickAction href="/simulados" label="Criar ou acessar simulados" />
            <QuickAction href="/redacoes" label="Corrigir redações ENEM" />
            <QuickAction href="/leituras" label="Gerenciar + Leitura" />
            <QuickAction href="/repertorio" label="Gerar repertório com IA" />
            <QuickAction href="/alunos" label="Acessar perfis dos alunos" />
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">
                Últimos simulados
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Avaliações cadastradas recentemente.
              </p>
            </div>

            <Link
              href="/simulados"
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Ver todos
            </Link>
          </div>

          <div className="grid gap-4">
            {ultimosSimulados.map((simulado) => (
              <Link
                key={simulado.id}
                href={`/simulados/${simulado.id}`}
                className="group rounded-2xl border border-zinc-200 p-5 transition hover:border-red-200 hover:bg-red-50/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-red-700">
                      {simulado.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {simulado.grade}º ano • {simulado.totalQuestions} questões
                    </p>
                  </div>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {simulado.status}
                  </span>
                </div>
              </Link>
            ))}

            {ultimosSimulados.length === 0 && <EmptyState text="Nenhum simulado cadastrado ainda." />}
          </div>
        </div>

        <div className="grid gap-8">
          <div className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900">
              Últimas redações
            </h2>

            <div className="mt-6 grid gap-4">
              {ultimasRedacoes.map((redacao) => (
                <div
                  key={redacao.id}
                  className="rounded-2xl bg-zinc-50 p-5"
                >
                  <p className="font-semibold text-zinc-900">
                    {redacao.student.name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {redacao.student.classRoom.name} • Nota {redacao.totalScore}
                  </p>
                </div>
              ))}

              {ultimasRedacoes.length === 0 && <EmptyState text="Nenhuma redação corrigida ainda." />}
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900">
              Leituras recentes
            </h2>

            <div className="mt-6 grid gap-4">
              {leiturasRecentes.map((leitura) => (
                <div
                  key={leitura.id}
                  className="rounded-2xl bg-zinc-50 p-5"
                >
                  <p className="font-semibold text-zinc-900">
                    {leitura.student.name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {leitura.book.title} • {leitura.status}
                  </p>
                </div>
              ))}

              {leiturasRecentes.length === 0 && <EmptyState text="Nenhuma leitura registrada ainda." />}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

function DashboardCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  highlight: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
          highlight ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-700"
        }`}
      >
        {icon}
      </div>

      <p className="text-sm font-medium text-zinc-500">{title}</p>

      <p
        className={`mt-2 text-4xl font-bold tracking-tight ${
          highlight ? "text-red-600" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AlertItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="font-semibold text-zinc-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-700 transition hover:bg-red-50 hover:text-red-700"
    >
      <span>{label}</span>
      <Plus size={16} />
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center">
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}