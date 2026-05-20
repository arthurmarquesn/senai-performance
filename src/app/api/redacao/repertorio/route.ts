import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      theme,
    }: {
      theme: string;
    } = body;

    if (!theme) {
      return NextResponse.json(
        {
          error: "Tema obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const books = await prisma.book.findMany();

    const booksContext = books
      .map((book) => {
        return `
Título: ${book.title}
Autor: ${book.author}
Temas: ${book.themes}
Importância ENEM: ${book.enemRelevance}
`;
      })
      .join("\n");

    const prompt = `
Você é Alfred, um mentor pedagógico especializado em ENEM e vestibulares.

O aluno precisa de repertórios socioculturais para o seguinte tema:

TEMA:
${theme}

Você possui as seguintes obras cadastradas:

${booksContext}

Sua tarefa:
- selecionar os MELHORES repertórios;
- explicar por que cada um funciona;
- mostrar COMO usar em redação;
- criar conexões sociológicas, filosóficas e literárias;
- ser extremamente didático;
- organizar a resposta.

Estrutura:
1. Obra
2. Conceito
3. Como usar
4. Exemplo de argumentação
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "Você é Alfred, especialista em repertório ENEM.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({
      response:
        data?.choices?.[0]?.message?.content ??
        "Não consegui gerar repertórios.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Erro interno.",
      },
      {
        status: 500,
      }
    );
  }
}