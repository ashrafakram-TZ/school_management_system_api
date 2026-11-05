import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { AppException, AuthUser } from '@app/common';
import { FilesService } from '../files/files.service';
import { TEMPLATES } from '../notifications/notification-templates.catalog';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  MeetingMessageDto,
  MeetingMessageInputDto,
  MeetingMessagesPageDto,
  MeetingMessagesQueryDto,
  MeetingNoteDto,
  MeetingRecapDto,
  ParentNoteInputDto,
  RecapAttendeeDto,
  TeacherNoteInputDto,
  TeacherNoteUpdateDto,
} from './dto/meeting-records.dto';
import { MeetingMessage } from './entities/meeting-message.entity';
import { MeetingNote } from './entities/meeting-note.entity';
import { Meeting, MeetingParty } from './entities/meeting.entity';
import {
  attendanceOf,
  Blocked,
  chatBlockReason,
  noteBlockReason,
  recapBlockReason,
  visibleToParty,
} from './meeting-records.logic';
import { MeetingsService } from './meetings.service';

const MESSAGE_PAGE = 50;
const RECAP_MESSAGES = 500;

@Injectable()
export class MeetingRecordsService {
  private readonly logger = new Logger('MeetingRecords');

  constructor(
    @InjectRepository(MeetingNote) private readonly notes: Repository<MeetingNote>,
    @InjectRepository(MeetingMessage) private readonly messages: Repository<MeetingMessage>,
    private readonly meetings: MeetingsService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly dataSource: DataSource,
  ) {}

