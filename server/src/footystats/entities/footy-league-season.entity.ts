import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'footy_league_season' })
@Index(['fetchedAt'])
export class FootyLeagueSeasonEntity {
  @PrimaryColumn({ type: 'int' })
  seasonId!: number;

  @Column({ type: 'json' })
  payload!: any;

  @Column({ type: 'datetime', nullable: true })
  fetchedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
