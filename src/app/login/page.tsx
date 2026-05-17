import { LoginForm } from "@/components/LoginForm";
import { BarChart3, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#F4F6F8]">
      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-red-600/10 blur-3xl" />

      <div className="absolute bottom-[-120px] right-[-120px] h-[320px] w-[320px] rounded-full bg-red-600/10 blur-3xl" />

      <section className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-14 text-white lg:flex">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600">
              <BarChart3 size={28} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Performance
              </h1>

              <p className="text-sm text-zinc-400">
                Ninguém cresce sozinho.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-lg">
          <h2 className="text-5xl font-bold leading-tight">
            Gestão inteligente de desempenho escolar.
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Plataforma institucional para acompanhamento analítico de
            simulados, evolução acadêmica e indicadores de desempenho.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <div className="h-2 w-2 rounded-full bg-red-500" />

          Ambiente institucional seguro
        </div>
      </section>

      <section className="relative flex w-full items-center justify-center p-6 lg:max-w-xl">
        <div className="w-full max-w-md">
          <div className="rounded-[32px] border border-white/40 bg-white/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                <LockKeyhole size={24} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Entrar
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Acesse o ambiente interno da plataforma acadêmica.
              </p>
            </div>

           <LoginForm></LoginForm>

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