import { useState } from 'react';
import type { ChangeRequest } from '../../../shared/types/change-request.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { approveChangeRequest, rejectChangeRequest } from '../api/change-request.api';
import { ApiError } from '../../../shared/api/api-error';

export interface ChangeRequestApprovalProps {
  changeRequest: ChangeRequest;
  members: TeamMember[];
  isLeader: boolean;
  onStatusUpdated: (updatedRequest: ChangeRequest) => void;
  onScheduleApproved?: () => void;
  onRefreshHistory?: () => void;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR');
}

export function ChangeRequestApproval({
  changeRequest,
  members,
  isLeader,
  onStatusUpdated,
  onScheduleApproved,
  onRefreshHistory,
}: ChangeRequestApprovalProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const requesterName = members.find((m) => m.userId === changeRequest.requestedByUserId)?.name ?? '알 수 없음';

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await approveChangeRequest(changeRequest.id);
      onStatusUpdated(updated);
      onScheduleApproved?.();
      onRefreshHistory?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrorMsg('이미 결정된 요청입니다.');
        } else if (err.status === 403) {
          setErrorMsg('팀장만 승인할 수 있습니다.');
        } else {
          setErrorMsg(err.message || '승인에 실패했습니다.');
        }
      } else {
        setErrorMsg('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setValidationError('거절 사유를 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setValidationError(null);
    try {
      const updated = await rejectChangeRequest(changeRequest.id, { reason: trimmedReason });
      onStatusUpdated(updated);
      setIsRejecting(false);
      onRefreshHistory?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrorMsg('이미 결정된 요청입니다.');
        } else if (err.status === 403) {
          setErrorMsg('팀장만 거절할 수 있습니다.');
        } else {
          setErrorMsg(err.message || '거절에 실패했습니다.');
        }
      } else {
        setErrorMsg('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine styles and status text based on status
  let cardStyles = 'border-amber-200 bg-amber-50 text-gray-700';
  let badgeStyles = 'font-medium text-amber-700';
  let statusText = '[변경 요청 - 대기중]';

  if (changeRequest.status === 'APPROVED') {
    cardStyles = 'border-green-200 bg-green-50 text-gray-700';
    badgeStyles = 'font-medium text-green-700';
    statusText = '[변경 요청 - 승인됨]';
  } else if (changeRequest.status === 'REJECTED') {
    cardStyles = 'border-red-200 bg-red-50 text-gray-700';
    badgeStyles = 'font-medium text-red-700';
    statusText = '[변경 요청 - 거절됨]';
  }

  return (
    <div className={`rounded-md border p-2 text-xs ${cardStyles}`}>
      <p className={badgeStyles}>{statusText}</p>
      <p className="mt-1 text-gray-900 font-medium">{requesterName}</p>
      <dl className="mt-1 flex flex-col gap-0.5 text-gray-600">
        <div className="flex gap-2">
          <dt className="shrink-0 text-gray-500">희망 시작</dt>
          <dd>{formatDateTime(changeRequest.desiredStartAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-gray-500">희망 종료</dt>
          <dd>{formatDateTime(changeRequest.desiredEndAt)}</dd>
        </div>
      </dl>
      {changeRequest.reason && (
        <p className="mt-1 whitespace-pre-wrap text-gray-700 bg-white/50 p-1.5 rounded border border-gray-100">
          {changeRequest.reason}
        </p>
      )}

      {/* Leader actions visible only when isLeader is true and status is PENDING */}
      {isLeader && changeRequest.status === 'PENDING' && (
        <div className="mt-2 border-t border-gray-200/50 pt-2">
          {!isRejecting ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="rounded bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRejecting(true);
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          ) : (
            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-1.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">거절 사유 (필수)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (e.target.value.trim()) setValidationError(null);
                  }}
                  placeholder="거절 사유를 입력하세요."
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                />
                {validationError && (
                  <p className="text-[10px] text-red-500 mt-0.5">{validationError}</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsRejecting(false);
                    setRejectReason('');
                    setValidationError(null);
                  }}
                  disabled={isSubmitting}
                  className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  거절 확정
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="mt-1 text-[10px] font-medium text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
