import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentReveal } from "@/components/assessment-reveal";
import { Blocks } from "@/components/block-renderer";
import { MarkComplete } from "@/components/mark-complete";
import { Quiz } from "@/components/quiz";
import { VideoPlayer } from "@/components/video-player";
import { getAnswerKey } from "@/content/answer-key";
import { adjacentSections, getSection, videoBaseUrl, videoUrl } from "@/content/manifest";
import type { Article, Section } from "@/content/types";
import { loadActivity, loadVideoPositions } from "@/lib/activity";
import { deriveProgress, sectionRequirements } from "@/lib/progress";
import { manifest } from "@/content/manifest";
import { requireUser } from "@/lib/session";

// Reads the session and per-user activity, so it must never be static-optimized
// (docs/wiki/webapp-architecture.md "Invariants and boundaries").
export const dynamic = "force-dynamic";

// Next 16: route params arrive as a Promise and must be awaited.
type Props = { params: Promise<{ sectionId: string }> };

export default async function SectionPage({ params }: Props) {
  const { sectionId } = await params;
  const section = getSection(sectionId);
  if (!section) notFound();

  const user = await requireUser();
  const activity = await loadActivity(user.id);
  const derived = deriveProgress(manifest, activity);
  const progress = derived.sections.get(section.id);

  const videoIds = [section.video?.videoId, section.debriefVideo?.videoId].filter(
    (v): v is string => !!v
  );
  const positions = await loadVideoPositions(user.id, videoIds);

  const passed = new Set(activity.passedArticleKeys);
  const revealed = new Set(activity.manualCompletionKeys);
  const { prev, next } = adjacentSections(sectionId);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/modules/${section.module}`}
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← {section.moduleTitle}
        </Link>
        <div className="mt-3 flex items-baseline gap-3">
          <h1 className="text-3xl font-semibold text-slate-100">{section.title}</h1>
          {progress?.complete && (
            <span className="shrink-0 rounded-full border border-emerald-800 bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-400">
              complete
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Module {section.module} · Section {section.section}
        </p>
      </div>

      <SectionVideo section={section} positions={positions} />

      <div className="space-y-14">
        {section.articles.map((article) => (
          <ArticleView
            key={article.key}
            article={article}
            passed={passed.has(article.key)}
            revealed={revealed.has(article.key)}
          />
        ))}
      </div>

      {sectionRequirements(section).manualOnly && (
        <MarkComplete sectionId={section.id} initiallyComplete={progress?.complete ?? false} />
      )}

      <nav className="flex justify-between gap-4 border-t border-slate-800 pt-6 text-sm">
        {prev ? (
          <Link href={`/sections/${prev.id}`} className="text-slate-400 hover:text-slate-200">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/sections/${next.id}`}
            className="text-right text-slate-400 hover:text-slate-200"
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

function SectionVideo({
  section,
  positions,
}: {
  section: Section;
  positions: Map<string, { position: number; completed: boolean }>;
}) {
  const video = section.video ?? section.debriefVideo;
  if (!video) return null;

  if (!videoBaseUrl) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
        Video <code className="font-mono text-slate-400">{video.videoId}</code> is not playable yet —
        set <code className="font-mono text-slate-400">NEXT_PUBLIC_VIDEO_BASE_URL</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <VideoPlayer
        videoId={video.videoId}
        src={videoUrl(video)}
        initialPosition={positions.get(video.videoId)?.position ?? 0}
      />
      {!section.video && section.debriefVideo && (
        <p className="text-sm text-slate-500">
          This is the debrief — try the exercise first. Watching it is not required to complete the
          section.
        </p>
      )}
    </div>
  );
}

async function ArticleView({
  article,
  passed,
  revealed,
}: {
  article: Article;
  passed: boolean;
  revealed: boolean;
}) {
  // Safe in a server component: the answer key never crosses to the client unless the user has
  // already revealed this exercise, in which case they have earned it.
  const entry = revealed ? getAnswerKey(article.key) : undefined;

  return (
    <article>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-2xl font-semibold text-slate-100">{article.title}</h2>
        <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
          {article.type}
        </span>
        {passed && <span className="shrink-0 text-xs text-emerald-400">passed</span>}
      </div>

      <Blocks blocks={article.blocks} />

      {article.assessment?.kind === "quiz" && (
        <>
          <Quiz
            articleKey={article.key}
            questions={article.assessment.questions}
            alreadyPassed={passed}
          />
          {article.assessment.trailing.length > 0 && (
            <div className="mt-6">
              <Blocks blocks={article.assessment.trailing} />
            </div>
          )}
        </>
      )}

      {article.assessment?.kind === "freeform" && (
        <AssessmentReveal
          articleKey={article.key}
          initialBlocks={entry?.kind === "freeform" ? entry.modelAnswer : null}
        />
      )}
    </article>
  );
}
