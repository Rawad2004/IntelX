import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'footy_match_details' })
@Index(['matchId'], { unique: true })
@Index(['hasLineups'])
export class FootyMatchDetailsEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true })
  matchId!: number;

  @Column({ type: 'boolean', default: false })
  hasLineups!: boolean;

  @Column({ type: 'bigint', nullable: true })
  lineupsUpdatedAtUnix!: number | null;

  // Raw o semi-normalizado del endpoint /match
  @Column({ type: 'json' })
  payload!: any;

  // último fetch a FootyStats
  @Column({ type: 'datetime', nullable: true })
  fetchedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
