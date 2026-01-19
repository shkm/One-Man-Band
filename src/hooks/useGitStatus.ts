import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FileChange, FilesChanged } from '../types';

export function useGitStatus(workspacePath: string | null) {
  const [files, setFiles] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspacePath) {
      setFiles([]);
      return;
    }

    try {
      setLoading(true);
      const result = await invoke<FileChange[]>('get_changed_files', {
        workspacePath,
      });
      setFiles(result);
    } catch (err) {
      console.error('Failed to get changed files:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [workspacePath]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for file change events
  useEffect(() => {
    if (!workspacePath) return;

    let unlisten: UnlistenFn | null = null;

    listen<FilesChanged>('files-changed', (event) => {
      // Only update if this is for our workspace
      if (event.payload.workspace_id === workspacePath) {
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
  }, [workspacePath]);

  return {
    files,
    loading,
    refresh,
  };
}
