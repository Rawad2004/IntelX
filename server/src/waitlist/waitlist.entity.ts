import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type WaitlistStatus = "PENDING" | "CONFIRMED";

@Entity({ name: "waitlist" })
export class WaitlistEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "enum", enum: ["PENDING", "CONFIRMED"], default: "PENDING" })
  status!: WaitlistStatus;

  @Index()
  @Column({ type: "varchar", length: 128, nullable: true })
  confirmToken!: string | null;

  @Column({ type: "datetime", nullable: true })
  tokenExpiresAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
