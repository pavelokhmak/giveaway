import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { parseInstagramUrl } from "@/lib/validations/instagram";
import { getInstagramProvider } from "@/lib/instagram/get-provider";
import { InstagramProviderError } from "@/lib/instagram/provider";

const requestSchema = z.object({
  url: z.string(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Тіло запиту має бути коректним JSON." },
      { status: 400 },
    );
  }

  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Відсутнє або недійсне поле `url`." },
      { status: 400 },
    );
  }

  const parsedUrl = parseInstagramUrl(parsedBody.data.url);
  if (!parsedUrl.success) {
    return NextResponse.json({ error: parsedUrl.error }, { status: 400 });
  }

  const provider = getInstagramProvider();

  try {
    const comments = await provider.getComments(parsedUrl.data.url);
    return NextResponse.json({ provider: provider.name, comments });
  } catch (error) {
    if (error instanceof InstagramProviderError) {
      const status =
        error.code === "invalid_url"
          ? 400
          : error.code === "not_found"
            ? 404
            : error.code === "unauthorized"
              ? 401
              : error.code === "rate_limited"
                ? 429
                : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Щось пішло не так під час завантаження коментарів." },
      { status: 500 },
    );
  }
}
