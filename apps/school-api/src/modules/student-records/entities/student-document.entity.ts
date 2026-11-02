import { Column, Entity, Index } from 'typeorm';
import { VerifiableDocument } from '../../../shared/verification';

export const STUDENT_DOCUMENT_TYPES = [
  'birth_certificate',
  'aadhaar',
  'transfer_certificate',
  'previous_marksheet',
  'community_certificate',
  'medical_certificate',
  'photo',
  'other',
] as const;
export type StudentDocumentType = (typeof STUDENT_DOCUMENT_TYPES)[number];

@Entity('student_documents')
export class StudentDocument extends VerifiableDocument {
  @Index()
  @Column({ type: 'int' })
  student_id: number;

  declare type: StudentDocumentType;

  @Column({ type: 'boolean', default: true })
  visible_to_parent: boolean;
}
