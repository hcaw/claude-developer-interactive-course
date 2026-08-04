import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Claude Developer Course</h1>
      <p className="mt-3 text-muted-foreground">Sign in with your Stackdrop Google account.</p>

      {error && (
        <Callout variant="error" className="mt-6 text-left">
          {/* Deliberately vague: don't confirm whether an address exists or is merely unlisted. */}
          That account can&apos;t access this course. Ask an admin if you think this is wrong.
        </Callout>
      )}

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <Button type="submit" size="lg" className="w-full">
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
