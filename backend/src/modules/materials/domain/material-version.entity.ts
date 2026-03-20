import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileResource } from '@modules/materials/domain/file-resource.entity';
import { User } from '@modules/users/domain/user.entity';
import { Material } from '@modules/materials/domain/material.entity';

@Entity('material_version')
export class MaterialVersion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'material_id', type: 'bigint' })
  materialId: string;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ name: 'file_resource_id', type: 'bigint' })
  fileResourceId: string;

  @ManyToOne(() => FileResource)
  @JoinColumn({ name: 'file_resource_id' })
  fileResource: FileResource;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({
    name: 'restored_from_material_version_id',
    type: 'bigint',
    nullable: true,
  })
  restoredFromMaterialVersionId: string | null;

  @ManyToOne(() => MaterialVersion)
  @JoinColumn({ name: 'restored_from_material_version_id' })
  restoredFromMaterialVersion: MaterialVersion | null;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
