import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "bot_registration" (
  "bot_registration_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "bot_name" varchar(255) NOT NULL,
  "organization_name" varchar(255) NOT NULL,
  "contact_email" varchar(255) NOT NULL,
  "purpose_of_access" text NOT NULL,
  "callback_url" varchar(500) DEFAULT NULL,
  "allowed_domain" varchar(500) DEFAULT NULL,
  "expected_usage_pattern" text DEFAULT NULL,
  "requested_permissions" jsonb NOT NULL DEFAULT '[]',
  "intended_actions" jsonb NOT NULL DEFAULT '[]',
  "api_key" varchar(255) DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BOT_REGISTRATION_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "BOT_REGISTRATION_EMAIL_BOT_NAME_UNIQUE" UNIQUE ("contact_email", "bot_name")
)`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_BOT_REGISTRATION_STATUS" ON "bot_registration" ("status")`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_BOT_REGISTRATION_EMAIL" ON "bot_registration" ("contact_email")`
  );

  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION update_bot_registration_updated_at()
      RETURNS TRIGGER LANGUAGE PLPGSQL AS
      $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$`
  );

  await execute(
    connection,
    `CREATE TRIGGER "UPDATE_BOT_REGISTRATION_UPDATED_AT"
      BEFORE UPDATE ON bot_registration
      FOR EACH ROW
      EXECUTE PROCEDURE update_bot_registration_updated_at()`
  );
};
