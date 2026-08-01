import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiJobsTable1785585645438 implements MigrationInterface {
  name = 'AddAiJobsTable1785585645438';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."ai_jobs_status_enum" AS ENUM('queued', 'in_progress', 'completed', 'failed', 'nsfw')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid, "provider" character varying NOT NULL, "kind" character varying NOT NULL, "status" "public"."ai_jobs_status_enum" NOT NULL, "result" jsonb, "error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_895e59e4adb993a3f45dacb1d6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" ADD CONSTRAINT "FK_0967d980eebb6764855761b94af" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_jobs" DROP CONSTRAINT "FK_0967d980eebb6764855761b94af"`,
    );
    await queryRunner.query(`DROP TABLE "ai_jobs"`);
    await queryRunner.query(`DROP TYPE "public"."ai_jobs_status_enum"`);
  }
}
