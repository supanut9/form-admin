/**
 * /admin — entry-point redirect.
 *
 * Redirects to /forms so the acceptance test `curl /admin -L` resolves to a
 * 200. The proxy.ts gates this route (redirects to /auth/login if no session),
 * so curl follows: /admin → /auth/login → 200.
 */
import { redirect } from "next/navigation";

export default function AdminRootPage() {
  redirect("/forms");
}
