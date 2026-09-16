import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamIdCopyButton } from './TeamIdCopyButton';

const writeTextMock = vi.fn();

afterEach(() => {
  writeTextMock.mockReset();
  vi.unstubAllGlobals();
});

describe('TeamIdCopyButton', () => {
  it('팀 ID를 표시하고 복사 버튼 클릭 시 클립보드에 기록한다', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: writeTextMock.mockResolvedValue(undefined) },
    });

    render(<TeamIdCopyButton teamId="t1" />);

    expect(screen.getByText('t1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '복사' }));

    expect(writeTextMock).toHaveBeenCalledWith('t1');
    expect(await screen.findByText('팀 ID를 복사했습니다')).toBeInTheDocument();
  });

  it('클립보드 복사가 실패하면 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: writeTextMock.mockRejectedValue(new Error('denied')) },
    });

    render(<TeamIdCopyButton teamId="t1" />);
    await user.click(screen.getByRole('button', { name: '복사' }));

    expect(await screen.findByText(/복사에 실패했습니다/)).toBeInTheDocument();
  });
});
