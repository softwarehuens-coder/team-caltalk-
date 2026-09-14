import { useState } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import { useJoinRequests } from '../hooks/use-join-requests';

export interface PendingJoinRequestsPanelProps {
  teamId: string;
  onApproved(): void;
}

export function PendingJoinRequestsPanel({ teamId, onApproved }: PendingJoinRequestsPanelProps) {
  const { requests, isLoading, error, refresh, approve } = useJoinRequests(teamId, true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingRequests = requests.filter((request) => request.status === 'PENDING');

  const handleApprove = async (requestId: string) => {
    setActionError(null);
    setProcessingId(requestId);

    try {
      await approve(requestId);
      onApproved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError('이미 처리된 요청입니다');
        await refresh();
      } else {
        setActionError('승인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">가입 요청 대기 목록</h2>

      {isLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}
      {error && <p className="text-xs text-red-500">가입 요청 목록을 불러오지 못했습니다.</p>}
      {actionError && <p className="text-xs text-red-500">{actionError}</p>}

      {!isLoading && pendingRequests.length === 0 && (
        <p className="text-sm text-gray-700">대기 중인 가입 요청이 없습니다.</p>
      )}

      {pendingRequests.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {pendingRequests.map((request) => (
            <li key={request.id} className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">{request.requesterUserId}</span>
              <button
                type="button"
                disabled={processingId === request.id}
                onClick={() => handleApprove(request.id)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                승인
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
