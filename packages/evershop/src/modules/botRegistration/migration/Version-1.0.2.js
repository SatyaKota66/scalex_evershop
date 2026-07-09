import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "bot_registration"
       ADD COLUMN IF NOT EXISTS "api_secret" text DEFAULT NULL`
  );
};
