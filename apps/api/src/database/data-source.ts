import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
// Scene, NarrativeSettings, Preset, MediaAsset, AiJob entities already exist
// (see their respective folders) but aren't registered here yet - tables are
// being connected one at a time, in Phase G's module build order, rather than
// all at once. Add each to this list (and to app.module.ts's
// TypeOrmModule.forRootAsync below) plus generate a follow-up migration when
// its turn comes.

// Used by the TypeORM CLI (migration:generate/run/revert - see package.json)
// as well as, indirectly, app.module.ts's TypeOrmModule.forRootAsync, which
// mirrors this same entity list.
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
