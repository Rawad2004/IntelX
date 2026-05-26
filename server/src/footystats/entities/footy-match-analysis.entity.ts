import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FootyAnalysisStatus = 'PENDING' | 'READY' | 'ANALYZED' | 'FAILED';

@Entity({ name: 'footy_match_analysis' })
@Index(['matchId'], { unique: true })
@Index(['status'])
export class FootyMatchAnalysisEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', unique: true })
  matchId!: number;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: FootyAnalysisStatus;

  // si cambias prompt/estructura, subes versión
  @Column({ type: 'int', default: 1 })
  analysisVersion!: number;

  // hash del input (para saber si cambió alineación/odds/etc)
  @Column({ type: 'varchar', length: 64, nullable: true })
  inputHash!: string | null;

  @Column({ type: 'json', nullable: true })
  analysisJson!: any | null;

  @Column({ type: 'datetime', nullable: true })
  analyzedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
