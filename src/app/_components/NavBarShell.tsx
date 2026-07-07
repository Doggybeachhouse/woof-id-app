import { NavBar } from "@/app/_components/NavBar";
import { getSession } from "@/lib/serverAuth";

export async function NavBarShell() {
  const session = await getSession();
  return <NavBar serverSession={session} />;
}
