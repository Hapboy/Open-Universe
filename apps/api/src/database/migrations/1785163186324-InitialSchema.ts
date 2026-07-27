import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1785163186324 implements MigrationInterface {
  name = 'InitialSchema1785163186324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_side_enum" AS ENUM('urvakan', 'rambalkoshe', 'moct')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('Режиссер', 'Разработчик', 'Художник', 'Стилист')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "password_hash" character varying NOT NULL, "char_name" character varying NOT NULL, "side" "public"."users_side_enum" NOT NULL, "role" "public"."users_role_enum" NOT NULL, "timeline_duration_seconds" integer NOT NULL DEFAULT '60', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_side_enum"`);
  }
}
