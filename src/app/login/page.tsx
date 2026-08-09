import { LoginForm } from "@/components/LoginForm";
import { BarChart3, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.08fr_0.92fr]">
      <section className="hidden flex-col justify-between bg-zinc-950 p-14 text-white lg:flex">
        <div className="flex items-center gap-4">
          <div className="performance-hero-icon flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600">
            <BarChart3 size={28} />
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Performance
            </h1>
            <p className="text-sm text-zinc-400">
              Inteligência acadêmica institucional
            </p>
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-red-400">
            Academic Intelligence Platform
          </p>

          <h2 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
            Centro institucional de desempenho acadêmico.
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Reúna simulados, redações, leitura, repertório e acompanhamento
            pedagógico em um ambiente seguro para coordenação e professores.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-sm text-zinc-400">
          <span>Dados</span>
          <span>Análise</span>
          <span>Educação</span>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="performance-panel rounded-[32px] p-8">
            <div className="mb-8">
              <div className="performance-icon-tile mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white">
                <LockKeyhole size={24} />
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                Entrar
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Acesse o ambiente interno da plataforma acadêmica.
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 border-t border-zinc-200 pt-6">
              <p className="text-xs leading-relaxed text-zinc-400">
                Plataforma institucional destinada ao acompanhamento e análise
                de desempenho acadêmico.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
