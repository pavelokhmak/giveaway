import { NextRequest, NextResponse } from "next/server";

import { readSession } from "@/lib/instagram/session";
import { MetaInstagramProvider } from "@/lib/instagram/meta-provider";
import { InstagramProviderError } from "@/lib/instagram/provider";

export async function GET(request: NextRequest) {
  const session = readSession(request.cookies);
  if (!session) {
    return NextResponse.json(
      { error: "Потрібно увійти через Instagram." },
      { status: 401 },
    );
  }

  try {
    const provider = new MetaInstagramProvider(session.accessToken, session.userId);
    const media = await provider.getRecentMedia(50);
    return NextResponse.json({ media });
  } catch (error) {
    if (error instanceof InstagramProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Не вдалося завантажити ваші публікації." },
      { status: 500 },
    );
  }
}
