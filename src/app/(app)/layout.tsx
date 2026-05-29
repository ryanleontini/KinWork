import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppProvider } from "@/components/AppProvider";
import { BottomNav } from "@/components/BottomNav";
import type { Family, FamilyMember } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("family_members")
    .select("*")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!member) redirect("/welcome");

  const { data: family } = await supabase
    .from("families")
    .select("*")
    .eq("id", member.family_id)
    .single();

  if (!family) redirect("/welcome");

  return (
    <AppProvider
      value={{
        userId: user.id,
        family: family as Family,
        member: member as FamilyMember,
      }}
    >
      <main className="mx-auto min-h-dvh w-full max-w-lg pb-24">{children}</main>
      <BottomNav />
    </AppProvider>
  );
}
