CREATE TABLE "course_app"."access_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "course_app"."access_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_events_action_check" CHECK ("course_app"."access_events"."action" IN ('granted_admin', 'revoked_admin', 'revoked_access', 'restored_access'))
);
--> statement-breakpoint
ALTER TABLE "course_app"."users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "course_app"."users" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "course_app"."access_events" ADD CONSTRAINT "access_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "course_app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_app"."access_events" ADD CONSTRAINT "access_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "course_app"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_events_user_idx" ON "course_app"."access_events" USING btree ("user_id","created_at" DESC NULLS LAST);