  async listNotes(actor: AuthUser, party: MeetingParty, meetingId: number): Promise<MeetingNoteDto[]> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    return this.visibleNotes(meeting, actor.id);
  }

  async addNote(
    actor: AuthUser,
    party: MeetingParty,
    meetingId: number,
    dto: ParentNoteInputDto | TeacherNoteInputDto,
  ): Promise<MeetingNoteDto> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    this.assert(noteBlockReason(meeting));
    const shared = party === 'teacher' && 'shared' in dto && Boolean(dto.shared);
    const note = await this.notes.save(
      this.notes.create({
        school_id: meeting.school_id,
        meeting_id: meeting.id,
        author_user_id: actor.id,
        author_party: party,
        body: dto.body,
        shared,
        shared_at: shared ? new Date() : null,
      }),
    );
    if (shared) await this.tellParent(meeting, actor, note);
    return (await this.presentNotes([note], actor.id))[0];
  }

  async updateNote(
    actor: AuthUser,
    party: MeetingParty,
    meetingId: number,
    noteId: number,
    dto: TeacherNoteUpdateDto,
  ): Promise<MeetingNoteDto> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    this.assert(noteBlockReason(meeting));
    const note = await this.ownNote(actor, meeting, noteId);
    if (dto.body === undefined && dto.shared === undefined) {
      throw AppException.validation([{ field: 'body', message: 'Change the note or whether it is shared' }]);
    }
    const sharingNow = party === 'teacher' && dto.shared === true && !note.shared;
    if (dto.body !== undefined) note.body = dto.body;
    if (party === 'teacher' && dto.shared !== undefined) {
      note.shared = dto.shared;
      note.shared_at = dto.shared ? (note.shared_at ?? new Date()) : null;
    }
    const saved = await this.notes.save(note);
    if (sharingNow) await this.tellParent(meeting, actor, saved);
    return (await this.presentNotes([saved], actor.id))[0];
  }

  async removeNote(actor: AuthUser, party: MeetingParty, meetingId: number, noteId: number): Promise<void> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    await this.notes.softRemove(await this.ownNote(actor, meeting, noteId));
  }

  async history(
    actor: AuthUser,
    party: MeetingParty,
    meetingId: number,
    query: MeetingMessagesQueryDto,
  ): Promise<MeetingMessagesPageDto> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    const limit = query.limit ?? MESSAGE_PAGE;
    const rows = await this.messages.find({
      where: { meeting_id: meeting.id, ...(query.before_id ? { id: LessThan(query.before_id) } : {}) },
      order: { id: 'DESC' },
      take: limit + 1,
    });
    return { items: await this.presentMessages(rows.slice(0, limit), actor.id), has_more: rows.length > limit };
  }

  async send(
    actor: AuthUser,
    party: MeetingParty,
    meetingId: number,
    dto: MeetingMessageInputDto,
  ): Promise<MeetingMessageDto> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    this.assert(chatBlockReason(meeting, new Date()));
    if (!dto.body && !dto.file_id) {
      throw AppException.validation([{ field: 'body', message: 'Write a message or attach a file' }]);
    }
    if (dto.file_id) await this.files.assertAttachable(dto.file_id, meeting.school_id, 'file_id');
    const saved = await this.messages.save(
      this.messages.create({
        school_id: meeting.school_id,
        meeting_id: meeting.id,
        sender_user_id: actor.id,
        sender_party: party,
        body: dto.body ?? null,
        file_id: dto.file_id ?? null,
      }),
    );
    const [presented] = await this.presentMessages([saved], null);
    this.realtime.toUsers([meeting.teacher_user_id, meeting.parent_user_id], 'meeting.message', presented);
    return { ...presented, mine: true };
  }

  async recap(actor: AuthUser, party: MeetingParty, meetingId: number): Promise<MeetingRecapDto> {
    const meeting = await this.meetings.findForParty(actor, party, meetingId);
    this.assert(recapBlockReason(meeting));
    const [detail, notes, rows, count] = await Promise.all([
      this.meetings.getForParty(actor, party, meetingId),
      this.visibleNotes(meeting, actor.id),
      this.messages.find({ where: { meeting_id: meeting.id }, order: { id: 'ASC' }, take: RECAP_MESSAGES }),
      this.messages.count({ where: { meeting_id: meeting.id } }),
    ]);
    const { call_log, ...presented } = detail;
    const spans = call_log.map((row) => ({ user_id: row.user.id, joined_at: row.joined_at, left_at: row.left_at }));
    const totals = attendanceOf(spans, meeting.ended_at);
    const people: { user: { id: number; name: string }; party: MeetingParty }[] = [
      { user: { id: presented.teacher.id, name: presented.teacher.name }, party: 'teacher' },
      { user: { id: presented.parent.id, name: presented.parent.name }, party: 'parent' },
    ];
    const attendance: RecapAttendeeDto[] = people.map(({ user, party: who }) => {
      const total = totals.get(user.id);
      return {
        user,
        party: who,
        attended: Boolean(total),
        minutes: total?.minutes ?? 0,
        sessions: total?.sessions ?? 0,
        first_joined_at: total?.first_joined_at ?? null,
        last_left_at: total?.last_left_at ?? null,
        platforms: [...new Set(call_log.filter((row) => row.user.id === user.id).map((row) => row.platform))],
      };
    });
    return {
      meeting: presented,
      call_minutes: presented.call_minutes,
      attendance,
      notes,
      message_count: count,
      messages: await this.presentMessages(rows, actor.id),
    };
  }

  private assert(blocked: Blocked | null): void {
    if (blocked) throw AppException.conflict(blocked.message, blocked.code);
  }

  private async ownNote(actor: AuthUser, meeting: Meeting, noteId: number): Promise<MeetingNote> {
    const note = await this.notes.findOneBy({ id: noteId, meeting_id: meeting.id, author_user_id: actor.id });
    if (!note) throw AppException.notFound('Note not found', 'NOTE_NOT_FOUND');
    return note;
  }

  private async visibleNotes(meeting: Meeting, viewerId: number): Promise<MeetingNoteDto[]> {
    const rows = await this.notes.find({ where: { meeting_id: meeting.id }, order: { created_at: 'ASC', id: 'ASC' } });
    return this.presentNotes(visibleToParty(rows, viewerId), viewerId);
  }

  private async tellParent(meeting: Meeting, teacher: AuthUser, note: MeetingNote): Promise<void> {
    this.realtime.toUsers([meeting.parent_user_id], 'meeting.note', { meeting_id: meeting.id, note_id: note.id });
    const [student] = await this.dataSource.query(
      `SELECT first_name || ' ' || COALESCE(last_name, '') AS name FROM students WHERE id = $1`,
      [meeting.student_id],
    );
    await this.notifications
      .dispatch({
        template: TEMPLATES.MEETING_NOTES_SHARED,
        audience: { user_ids: [meeting.parent_user_id] },
        data: {
          student: String(student?.name ?? '').trim(),
          host: teacher.name,
          title: meeting.title,
          meeting_id: String(meeting.id),
        },
      })
      .catch((error: Error) => this.logger.warn(`Notes notice for meeting ${meeting.id} not sent: ${error.message}`));
  }

  private async names(ids: number[]): Promise<Map<number, string>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const rows: { id: number; name: string }[] = await this.dataSource.query(
      `SELECT id, name FROM users WHERE id = ANY($1)`,
      [unique],
    );
    return new Map(rows.map((row) => [Number(row.id), row.name]));
  }

  private async presentNotes(rows: MeetingNote[], viewerId: number): Promise<MeetingNoteDto[]> {
    const people = await this.names(rows.map((row) => row.author_user_id));
    return rows.map((row) => ({
      id: row.id,
      meeting_id: row.meeting_id,
      author: { id: row.author_user_id, name: people.get(row.author_user_id) ?? '' },
      author_party: row.author_party,
      body: row.body,
      shared: row.shared,
      shared_at: row.shared_at,
      mine: row.author_user_id === viewerId,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  private async presentMessages(rows: MeetingMessage[], viewerId: number | null): Promise<MeetingMessageDto[]> {
    if (!rows.length) return [];
    const [people, files] = await Promise.all([
      this.names(rows.map((row) => row.sender_user_id)),
      this.files.presentMany(rows.map((row) => row.file_id)),
    ]);
    return rows.map((row) => ({
      id: row.id,
      meeting_id: row.meeting_id,
      sender: { id: row.sender_user_id, name: people.get(row.sender_user_id) ?? '' },
      sender_party: row.sender_party,
      body: row.body,
      file: row.file_id ? (files.get(row.file_id) ?? null) : null,
      mine: row.sender_user_id === viewerId,
      sent_at: row.created_at,
    }));
  }
}
