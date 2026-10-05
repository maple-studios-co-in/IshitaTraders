import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import logo from "@/assets/images/brand/logo.png";
import { Callout } from "@/admin/components/ui/primitives";
import { LoginForm } from "@/admin/features/auth/login-form";
import { getSetupStatus } from "@/admin/features/auth/setup";
import { getCurrentUser } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;
  const setup = await getSetupStatus();

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-navy-950 px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_-10%,rgb(40_98_191/0.55),transparent),radial-gradient(40rem_30rem_at_110%_110%,rgb(116_143_15/0.35),transparent)]"
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Image src={logo} alt="Ishita Traders" className="h-12 w-auto" sizes="64px" priority />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">Admin console</h1>
            <p className="mt-1 text-sm text-white/65">Sign in to manage products, enquiries and the website.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          {setup.state === "database-error" ? (
            <Callout tone="danger" title="The database isn't reachable" className="mb-5">
              {setup.message}
            </Callout>
          ) : setup.state === "needs-owner" ? (
            <Callout tone="warning" title="Finish setup first" className="mb-5">
              No admin account exists yet. Set <code className="font-mono text-xs">ADMIN_EMAIL</code> and{" "}
              <code className="font-mono text-xs">ADMIN_PASSWORD</code> in the environment, then sign in with them —
              that creates the owner account.
            </Callout>
          ) : setup.state === "first-sign-in" ? (
            <Callout tone="info" title="First sign-in" className="mb-5">
              Sign in with the <code className="font-mono text-xs">ADMIN_EMAIL</code> /{" "}
              <code className="font-mono text-xs">ADMIN_PASSWORD</code> from your environment to create the owner
              account.
            </Callout>
          ) : null}
          <LoginForm next={typeof next === "string" ? next : "/admin"} />
        </div>

        <p className="mt-6 text-center text-xs text-white/45">
          Protected area · sessions are encrypted and every action is logged.
        </p>
      </div>
    </main>
  );
}
