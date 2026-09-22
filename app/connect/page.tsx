import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readSession } from "@/lib/instagram/session";
import { ConnectPicker } from "@/components/giveaway/connect-picker";

export default async function ConnectPage() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore);

  if (!session) {
    redirect("/");
  }

  return <ConnectPicker />;
}
