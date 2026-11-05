import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { RefDto } from '../../students/dto/student-response.dto';
import { MEETING_PARTIES, MeetingParty } from '../entities/meeting.entity';
import { MeetingDto } from './meeting.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

export const NOTE_MAX = 5000;
export const MESSAGE_MAX = 2000;

export class ParentNoteInputDto {
  @ApiProperty({ example: 'Ask about the maths revision plan before the half-yearly exam.', maxLength: NOTE_MAX })
  @Transform(trim)
  @MaxLength(NOTE_MAX)
  @IsNotEmpty({ message: 'Write the note' })
  @IsString()
  body: string;
}

export class TeacherNoteInputDto extends ParentNoteInputDto {
  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'true: the parent sees this note in the app and gets a notification. false: only you see it.',
  })
  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

export class TeacherNoteUpdateDto {
  @ApiPropertyOptional({ example: 'Kavin will practise two pages of fractions every evening.', maxLength: NOTE_MAX })
  @IsOptional()
  @Transform(trim)
  @MaxLength(NOTE_MAX)
  @IsNotEmpty({ message: 'Write the note' })
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: true, description: 'Share with the parent, or make private again' })
  @IsOptional()
  @IsBoolean()
  shared?: boolean;
}

export class MeetingNoteDto {
  @ApiProperty({ example: 14 })
  id: number;

  @ApiProperty({ example: 52 })
  meeting_id: number;

  @ApiProperty({ type: RefDto })
  author: RefDto;

  @ApiProperty({ enum: MEETING_PARTIES })
  author_party: MeetingParty;

  @ApiProperty({ example: 'Kavin will practise two pages of fractions every evening.' })
  body: string;

  @ApiProperty({
    example: true,
    description: 'Teacher notes only: the parent can see it. Parent notes are always private.',
  })
  shared: boolean;

  @ApiProperty({ example: '2026-11-05T17:40:00+05:30', nullable: true, type: String })
  shared_at: Date | null;

  @ApiProperty({ example: true, description: 'Written by me, so I can edit or delete it' })
  mine: boolean;

  @ApiProperty({ example: '2026-11-05T17:32:00+05:30', type: String })
  created_at: Date;

  @ApiProperty({ example: '2026-11-05T17:40:00+05:30', type: String })
  updated_at: Date;
}

export class MeetingMessageInputDto {
  @ApiPropertyOptional({ example: 'Can you hear me? My video is frozen.', nullable: true, maxLength: MESSAGE_MAX })
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((_dto, value) => value !== null)
  @MaxLength(MESSAGE_MAX)
  @IsString()
  body?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true, type: Number, description: 'Uploaded file (POST /files)' })
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @Min(1)
  @IsInt()
  file_id?: number | null;
}

export class MeetingMessagesQueryDto {
  @ApiPropertyOptional({ example: 120, description: 'Load messages older than this id (scroll up)' })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  before_id?: number;

  @ApiPropertyOptional({ example: 50, default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @Max(100)
  @Min(1)
  @IsInt()
  limit?: number;
}

export class MeetingMessageDto {
  @ApiProperty({ example: 310 })
  id: number;

  @ApiProperty({ example: 52 })
  meeting_id: number;

  @ApiProperty({ type: RefDto })
  sender: RefDto;

  @ApiProperty({ enum: MEETING_PARTIES })
  sender_party: MeetingParty;

  @ApiProperty({ example: 'Can you hear me? My video is frozen.', nullable: true, type: String })
  body: string | null;

  @ApiProperty({ type: FileDto, nullable: true })
  file: FileDto | null;

  @ApiProperty({ example: true })
  mine: boolean;

  @ApiProperty({ example: '2026-11-05T17:31:10+05:30', type: String })
  sent_at: Date;
}

export class MeetingMessagesPageDto {
  @ApiProperty({ type: MeetingMessageDto, isArray: true, description: 'Newest first' })
  items: MeetingMessageDto[];

  @ApiProperty({ example: false, description: 'More older messages: call again with before_id = last id' })
  has_more: boolean;
}

export class RecapAttendeeDto {
  @ApiProperty({ type: RefDto })
  user: RefDto;

  @ApiProperty({ enum: MEETING_PARTIES })
  party: MeetingParty;

  @ApiProperty({ example: true })
  attended: boolean;

  @ApiProperty({ example: 18, description: 'Minutes in the call; overlapping app and Agora records are counted once' })
  minutes: number;

  @ApiProperty({ example: 2, description: 'How many times they joined (reconnects count again)' })
  sessions: number;

  @ApiProperty({ example: '2026-11-05T17:29:00+05:30', nullable: true, type: String })
  first_joined_at: Date | null;

  @ApiProperty({ example: '2026-11-05T17:47:00+05:30', nullable: true, type: String })
  last_left_at: Date | null;

  @ApiProperty({ example: ['android'], type: String, isArray: true })
  platforms: string[];
}

export class MeetingRecapDto {
  @ApiProperty({ type: MeetingDto })
  meeting: MeetingDto;

  @ApiProperty({ example: 19, nullable: true, type: Number, description: 'From the first join to the end of the call' })
  call_minutes: number | null;

  @ApiProperty({ type: RecapAttendeeDto, isArray: true, description: 'Teacher first, then the parent' })
  attendance: RecapAttendeeDto[];

  @ApiProperty({
    type: MeetingNoteDto,
    isArray: true,
    description: 'My notes and the teacher’s shared notes, oldest first',
  })
  notes: MeetingNoteDto[];

  @ApiProperty({ example: 6 })
  message_count: number;

  @ApiProperty({ type: MeetingMessageDto, isArray: true, description: 'The meeting chat, oldest first (up to 500)' })
  messages: MeetingMessageDto[];
}
