import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // OpenAI streaming call using async iterator
          const response = await openai.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [{ role: "user", content: query }],
            stream: true, // enable streaming
          });

          for await (const chunk of response) {
            const text = chunk.choices?.[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }

          controller.close();
        } catch (err) {
          console.error(err);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
}
