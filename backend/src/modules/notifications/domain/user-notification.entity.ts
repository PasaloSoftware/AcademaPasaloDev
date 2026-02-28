import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Notification } from '@modules/notifications/domain/notification.entity';

@Entity('user_notification')
export class UserNotification {
  @PrimaryColumn({ type: 'bigint', name: 'user_id' })
  userId: string;

  @PrimaryColumn({ type: 'bigint', name: 'notification_id' })
  notificationId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Notification)
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead: boolean;

  @Column({ type: 'datetime', name: 'read_at', nullable: true })
  readAt: Date | null;
}
