import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FootyMatchState = 'scheduled' | 'live' | 'finished' | 'unknown';

@Entity({ name: 'footy_daily_match' })
@Index(['dateKey'])
@Index(['competitionId'])
@Index(['kickoffUnix'])
export class FootyDailyMatchEntity {
  // ✅ PK compuesto: dateKey + matchId
  @PrimaryColumn({ type: 'varchar', length: 10 })
  dateKey!: string;

  @PrimaryColumn({ type: 'bigint' })
  matchId!: number;

  @Column({ type: 'int', nullable: true })
  competitionId!: number | null;

  @Column({ type: 'bigint', nullable: true })
  kickoffUnix!: number | null;

  @Column({ type: 'varchar', length: 16, default: 'unknown' })
  state!: FootyMatchState;

  @Column({ type: 'varchar', length: 32, nullable: true })
  statusRaw!: string | null;

  @Column({ type: 'int', nullable: true })
  homeId!: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  homeName!: string | null;

  @Column({ type: 'int', nullable: true })
  awayId!: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  awayName!: string | null;

  @Column({ type: 'json' })
  payload!: any;

  @Column({ type: 'datetime', nullable: true })
  fetchedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
