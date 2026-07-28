import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScenesTable1785239657793 implements MigrationInterface {
  name = 'AddScenesTable1785239657793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "scenes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid, "title" character varying NOT NULL, "graph" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_071fd0f410cbb449feebafd46ac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "scenes" ADD CONSTRAINT "FK_5bb2c58685db16f196e5a799b0b" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scenes" DROP CONSTRAINT "FK_5bb2c58685db16f196e5a799b0b"`,
    );
    await queryRunner.query(`DROP TABLE "scenes"`);
  }
}
