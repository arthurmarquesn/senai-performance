import { LoginForm } from "@/components/LoginForm";
import { BarChart3, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600">
            <BarChart3 size={26} />
          </div>

          <div>
            <h1 className="text-3xl font-semibold">PERFORMANCE</h1>
            <p className="text-sm text-zinc-400">GESTÃO EDUCACIONAL</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase text-red-400">
            Plataforma acadêmica
          </p>

          <h2 className="mt-5 text-4xl font-semibold leading-tight">
            Centro institucional de desempenho academico.
          </h2>

          <p className="mt-5 text-base leading-relaxed text-zinc-400">
            Ninguém cresce sozinho.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-sm text-zinc-400">
          <span>Dados</span>
          <span>Avaliacao</span>
          <span>Relatorios</span>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="performance-panel rounded-lg p-8">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white">
                <LockKeyhole size={24} />
              </div>

              <h1 className="text-3xl font-semibold text-zinc-900">Entrar</h1>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Acesse o ambiente interno da plataforma academica.
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 border-t border-zinc-200 pt-6">
              <p className="text-xs leading-relaxed text-zinc-400">
                Plataforma institucional destinada ao acompanhamento e analise
                de desempenho academico.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
