import { execute } from '@evershop/postgres-query-builder';

// RSA-2048 public key PEM is ~450 chars; encrypted private key is larger still.
// Widen both columns from VARCHAR(255) to TEXT.
export default async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "bot_registration"
       ALTER COLUMN "api_key" TYPE text,
       ALTER COLUMN "api_secret" TYPE text`
  );
};
