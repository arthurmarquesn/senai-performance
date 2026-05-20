import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body.message || "").trim();
    const bookId = String(body.bookId || "").trim();
    const history = Array.isArray(body.history)
      ? (body.history as ChatMessage[])
      : [];

    if (!message || !bookId) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    const book = await prisma.book.findUnique({
      where: {
        id: bookId,
      },
    });

    if (!book) {
      return NextResponse.json(
        {
          error: "Livro não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: "GROQ_API_KEY não configurada.",
        },
        {
          status: 500,
        }
      );
    }

    const safeHistory = history
      .filter(
        (item) =>
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim().length > 0
      )
      .slice(-8);

    const prompt = `
O aluno está estudando a seguinte obra:

Título: ${book.title}
Autor: ${book.author}
Categoria: ${book.category}
Temas: ${book.themes ?? "Não informado"}
Importância vestibular: ${book.enemRelevance ?? "Não informado"}

Pergunta atual do aluno:
${message}

Responda considerando a obra acima e o histórico recente da conversa.
`.trim();

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
              content: `
Você é Alfred, um mentor intelectual pedagógico especializado em vestibulares brasileiros, ENEM, filosofia, literatura e redação.

Regras:
- Responda em português do Brasil.
- Use Markdown bem formatado.
- Seja claro, didático e objetivo.
- Relacione a obra com ENEM, vestibulares e redação quando fizer sentido.
- Não invente dados específicos da obra se não tiver certeza.
- Se a pergunta pedir repertório, explique como usar na argumentação.
              `.trim(),
            },
            ...safeHistory,
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Erro Groq:", errorText);

      return NextResponse.json(
        {
          error: "Erro ao consultar o Alfred.",
        },
        {
          status: 500,
        }
      );
    }

    const data = await response.json();

    const text =
      data?.choices?.[0]?.message?.content || "Não consegui responder.";

    return NextResponse.json({
      response: text,
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