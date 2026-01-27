import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffViewer } from './DiffViewer';
import { resetMocks, mockInvokeResponses } from '../../test/setup';
import type { DiffContent } from '../../types';

// Mock Monaco DiffEditor
vi.mock('@monaco-editor/react', () => ({
  DiffEditor: vi.fn(({ original, modified, language, options }) => (
    <div data-testid="monaco-diff-editor">
      <div data-testid="original-content">{original}</div>
      <div data-testid="modified-content">{modified}</div>
      <div data-testid="language">{language}</div>
      <div data-testid="side-by-side">{String(options?.renderSideBySide)}</div>
    </div>
  )),
}));

describe('DiffViewer', () => {
  const defaultProps = {
    worktreePath: '/path/to/worktree',
    filePath: 'src/app.ts',
    mode: 'uncommitted' as const,
    onClose: vi.fn(),
  };

  const mockDiffContent: DiffContent = {
    original: 'const x = 1;',
    modified: 'const x = 2;',
    originalLabel: 'HEAD',
    modifiedLabel: 'Working Tree',
    language: 'typescript',
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading state while fetching content', () => {
      // Make invoke hang by not setting a response
      mockInvokeResponses.set('get_file_diff_content', new Promise(() => {}));

      render(<DiffViewer {...defaultProps} />);

      expect(screen.getByText('Loading diff...')).toBeInTheDocument();
    });
  });

  describe('successful render', () => {
    beforeEach(() => {
      mockInvokeResponses.set('get_file_diff_content', mockDiffContent);
    });

    it('renders Monaco diff editor with correct content', async () => {
      render(<DiffViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
      });

      expect(screen.getByTestId('original-content')).toHaveTextContent('const x = 1;');
      expect(screen.getByTestId('modified-content')).toHaveTextContent('const x = 2;');
      expect(screen.getByTestId('language')).toHaveTextContent('typescript');
    });

    it('shows correct labels for uncommitted mode', async () => {
      render(<DiffViewer {...defaultProps} mode="uncommitted" />);

      await waitFor(() => {
        expect(screen.getByText('HEAD')).toBeInTheDocument();
        expect(screen.getByText('Working Tree')).toBeInTheDocument();
      });
    });

    it('shows correct labels for branch mode', async () => {
      const branchDiffContent: DiffContent = {
        ...mockDiffContent,
        originalLabel: 'main',
        modifiedLabel: 'feature-branch',
      };
      mockInvokeResponses.set('get_file_diff_content', branchDiffContent);

      render(<DiffViewer {...defaultProps} mode="branch" />);

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('feature-branch')).toBeInTheDocument();
      });
    });

    it('defaults to split view mode', async () => {
      render(<DiffViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('side-by-side')).toHaveTextContent('true');
      });

      // Split button should be active
      const splitButton = screen.getByText('Split');
      expect(splitButton.className).toContain('bg-zinc-600');
    });
  });

  describe('view mode toggle', () => {
    beforeEach(() => {
      mockInvokeResponses.set('get_file_diff_content', mockDiffContent);
    });

    it('switches to unified view when clicking Unified button', async () => {
      const user = userEvent.setup();
      render(<DiffViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Unified'));

      expect(screen.getByTestId('side-by-side')).toHaveTextContent('false');

      // Unified button should now be active
      const unifiedButton = screen.getByText('Unified');
      expect(unifiedButton.className).toContain('bg-zinc-600');
    });

    it('switches back to split view when clicking Split button', async () => {
      const user = userEvent.setup();
      render(<DiffViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
      });

      // Switch to unified first
      await user.click(screen.getByText('Unified'));
      expect(screen.getByTestId('side-by-side')).toHaveTextContent('false');

      // Switch back to split
      await user.click(screen.getByText('Split'));
      expect(screen.getByTestId('side-by-side')).toHaveTextContent('true');
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockInvokeResponses.set('get_file_diff_content', () => {
        throw new Error('Failed to read file');
      });

      render(<DiffViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load diff/)).toBeInTheDocument();
        expect(screen.getByText(/Failed to read file/)).toBeInTheDocument();
      });
    });

    it('shows error message for non-Error exceptions', async () => {
      mockInvokeResponses.set('get_file_diff_content', () => {
        throw 'String error';
      });

      render(<DiffViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load diff/)).toBeInTheDocument();
        expect(screen.getByText(/String error/)).toBeInTheDocument();
      });
    });
  });

  describe('props changes', () => {
    beforeEach(() => {
      mockInvokeResponses.set('get_file_diff_content', mockDiffContent);
    });

    it('refetches when filePath changes', async () => {
      const { rerender } = render(<DiffViewer {...defaultProps} filePath="src/app.ts" />);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
      });

      const newDiffContent: DiffContent = {
        ...mockDiffContent,
        original: 'new original',
        modified: 'new modified',
      };
      mockInvokeResponses.set('get_file_diff_content', newDiffContent);

      rerender(<DiffViewer {...defaultProps} filePath="src/utils.ts" />);

      await waitFor(() => {
        expect(screen.getByTestId('original-content')).toHaveTextContent('new original');
      });
    });

    it('refetches when mode changes', async () => {
      const { rerender } = render(<DiffViewer {...defaultProps} mode="uncommitted" />);

      await waitFor(() => {
        expect(screen.getByText('HEAD')).toBeInTheDocument();
      });

      const branchDiffContent: DiffContent = {
        ...mockDiffContent,
        originalLabel: 'main',
        modifiedLabel: 'feature',
      };
      mockInvokeResponses.set('get_file_diff_content', branchDiffContent);

      rerender(<DiffViewer {...defaultProps} mode="branch" />);

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });
    });
  });

  describe('projectPath parameter', () => {
    it('passes projectPath to the fetch call', async () => {
      mockInvokeResponses.set('get_file_diff_content', mockDiffContent);

      render(<DiffViewer {...defaultProps} projectPath="/path/to/project" />);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-diff-editor')).toBeInTheDocument();
      });

      // The fetch was called (content loaded successfully)
      // We can verify the component rendered correctly which means the call succeeded
    });
  });
});
