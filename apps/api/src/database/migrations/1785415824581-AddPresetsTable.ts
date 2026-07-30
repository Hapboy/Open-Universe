import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPresetsTable1785415824581 implements MigrationInterface {
  name = 'AddPresetsTable1785415824581';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "presets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying NOT NULL, "owner_id" uuid, "name" character varying NOT NULL, "snapshot" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_87dcddfb798d56670dc16403854" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "presets" ADD CONSTRAINT "FK_eb6fc81178b16b7de84cb20b404" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "presets" DROP CONSTRAINT "FK_eb6fc81178b16b7de84cb20b404"`,
    );
    await queryRunner.query(`DROP TABLE "presets"`);
  }
}
