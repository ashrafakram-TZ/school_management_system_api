import { ApiProperty } from '@nestjs/swagger';
import { RELATIONS, Relation } from '../../students/entities/student-guardian.entity';
import { ChildCardDto, TodayAttendanceDto } from './mobile.dto';

export class PreviewParentDto {
  @ApiProperty({ example: 42, description: 'The parent login whose app is shown' })
  user_id: number;

  @ApiProperty({ example: 'Lakshmi Raman' })
  name: string;

  @ApiProperty({ enum: RELATIONS })
  relation: Relation;
}

export class ParentPreviewDto {
  @ApiProperty({
    type: PreviewParentDto,
    nullable: true,
    description: 'Primary parent with an app login; null when no parent can sign in for this child',
  })
  parent: PreviewParentDto | null;

  @ApiProperty({
    type: ChildCardDto,
    nullable: true,
    description: 'Exactly what GET /mobile/parent/children/:id returns to that parent; null without a parent login',
  })
  child: ChildCardDto | null;

  @ApiProperty({ type: TodayAttendanceDto })
  today: TodayAttendanceDto;
}
