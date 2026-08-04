-- Drizzle's generated `CREATE SCHEMA "course_app";` was removed by hand.
-- scripts/create-app-role.sql creates the schema and gives it to course_app_user, and migrations
-- then run AS that role. Postgres checks CREATE-on-database for CREATE SCHEMA *before* it checks
-- IF NOT EXISTS, so leaving the statement in fails for the app role even though the schema is
-- already there — and granting CREATE on the database just to get past it would hand the app role
-- far more than it needs. Run create-app-role.sql first; that is the documented prerequisite.
--> statement-breakpoint
CREATE TABLE "course_app"."accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "course_app"."completion_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_app"."completion_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "completion_events_user_item_key" UNIQUE("user_id","item_type","item_id"),
	CONSTRAINT "completion_events_item_type_check" CHECK ("course_app"."completion_events"."item_type" IN ('section', 'module'))
);
--> statement-breakpoint
CREATE TABLE "course_app"."manual_completions" (
	"user_id" text NOT NULL,
	"item_key" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_completions_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "course_app"."quiz_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_app"."quiz_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"section_id" text NOT NULL,
	"article_key" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" smallint NOT NULL,
	"total" smallint NOT NULL,
	"passed" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_app"."sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_app"."users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "course_app"."video_progress" (
	"user_id" text NOT NULL,
	"video_id" text NOT NULL,
	"position_seconds" real DEFAULT 0 NOT NULL,
	"max_position_seconds" real DEFAULT 0 NOT NULL,
	"duration_seconds" real,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_progress_user_id_video_id_pk" PRIMARY KEY("user_id","video_id")
);
--> statement-breakpoint
ALTER TABLE "course_app"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_app"."completion_events" ADD CONSTRAINT "completion_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_app"."manual_completions" ADD CONSTRAINT "manual_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_app"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_app"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_app"."video_progress" ADD CONSTRAINT "video_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_article_idx" ON "course_app"."quiz_attempts" USING btree ("user_id","article_key","created_at" DESC NULLS LAST);