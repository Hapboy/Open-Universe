import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitUsernameAndDropSideAndCharName1785768322800 implements MigrationInterface {
  name = 'SplitUsernameAndDropSideAndCharName1785768322800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "char_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "side"`);
    await queryRunner.query(`DROP TYPE "public"."users_side_enum"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "username" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_name" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_side_enum" AS ENUM('urvakan', 'rambalkoshe', 'moct')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "side" "public"."users_side_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "char_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "name" character varying NOT NULL`,
    );
  }
}
