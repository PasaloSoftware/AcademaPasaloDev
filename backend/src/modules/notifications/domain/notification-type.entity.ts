import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('notification_type')
export class NotificationType {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;
}
