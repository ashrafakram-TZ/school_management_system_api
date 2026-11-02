import { ApiProperty } from '@nestjs/swagger';
import { RecordCountsDto } from '../../student-records/dto/records.dto';
import { ParentChildDto } from '../../students/dto/student-response.dto';

export class ChildCardDto extends ParentChildDto {
  @ApiProperty({ nullable: true, type: String, description: 'Signed link, valid for an hour' })
  photo_url: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'B+' })
  blood_group: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'Blue' })
  house: string | null;

  @ApiProperty({ example: '2024-06-03' })
  admission_date: string;

  @ApiProperty({ nullable: true, type: String, example: '2026-27' })
  academic_year: string | null;

  @ApiProperty({ type: RecordCountsDto, description: 'Badges for the documents, health and behaviour tiles' })
  counts: RecordCountsDto;
}
