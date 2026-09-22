import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { parseInstagramUrl } from "@/lib/validations/instagram";
import { readSession } from "@/lib/instagram/session";
import { MetaInstagramProvider } from "@/lib/instagram/meta-provider";
import { InstagramProviderError } from "@/lib/instagram/provider";

const requestSchema = z.union([
  z.object({ mediaId: z.string().min(1) }),
  z.object({ url: z.string().min(1) }),
]);

function errorStatus(code: InstagramProviderError["code"]): number {
  switch (code) {
    case "invalid_url":
      return 400;
    case "not_found":
      return 404;
    case "unauthorized":
      return 401;
    case "rate_limited":
      return 429;
    default:
      return 502;
  }
}

export async function POST(request: NextRequest) {
  const session = readSession(request.cookies);
  if (!session) {
    return NextResponse.json(
      { error: "Потрібно увійти через Instagram." },
      { status: 401 },
    );
  }

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
      { error: "Відсутнє або недійсне поле `mediaId`/`url`." },
      { status: 400 },
    );
  }

  const provider = new MetaInstagramProvider(session.accessToken, session.userId);

  try {
    if ("mediaId" in parsedBody.data) {
      const comments = await provider.getCommentsByMediaId(parsedBody.data.mediaId);
      return NextResponse.json({ provider: provider.name, comments });
    }

    const parsedUrl = parseInstagramUrl(parsedBody.data.url);
    if (!parsedUrl.success) {
      return NextResponse.json({ error: parsedUrl.error }, { status: 400 });
    }

    const comments = await provider.getComments(parsedUrl.data.url);
    return NextResponse.json({ provider: provider.name, comments });
  } catch (error) {
    if (error instanceof InstagramProviderError) {
      return NextResponse.json(
        { error: error.message },
        { status: errorStatus(error.code) },
      );
    }

    return NextResponse.json(
      { error: "Щось пішло не так під час завантаження коментарів." },
      { status: 500 },
    );
  }
}
