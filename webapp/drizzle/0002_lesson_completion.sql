-- Completion moves from the section to the lesson (adr/2026-08-04-11).
--
-- 'section' stays in the CHECK even though nothing writes it any more: completion_events is
-- append-only, so rows recorded under the old unit must stay readable exactly as they were.
--
-- quiz_attempts.section_id is dropped rather than renamed: it was written at submit time and never
-- read by the derivation, and article_key already identifies the lesson.
--
-- No data migration is needed. Video ids and lesson keys (source file paths) are unchanged by the
-- restructure, so every video_progress, quiz_attempts and manual_completions row still matches.
ALTER TABLE "course_app"."completion_events" DROP CONSTRAINT "completion_events_item_type_check";--> statement-breakpoint
ALTER TABLE "course_app"."quiz_attempts" DROP COLUMN "section_id";--> statement-breakpoint
ALTER TABLE "course_app"."completion_events" ADD CONSTRAINT "completion_events_item_type_check" CHECK ("course_app"."completion_events"."item_type" IN ('lesson', 'module', 'section'));