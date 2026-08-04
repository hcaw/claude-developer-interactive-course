// One lesson: one authored article, one page (adr/2026-08-04-11).
//
// The title is rendered exactly once, from frontmatter, beside the lesson-type badge — the
// generator strips the duplicate `# Title` heading that every source file opens with.

import Link from "next/link";
import { notFound } from "next/navigation";

import { Blocks } from "@/components/block-renderer";
import { Quiz } from "@/components/quiz";
import { RecordView } from "@/components/record-view";
import { SelfAssess } from "@/components/self-assess";
import { VideoPlayer } from "@/components/video-player";
import { Callout } from "@/components/ui/callout";
import { StatusPill } from "@/components/ui/status-pill";
import { getAnswerKey } from "@/content/answer-key";
import { adjacentLessons, getLesson, videoBaseUrl, videoUrl } from "@/content/manifest";
import type { Lesson } from "@/content/types";
import { deriveForUser, loadVideoPositions } from "@/lib/activity";
import { moduleCompleteExcluding, type DerivedProgress } from "@/lib/progress";
import { requireUser } from "@/lib/session";

// Reads the session and per-user activity, so it must never be static-optimized
// (docs/wiki/webapp-architecture.md "Invariants and boundaries").
export const dynamic = "force-dynamic";

// Next 16: route params arrive as a Promise and must be awaited.
type Props = { params: Promise<{ slug: string }> };

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const user = await requireUser();
  const derived = await deriveForUser(user.id);
  const progress = derived.lessons.get(lesson.key);

  const positions = lesson.video
    ? await loadVideoPositions(user.id, [lesson.video.videoId])
    : new Map();
  const { prev, next } = adjacentLessons(slug);

  // "Congrats, you completed this module" is only true when it is. The check excludes this lesson
  // or it could never pass: reading it is what completes it, which would complete the module.
  const isModuleComplete = lesson.type === "Module Complete";
  const locked = isModuleComplete && !moduleCompleteExcluding(derived, lesson.module, lesson.key);

  // Safe in a server component: the answer key never crosses to the client unless the user has
  // already revealed this exercise, in which case they have earned it.
  const revealed = progress?.met.freeform ? getAnswerKey(lesson.key) : undefined;
  const modelAnswer = revealed?.kind === "freeform" ? revealed.modelAnswer : null;

  // A walkthrough video above the exercise it walks through is an invitation to spoil it.
  // Non-required (debrief) videos on assessment lessons render below the task instead.
  const videoBelowTask = !!lesson.video && !lesson.video.required && !!lesson.assessment;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/modules/${lesson.module}`}
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {lesson.moduleTitle}
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold text-foreground">{lesson.title}</h1>
          <StatusPill tone="muted">{lesson.type}</StatusPill>
          {progress?.complete && <StatusPill tone="active">complete</StatusPill>}
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Module {lesson.module} · {lesson.group}
          {lesson.durationMin ? ` · ${lesson.durationMin} min` : ""}
        </p>
      </div>

      {!locked && !videoBelowTask && <LessonVideo lesson={lesson} positions={positions} />}

      {locked ? (
        <ModuleLocked lesson={lesson} derived={derived} />
      ) : (
        <>
          <Blocks blocks={lesson.blocks} />

          {lesson.assessment?.kind === "quiz" && (
            <Quiz
              lessonKey={lesson.key}
              questions={lesson.assessment.questions}
              trailing={lesson.assessment.trailing}
              alreadyPassed={progress?.met.quiz ?? false}
            />
          )}

          {lesson.assessment?.kind === "freeform" && (
            <SelfAssess lessonKey={lesson.key} initialBlocks={modelAnswer} />
          )}

          {videoBelowTask && <LessonVideo lesson={lesson} positions={positions} />}

          {progress?.requirements.viewOnly && (
            <RecordView lessonKey={lesson.key} initiallyComplete={progress.complete} />
          )}
        </>
      )}

      <nav className="flex justify-between gap-4 border-t border-border pt-6 text-sm">
        {prev ? (
          <Link
            href={`/lessons/${prev.slug}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/lessons/${next.slug}`}
            className="text-right text-muted-foreground transition-colors hover:text-foreground"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

/**
 * The player, or a pointer to the lesson that owns it.
 *
 * One video routinely narrates a teaching lesson and the watch-out story that follows it. Only the
 * first of those renders the player; embedding the same four minutes on both pages would just
 * invite watching it twice.
 */
function LessonVideo({
  lesson,
  positions,
}: {
  lesson: Lesson;
  positions: Map<string, { position: number; completed: boolean }>;
}) {
  const video = lesson.video;
  if (!video) return null;

  if (video.playerOn) {
    const owner = getLesson(video.playerOn);
    if (!owner) return null;
    return (
      <Link
        href={`/lessons/${owner.slug}`}
        className="flex items-center gap-3 border border-border px-4 py-3 transition-colors hover:border-line-strong"
      >
        <span className="mono-label shrink-0">Video</span>
        <span className="min-w-0 truncate text-ink-2">Covered in {owner.title}</span>
        <span className="ml-auto shrink-0 text-muted-foreground">→</span>
      </Link>
    );
  }

  if (!videoBaseUrl) {
    return (
      <Callout variant="empty">
        Video <code className="font-mono text-ink-2">{video.videoId}</code> is not playable yet — set{" "}
        <code className="font-mono text-ink-2">NEXT_PUBLIC_VIDEO_BASE_URL</code>.
      </Callout>
    );
  }

  return (
    <div className="space-y-2">
      <VideoPlayer
        videoId={video.videoId}
        src={videoUrl(video)}
        initialPosition={positions.get(video.videoId)?.position ?? 0}
      />
      {!video.required && (
        <p className="text-sm text-muted-foreground">
          This is the walkthrough — try the exercise first. Watching it is not required to complete
          the lesson.
        </p>
      )}
    </div>
  );
}

/** What a "module complete" lesson shows before the module is actually complete. */
function ModuleLocked({ lesson, derived }: { lesson: Lesson; derived: DerivedProgress }) {
  const mod = derived.modules.get(lesson.module);
  const remaining = (mod?.lessonKeys ?? [])
    .filter((k) => k !== lesson.key && !derived.lessons.get(k)?.complete)
    .map((k) => derived.lessons.get(k))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <Callout variant="empty" className="p-6">
      <p className="text-ink-2">
        Not yet — {remaining.length} lesson{remaining.length === 1 ? "" : "s"} left in this module.
        Finish {remaining.length === 1 ? "it" : "them"} and this page will confirm what you can now
        do.
      </p>
      <ul className="mt-4 space-y-1">
        {remaining.map((p) => {
          const l = getLesson(p.slug);
          return (
            <li key={p.lessonKey}>
              <Link
                href={`/lessons/${p.slug}`}
                className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                {l?.title ?? p.slug} →
              </Link>
            </li>
          );
        })}
      </ul>
    </Callout>
  );
}
