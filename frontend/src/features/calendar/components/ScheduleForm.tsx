import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { Schedule, ScheduleConflictWarning } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { createSchedule, deleteSchedule, updateSchedule } from '../api/schedule.api';
import { toDatetimeLocalInput, toIsoString } from '../utils/schedule-datetime.util';
import { ScheduleConflictBanner } from './ScheduleConflictBanner';

export interface ScheduleFormProps {
  teamId: string;
  members: TeamMember[];
  mode: 'create' | 'edit';
  schedule?: Schedule | null;
  onSaved(schedule: Schedule, hasConflicts?: boolean): void;
  onDeleted?(scheduleId: string): void;
  onCancel(): void;
}

interface FieldErrors {
  title?: string;
  startAt?: string;
  endAt?: string;
}

export function ScheduleForm({ teamId, members, mode, schedule, onSaved, onDeleted, onCancel }: ScheduleFormProps) {
  const [title, setTitle] = useState(schedule ? schedule.title : '');
  const [startAt, setStartAt] = useState(schedule ? toDatetimeLocalInput(schedule.startAt) : '');
  const [endAt, setEndAt] = useState(schedule ? toDatetimeLocalInput(schedule.endAt) : '');
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(
    schedule ? schedule.participants.map((participant) => participant.userId) : [],
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictWarnings, setConflictWarnings] = useState<ScheduleConflictWarning[]>([]);

  const toggleParticipant = (userId: string): void => {
    setParticipantUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!title.trim()) {
      errors.title = '제목을 입력해주세요';
    }
    if (!startAt) {
      errors.startAt = '시작 일시를 입력해주세요';
    }
    if (!endAt) {
      errors.endAt = '종료 일시를 입력해주세요';
    }
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      errors.endAt = '종료 일시는 시작 일시 이후여야 합니다';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    const body = {
      title,
      startAt: toIsoString(startAt),
      endAt: toIsoString(endAt),
      participantUserIds,
    };

    setIsSubmitting(true);

    try {
      const response =
        mode === 'create'
          ? await createSchedule(teamId, body)
          : await updateSchedule(teamId, schedule!.id, body);
      
      const warnings = response.conflictWarnings ?? [];
      setConflictWarnings(warnings);
      onSaved(response.schedule, warnings.length > 0);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError('팀장만 일정을 생성/수정할 수 있습니다');
      } else if (err instanceof ApiError && err.status === 400) {
        setSubmitError(err.message);
      } else {
        setSubmitError('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) {
      return;
    }
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) {
      return;
    }

    setSubmitError(null);
    setIsDeleting(true);

    try {
      await deleteSchedule(teamId, schedule.id);
      onDeleted?.(schedule.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError('팀장만 일정을 삭제할 수 있습니다');
      } else {
        setSubmitError('삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-900">{mode === 'create' ? '일정 생성' : '일정 수정'}</h2>

      <ScheduleConflictBanner warnings={conflictWarnings} members={members} />

      <div className="flex flex-col gap-1">
        <label htmlFor="schedule-title" className="text-sm text-gray-700">
          제목
        </label>
        <input
          id="schedule-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
        {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="schedule-start-at" className="text-sm text-gray-700">
          시작 일시
        </label>
        <input
          id="schedule-start-at"
          type="datetime-local"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
        {fieldErrors.startAt && <p className="text-xs text-red-500">{fieldErrors.startAt}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="schedule-end-at" className="text-sm text-gray-700">
          종료 일시
        </label>
        <input
          id="schedule-end-at"
          type="datetime-local"
          value={endAt}
          onChange={(event) => setEndAt(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
        {fieldErrors.endAt && <p className="text-xs text-red-500">{fieldErrors.endAt}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">참여자</span>
        <div className="max-h-40 overflow-y-auto">
          {members.map((member) => (
            <label key={member.userId} className="flex items-center gap-2 py-1 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={participantUserIds.includes(member.userId)}
                onChange={() => toggleParticipant(member.userId)}
              />
              {member.name}
            </label>
          ))}
        </div>
      </div>

      {submitError && <p className="text-xs text-red-500">{submitError}</p>}

      <div className="flex items-center justify-between gap-2">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            저장
          </button>
        </div>
      </div>
    </form>
  );
}
