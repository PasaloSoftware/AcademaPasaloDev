import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType } from '@modules/notifications/domain/notification-type.entity';

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', name: 'notification_type_id' })
  notificationTypeId: string;

  @ManyToOne(() => NotificationType)
  @JoinColumn({ name: 'notification_type_id' })
  notificationType: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  message: string;

  @Column({ type: 'varchar', length: 50, name: 'entity_type', nullable: true })
  entityType: string | null;

  @Column({ type: 'bigint', name: 'entity_id', nullable: true })
  entityId: string | null;

  @Column({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
