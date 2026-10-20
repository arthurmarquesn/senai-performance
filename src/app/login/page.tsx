
import { LoginForm } from "@/components/LoginForm";
import {
  BarChart3,
  GraduationCap,
  TrendingUp,
} from "lucide-react";

const bars = [32, 45, 40, 56, 51, 67, 62, 79, 74, 91];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] lg:grid lg:grid-cols-[53%_47%]">
      {/* Painel institucional */}
      <section className="relative hidden min-h-[650px] overflow-hidden bg-gradient-to-br from-[#FF7900] via-[#F46B00] to-[#E65C00] text-white lg:flex lg:flex-col">
        {/* Divisão ondulada */}
        <svg
          className="pointer-events-none absolute -right-px top-0 z-10 h-full w-[80px] xl:w-[120px]"
          viewBox="0 0 120 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 75 0 C 25 140, 115 260, 73 390 C 28 530, 112 660, 72 790 C 35 905, 100 960, 75 1000 L 120 1000 L 120 0 Z"
            fill="#F8FAFC"
          />
        </svg>

        {/* Marca */}
        <header className="relative z-20 flex items-center gap-3 px-10 pt-10 xl:px-16 xl:pt-12">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <BarChart3 size={25} strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              PERFORMANCE
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
              Inteligência Educacional
            </p>
          </div>
        </header>

        {/* Conteúdo principal */}
        <div className="relative z-20 flex flex-1 items-center px-10 py-12 pr-24 xl:px-16 xl:pr-32">
          <div className="w-full max-w-[540px]">
            <h2 className="max-w-[520px] text-[clamp(2.3rem,3.6vw,4.4rem)] font-bold leading-[1.08] tracking-[-0.055em]">
              Conhecimento que impulsiona{" "}
              <span className="text-[#FFF0DC]">
                resultados.
              </span>
            </h2>

            {/* Gráfico ilustrativo */}
            <div className="mt-12 max-w-[440px]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Evolução do aprendizado
                </p>
                <TrendingUp
                  size={20}
                  className="text-white"
                />
              </div>

              <div className="relative mt-6">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3].map((line) => (
                    <div
                      key={line}
                      className="border-t border-dashed border-white/20"
                    />
                  ))}
                </div>

                <div className="relative flex h-36 items-end gap-2">
                  {bars.map((height, index) => (
                    <div
                      key={index}
                      className="flex h-full flex-1 items-end"
                    >
                      <div
                        className={`w-full rounded-t-sm ${
                          index === bars.length - 1
                            ? "bg-white"
                            : "bg-white/40"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <footer className="relative z-20 px-10 pb-10 text-sm font-medium text-white/90 xl:px-16">
          Ninguém cresce sozinho.
        </footer>
      </section>

      {/* Área de login */}
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-12">
        {/* Marca mobile */}
        <header className="flex items-center gap-3 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F46B00] text-white">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#14213A]">
              PERFORMANCE
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              Inteligência Educacional
            </p>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-9">
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#14213A] text-white">
                <GraduationCap size={27} strokeWidth={1.8} />
              </div>

              <h2 className="text-[clamp(2.4rem,3.5vw,3.4rem)] font-bold tracking-[-0.05em] text-[#14213A]">
                Bem-vindo<span className="text-[#F46B00]">.</span>
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_15px_45px_-28px_rgba(15,23,42,0.18)] sm:p-8">
              <LoginForm />
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-400">
          PERFORMANCE · Gestão Educacional
        </footer>
      </section>
    </main>
  );
}
