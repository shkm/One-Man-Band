import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FileChange, FilesChanged, Worktree, ChangedFilesViewMode, BranchInfo } from '../types';

// Can be a worktree or a project (both have id and path)
type GitStatusTarget = { id: string; path: string } | null;

interface UseGitStatusOptions {
  mode?: ChangedFilesViewMode;
  projectPath?: string;
}

// Check if error indicates path is not a git repository
function isNotGitRepoError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    // Check for error code
    if ('code' in err && err.code === 'NOT_GIT_REPO') {
      return true;
    }
    // Check for error message containing common git2 error patterns
    if ('message' in err && typeof err.message === 'string') {
      const msg = err.message.toLowerCase();
      return msg.includes('not a git repository') || msg.includes('could not find repository');
    }
    // Check if it's a string that contains the pattern
    const errStr = String(err).toLowerCase();
    return errStr.includes('not a git repository') || errStr.includes('could not find repository');
  }
  return false;
}

export function useGitStatus(
  target: GitStatusTarget,
  options: UseGitStatusOptions = {}
) {
  const { mode = 'uncommitted', projectPath } = options;
  // For backwards compatibility, also accept Worktree type
  const worktree = target as (Worktree | { id: string; path: string } | null);
  const [files, setFiles] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGitRepo, setIsGitRepo] = useState(true);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const watchingRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!worktree) {
      setFiles([]);
      return;
    }

    try {
      setLoading(true);

      if (mode === 'uncommitted') {
        // Fetch uncommitted changes (working tree vs HEAD)
        const result = await invoke<FileChange[]>('get_changed_files', {
          worktreePath: worktree.path,
        });
        setFiles(result);
      } else {
        // Fetch branch changes (current branch vs base branch)
        const result = await invoke<FileChange[]>('get_branch_changed_files', {
          worktreePath: worktree.path,
          projectPath,
        });
        setFiles(result);
      }
      setIsGitRepo(true);
    } catch (err) {
      console.error('Failed to get changed files:', err);
      setFiles([]);
      // Only set isGitRepo to false for specific "not a git repo" errors
      if (isNotGitRepoError(err)) {
        setIsGitRepo(false);
      }
    } finally {
      setLoading(false);
    }
  }, [worktree, mode, projectPath]);

  // Fetch branch info when target changes
  useEffect(() => {
    if (!worktree) {
      setBranchInfo(null);
      return;
    }

    invoke<BranchInfo>('get_branch_info', {
      worktreePath: worktree.path,
      projectPath,
    })
      .then(setBranchInfo)
      .catch((err) => {
        console.error('Failed to get branch info:', err);
        setBranchInfo(null);
      });
  }, [worktree, projectPath]);

  // Initial load and start watcher
  useEffect(() => {
    if (!worktree) {
      setFiles([]);
      setIsGitRepo(true); // Reset when no target
      return;
    }

    // Reset isGitRepo when target changes
    setIsGitRepo(true);
    refresh();

    // Start watching if not already watching this worktree (only for uncommitted mode)
    if (mode === 'uncommitted' && watchingRef.current !== worktree.id) {
      // Stop previous watcher if any
      if (watchingRef.current) {
        invoke('stop_watching', { worktreeId: watchingRef.current }).catch(() => {});
      }
      watchingRef.current = worktree.id;
      invoke('start_watching', {
        worktreeId: worktree.id,
        worktreePath: worktree.path,
      }).catch((err) => console.error('Failed to start watching:', err));
    } else if (mode === 'branch' && watchingRef.current) {
      // Stop watching when in branch mode
      invoke('stop_watching', { worktreeId: watchingRef.current }).catch(() => {});
      watchingRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (watchingRef.current) {
        invoke('stop_watching', { worktreeId: watchingRef.current }).catch(() => {});
        watchingRef.current = null;
      }
    };
  }, [worktree, refresh, mode]);

  // Listen for file change events (only in uncommitted mode)
  useEffect(() => {
    if (!worktree || mode !== 'uncommitted') return;

    let unlisten: UnlistenFn | null = null;

    listen<FilesChanged>('files-changed', (event) => {
      // Only update if this is for our worktree
      if (event.payload.worktree_path === worktree.path) {
        setFiles(event.payload.files);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [worktree, mode]);

  return {
    files,
    loading,
    refresh,
    isGitRepo,
    branchInfo,
  };
}
