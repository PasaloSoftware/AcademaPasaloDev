import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('careers')
export class Career {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 150, nullable: false, unique: true })
  name!: string;
}
