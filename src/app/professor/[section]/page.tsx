
import { notFound, redirect } from "next/navigation";

import {
  ArrowLeftRight,
  BarChart3,
  BookText,
  ListChecks,
  SlidersHorizontal,
  Trophy,
  UsersRound,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { TeacherAreaNav } from "@/components/teacher/TeacherAreaNav";

import { TeacherRankingSection } from "@/components/teacher/ranking/TeacherRankingSection";
import { TeacherCompareSection } from "@/components/teacher/compare/TeacherCompareSection";
import { TeacherQuestionsSection } from "@/components/teacher/questions/TeacherQuestionsSection";
import { TeacherPerformanceSection } from "@/components/teacher/performance/TeacherPerformanceSection";
import { TeacherStudentsSection } from "@/components/teacher/students/TeacherStudentsSection";

import { getTeacherContext } from "@/lib/teacher/teacher-context";

const SECTION_CONFIG = {
  desempenho: {
    title: "Desempenho",
    description: "Evolução dos resultados da disciplina.",
    icon: BarChart3,
  },

  alunos: {
    title: "Alunos",
    description: "Acompanhamento individual dos estudantes.",
    icon: UsersRound,
  },

  questoes: {
    title: "Questões",
    description: "Análise de acertos e dificuldades.",
    icon: ListChecks,
  },

  ranking: {
    title: "Ranking",
    description: "Classificação por desempenho na disciplina.",
    icon: Trophy,
  },

  comparar: {
    title: "Comparar turmas",
    description: "Comparação de resultados entre turmas.",
    icon: ArrowLeftRight,
  },

  faixas: {
    title: "Faixas de desempenho",
    description: "Critérios de acompanhamento pedagógico.",
    icon: SlidersHorizontal,
  },

  redacoes: {
    title: "Redações",
    description: "Análise da produção textual dos alunos.",
    icon: BookText,
  },
} as const;

type SectionKey = keyof typeof SECTION_CONFIG;

type SearchParams = {
  turma?: string | string[];
  simulado?: string | string[];
  busca?: string | string[];
  situacao?: string | string[];
  ordem?: string | string[];
  turmaA?: string | string[];
  turmaB?: string | string[];
};

function singleSearchParam(
  value: string | string[] | undefined
) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

export default async function TeacherSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { section } = await params;
  const resolvedSearchParams = await searchParams;

  if (
    !Object.prototype.hasOwnProperty.call(
      SECTION_CONFIG,
      section
    )
  ) {
    notFound();
  }

  const sectionKey = section as SectionKey;

  const {
    teacherProfile,
    subjectLabel,
    areaLabel,
    isPortuguese,
  } = await getTeacherContext();

  if (!teacherProfile || !subjectLabel || !areaLabel) {
    redirect("/professor");
  }

  if (sectionKey === "redacoes" && !isPortuguese) {
    notFound();
  }

  if (sectionKey === "faixas") {
    redirect("/professor/faixas");
  }

  const config = SECTION_CONFIG[sectionKey];
  const Icon = config.icon;

  const classRoomId = singleSearchParam(
    resolvedSearchParams.turma
  );

  const examId = singleSearchParam(
    resolvedSearchParams.simulado
  );

  const search = singleSearchParam(
    resolvedSearchParams.busca
  );

  const situation = singleSearchParam(
    resolvedSearchParams.situacao
  );

  const order = singleSearchParam(
    resolvedSearchParams.ordem
  );

  const classRoomAId = singleSearchParam(
    resolvedSearchParams.turmaA
  );

  const classRoomBId = singleSearchParam(
    resolvedSearchParams.turmaB
  );

  return (
    <AppLayout>
      <div className="mx-auto grid w-full max-w-[1440px] gap-7 pb-12">
        {/* Cabeçalho */}
        <header>
          <div className="mb-5 h-1 w-10 rounded-full bg-[#F97316]" />

          <div className="flex items-center gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-orange-50 p-3.5 text-[#EA580C] sm:h-14 sm:w-14">
              <Icon size={25} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
                {config.title}
                <span className="text-[#F97316]">.</span>
              </h1>

              <p className="mt-1.5 text-sm font-medium text-slate-500">
                {subjectLabel}
                <span className="mx-2 text-slate-300">·</span>
                {areaLabel}
              </p>
            </div>
          </div>
        </header>

        {/* Navegação da área do professor */}
        <TeacherAreaNav isPortuguese={isPortuguese} />

        {/* Conteúdo da seção */}
        <main className="min-w-0">
          {sectionKey === "desempenho" ? (
            <TeacherPerformanceSection
              teacherProfileId={teacherProfile.id}
              classRoomId={classRoomId}
              examId={examId}
            />
          ) : sectionKey === "alunos" ? (
            <TeacherStudentsSection
              teacherProfileId={teacherProfile.id}
              classRoomId={classRoomId}
              examId={examId}
              search={search}
              situation={situation}
              order={order}
            />
          ) : sectionKey === "questoes" ? (
            <TeacherQuestionsSection
              teacherProfileId={teacherProfile.id}
              classRoomId={classRoomId}
              examId={examId}
              order={order}
            />
          ) : sectionKey === "ranking" ? (
            <TeacherRankingSection
              teacherProfileId={teacherProfile.id}
              classRoomId={classRoomId}
              examId={examId}
            />
          ) : sectionKey === "comparar" ? (
            <TeacherCompareSection
              teacherProfileId={teacherProfile.id}
              classRoomAId={classRoomAId}
              classRoomBId={classRoomBId}
              examId={examId}
            />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                <Icon size={25} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                {config.title}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Esta funcionalidade ainda não está disponível.
              </p>
            </section>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
