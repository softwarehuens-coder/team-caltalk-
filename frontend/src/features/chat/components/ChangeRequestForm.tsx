import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { ChangeRequest } from '../../../shared/types/change-request.types';
import { toIsoString } from '../../calendar/utils/schedule-datetime.util';
import { submitChangeRequest } from '../api/change-request.api';

export interface ChangeRequestFormProps {
  scheduleId: string;
  scheduleTitle: string;
  onSubmitted(changeRequest: ChangeRequest): void;
  onCancel(): void;
}

interface FieldErrors {
  desiredStartAt?: string;
  desiredEndAt?: string;
}

export function ChangeRequestForm({ scheduleId, scheduleTitle, onSubmitted, onCancel }: ChangeRequestFormProps) {
  const [desiredStartAt, setDesiredStartAt] = useState('');
  const [desiredEndAt, setDesiredEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!desiredStartAt) {
      errors.desiredStartAt = '희망 시작 일시를 입력해주세요';
    }
    if (!desiredEndAt) {
      errors.desiredEndAt = '희망 종료 일시를 입력해주세요';
    }
    if (desiredStartAt && desiredEndAt && new Date(desiredEndAt) <= new Date(desiredStartAt)) {
      errors.desiredEndAt = '종료 일시는 시작 일시 이후여야 합니다';
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

    setIsSubmitting(true);

    try {
      const response = await submitChangeRequest(scheduleId, {
        desiredStartAt: toIsoString(desiredStartAt),
        desiredEndAt: toIsoString(desiredEndAt),
        reason: reason.trim() || undefined,
      });
      onSubmitted(response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError('이 일정의 참여자만 변경 요청을 제출할 수 있습니다');
      } else if (err instanceof ApiError && err.status === 400) {
        setSubmitError(err.message);
      } else {
        setSubmitError('요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-900">변경 요청 작성 — &quot;{scheduleTitle}&quot;</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="change-request-desired-start-at" className="text-sm text-gray-700">
          희망 시작 일시
        </label>
        <input
          id="change-request-desired-start-at"
          type="datetime-local"
          value={desiredStartAt}
          onChange={(event) => setDesiredStartAt(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
        {fieldErrors.desiredStartAt && <p className="text-xs text-red-500">{fieldErrors.desiredStartAt}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="change-request-desired-end-at" className="text-sm text-gray-700">
          희망 종료 일시
        </label>
        <input
          id="change-request-desired-end-at"
          type="datetime-local"
          value={desiredEndAt}
          onChange={(event) => setDesiredEndAt(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
        {fieldErrors.desiredEndAt && <p className="text-xs text-red-500">{fieldErrors.desiredEndAt}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="change-request-reason" className="text-sm text-gray-700">
          사유
        </label>
        <textarea
          id="change-request-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="사유를 입력해주세요 (선택)"
          rows={3}
          className="resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      {submitError && <p className="text-xs text-red-500">{submitError}</p>}

      <div className="flex items-center justify-end gap-2">
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
          요청 보내기
        </button>
      </div>
    </form>
  );
}
