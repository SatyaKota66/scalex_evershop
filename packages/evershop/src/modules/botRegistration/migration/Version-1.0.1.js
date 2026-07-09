import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "bot_registration" ADD COLUMN IF NOT EXISTS "admin_note" text DEFAULT NULL`
  );
};
