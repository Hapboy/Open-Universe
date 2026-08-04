import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinterestConnectionsTable1785776847606 implements MigrationInterface {
  name = 'AddPinterestConnectionsTable1785776847606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pinterest_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "access_token" character varying NOT NULL, "refresh_token" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "pinterest_username" character varying, "scope" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1dad3cf008335e0757a40a1ac00" UNIQUE ("user_id"), CONSTRAINT "REL_1dad3cf008335e0757a40a1ac0" UNIQUE ("user_id"), CONSTRAINT "PK_08fa386d0cf22a99eabcb41247f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "pinterest_connections" ADD CONSTRAINT "FK_1dad3cf008335e0757a40a1ac00" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pinterest_connections" DROP CONSTRAINT "FK_1dad3cf008335e0757a40a1ac00"`,
    );
    await queryRunner.query(`DROP TABLE "pinterest_connections"`);
  }
}
