import { AppLayout } from "@/components/AppLayout";
import { AiChat } from "@/components/AIChat";
import { UnderConstructionBanner } from "@/components/UnderConstructionBanner";



export default function AssistentePage() {
  return (
    <AppLayout>
      <UnderConstructionBanner pageName="Assistente Pedagógico" />
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Assistente pedagógico
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Faça perguntas sobre turmas, simulados, redações e indicadores gerais
          da plataforma.
        </p>
      </div>

      <AiChat />
    </AppLayout>
  );
}