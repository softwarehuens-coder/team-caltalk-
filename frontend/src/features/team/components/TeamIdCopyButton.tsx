import { useState } from 'react';

export interface TeamIdCopyButtonProps {
  teamId: string;
}

export function TeamIdCopyButton({ teamId }: TeamIdCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    setError(null);

    try {
      await navigator.clipboard.writeText(teamId);
      setCopied(true);
    } catch {
      setError('복사에 실패했습니다. 팀 ID를 직접 선택해 복사해 주세요.');
    }
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-4">
      <span className="text-sm text-gray-700">팀 ID (초대 메일과 함께 전달하세요)</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">{teamId}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          복사
        </button>
      </div>
      {copied && <p className="text-xs text-gray-400">팀 ID를 복사했습니다</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
