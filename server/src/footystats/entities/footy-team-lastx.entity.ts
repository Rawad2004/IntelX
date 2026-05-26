import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'footy_team_lastx' })
@Index(['fetchedAt'])
export class FootyTeamLastXEntity {
  @PrimaryColumn({ type: 'int' })
  teamId!: number;

  // opcional: cuántos partidos pediste/guardaste (ej 15)
  @Column({ type: 'int', nullable: true })
  last!: number | null;

  @Column({ type: 'json' })
  payload!: any;

  @Column({ type: 'datetime', nullable: true })
  fetchedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
