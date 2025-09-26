ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT auth.uid();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "username" SET DATA TYPE varchar(24);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_length_min" CHECK (char_length("profiles"."username") >= 3);