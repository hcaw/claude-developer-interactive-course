import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-100">Claude Developer Course</h1>
      <p className="mt-3 text-slate-400">Sign in with your Stackdrop Google account.</p>

      {error && (
        <p className="mt-6 rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {/* Deliberately vague: don't confirm whether an address exists or is merely unlisted. */}
          That account can&apos;t access this course. Ask an admin if you think this is wrong.
        </p>
      )}

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-100 px-4 py-2.5 font-medium text-slate-900 hover:bg-white"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
