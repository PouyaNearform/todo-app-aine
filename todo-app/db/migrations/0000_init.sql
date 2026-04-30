CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar NOT NULL,
	"completion_status" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" uuid
);
--> statement-breakpoint
CREATE INDEX "idx_todos_owner_id_created_at" ON "todos" USING btree ("owner_id","created_at" DESC NULLS LAST);