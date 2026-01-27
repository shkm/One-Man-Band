import { useState, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { getFileDiffContent } from '../../lib/tauri';
import type { DiffContent, ChangedFilesViewMode } from '../../types';

interface DiffViewerProps {
  worktreePath: string;
  filePath: string;
  mode: ChangedFilesViewMode;
  projectPath?: string;
  onClose: () => void;
}

export function DiffViewer({
  worktreePath,
  filePath,
  mode,
  projectPath,
}: DiffViewerProps) {
  const [diffContent, setDiffContent] = useState<DiffContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  useEffect(() => {
    let cancelled = false;

    async function fetchDiff() {
      setLoading(true);
      setError(null);

      try {
        const content = await getFileDiffContent(worktreePath, filePath, mode, projectPath);
        if (!cancelled) {
          setDiffContent(content);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch diff content:', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDiff();

    return () => {
      cancelled = true;
    };
  }, [worktreePath, filePath, mode, projectPath]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900 text-zinc-400">
        Loading diff...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 gap-4">
        <span className="text-red-400">Failed to load diff: {error}</span>
      </div>
    );
  }

  if (!diffContent) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header with labels and view mode toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>{diffContent.originalLabel}</span>
          <span className="text-zinc-600">→</span>
          <span>{diffContent.modifiedLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-0.5 text-xs rounded ${
              viewMode === 'split'
                ? 'bg-zinc-600 text-zinc-200'
                : 'text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-2 py-0.5 text-xs rounded ${
              viewMode === 'unified'
                ? 'bg-zinc-600 text-zinc-200'
                : 'text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Unified
          </button>
        </div>
      </div>

      {/* Monaco Diff Editor */}
      <div className="flex-1">
        <DiffEditor
          original={diffContent.original}
          modified={diffContent.modified}
          language={diffContent.language}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: viewMode === 'split',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            lineNumbers: 'on',
            renderWhitespace: 'boundary',
            wordWrap: 'on',
            diffWordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
