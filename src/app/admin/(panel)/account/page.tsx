import { and, desc, eq, gt } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardHeader, DetailList, PageHeader } from "@/admin/components/ui/primitives";
import { roleDescriptions } from "@/admin/content/types";
import {
  EmailForm,
  PasswordForm,
  ProfileForm,
  SessionsList,
  type SessionView,
} from "@/admin/features/account/account-forms";
import { describeUserAgent } from "@/admin/features/account/user-agent";
import { RoleBadge } from "@/admin/features/users/user-badges";
import { formatDateTime } from "@/admin/lib/format";
import { getCurrentSession, requireUser } from "@/admin/server/auth/guard";
import { PASSWORD_MIN_LENGTH } from "@/admin/server/auth/password";
import { getDb } from "@/admin/server/db/client";
import { sessions, users } from "@/admin/server/db/schema";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser();
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");

  const db = await getDb();
  const [[me], rows] = await Promise.all([
    db
      .select({
        email: users.email,
        name: users.name,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
        passwordChangedAt: users.passwordChangedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id)),
    db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        lastSeenAt: sessions.lastSeenAt,
        ip: sessions.ip,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.lastSeenAt)),
  ]);
  if (!me) redirect("/admin/login");

  const sessionViews: SessionView[] = rows
    .map((row) => ({
      id: row.id,
      device: describeUserAgent(row.userAgent),
      ip: row.ip ?? "",
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      current: row.id === session.id,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));

  return (
    <>
      <PageHeader
        title="Your account"
        description="Your name, sign-in email and password, and the browsers you’re signed in on."
        breadcrumbs={[{ label: "Your account" }]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Profile" />
            <div className="flex flex-col gap-5 p-5">
              <DetailList
                items={[
                  {
                    label: "Role",
                    value: (
                      <span className="flex flex-col items-start gap-1">
                        <RoleBadge role={me.role} />
                        <span className="text-xs text-slate-500">{roleDescriptions[me.role]}</span>
                      </span>
                    ),
                  },
                  { label: "Member since", value: formatDateTime(me.createdAt) },
                  { label: "Last sign-in", value: me.lastLoginAt ? formatDateTime(me.lastLoginAt) : "—" },
                  {
                    label: "Password changed",
                    value: me.passwordChangedAt ? formatDateTime(me.passwordChangedAt) : "—",
                  },
                ]}
              />
              <div className="border-t border-slate-100 pt-5">
                <ProfileForm key={me.name} name={me.name} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sign-in email" />
            <div className="p-5">
              <EmailForm email={me.email} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Password" description="Use a long password you don’t use anywhere else." />
            <div className="p-5">
              <PasswordForm minLength={PASSWORD_MIN_LENGTH} />
            </div>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-24">
          <CardHeader
            title="Where you’re signed in"
            description={`${sessionViews.length} active ${sessionViews.length === 1 ? "session" : "sessions"}. Sign out any you don’t recognise, then change your password.`}
          />
          <SessionsList sessions={sessionViews} />
        </Card>
      </div>
    </>
  );
}
