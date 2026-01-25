import { useState, useCallback, useEffect } from 'react';
import { sendOsNotification } from '../lib/notifications';
import { Project } from '../types';

export interface UseIndicatorsOptions {
  activeWorktreeId: string | null;
  activeProjectId: string | null;
  projects: Project[];
}

export interface UseIndicatorsReturn {
  // Worktree indicator states
  notifiedWorktreeIds: Set<string>;
  thinkingWorktreeIds: Set<string>;
  idleWorktreeIds: Set<string>;

  // Project indicator states
  notifiedProjectIds: Set<string>;
  thinkingProjectIds: Set<string>;
  idleProjectIds: Set<string>;

  // Handlers
  handleWorktreeNotification: (worktreeId: string, title: string, body: string) => void;
  handleWorktreeThinkingChange: (worktreeId: string, isThinking: boolean) => void;
  handleProjectNotification: (projectId: string, title: string, body: string) => void;
  handleProjectThinkingChange: (projectId: string, isThinking: boolean) => void;
}

export function useIndicators(options: UseIndicatorsOptions): UseIndicatorsReturn {
  const { activeWorktreeId, activeProjectId, projects } = options;

  // Worktree indicator states
  const [notifiedWorktreeIds, setNotifiedWorktreeIds] = useState<Set<string>>(new Set());
  const [thinkingWorktreeIds, setThinkingWorktreeIds] = useState<Set<string>>(new Set());
  const [idleWorktreeIds, setIdleWorktreeIds] = useState<Set<string>>(new Set());

  // Project indicator states
  const [notifiedProjectIds, setNotifiedProjectIds] = useState<Set<string>>(new Set());
  const [thinkingProjectIds, setThinkingProjectIds] = useState<Set<string>>(new Set());
  const [idleProjectIds, setIdleProjectIds] = useState<Set<string>>(new Set());

  // Clear notification and idle state when worktree becomes active
  useEffect(() => {
    if (activeWorktreeId) {
      if (notifiedWorktreeIds.has(activeWorktreeId)) {
        setNotifiedWorktreeIds((prev) => {
          const next = new Set(prev);
          next.delete(activeWorktreeId);
          return next;
        });
      }
      if (idleWorktreeIds.has(activeWorktreeId)) {
        setIdleWorktreeIds((prev) => {
          const next = new Set(prev);
          next.delete(activeWorktreeId);
          return next;
        });
      }
    }
  }, [activeWorktreeId, notifiedWorktreeIds, idleWorktreeIds]);

  // Clear notification and idle state when project becomes active
  useEffect(() => {
    if (!activeWorktreeId && activeProjectId) {
      if (notifiedProjectIds.has(activeProjectId)) {
        setNotifiedProjectIds((prev) => {
          const next = new Set(prev);
          next.delete(activeProjectId);
          return next;
        });
      }
      if (idleProjectIds.has(activeProjectId)) {
        setIdleProjectIds((prev) => {
          const next = new Set(prev);
          next.delete(activeProjectId);
          return next;
        });
      }
    }
  }, [activeWorktreeId, activeProjectId, notifiedProjectIds, idleProjectIds]);

  // Worktree notification handler
  const handleWorktreeNotification = useCallback((worktreeId: string, title: string, body: string) => {
    setNotifiedWorktreeIds((prev) => new Set([...prev, worktreeId]));
    // Only send OS notification if this worktree is not active
    if (worktreeId !== activeWorktreeId) {
      // Use worktree name as title if not provided
      const notificationTitle = title || (() => {
        for (const project of projects) {
          const wt = project.worktrees.find(w => w.id === worktreeId);
          if (wt) return wt.name;
        }
        return 'Shellflow';
      })();
      sendOsNotification(notificationTitle, body);
    }
  }, [activeWorktreeId, projects]);

  // Worktree thinking state handler
  const handleWorktreeThinkingChange = useCallback((worktreeId: string, isThinking: boolean) => {
    setThinkingWorktreeIds((prev) => {
      if (isThinking) {
        // Clear idle when thinking starts
        setIdleWorktreeIds((idlePrev) => {
          if (!idlePrev.has(worktreeId)) return idlePrev;
          const next = new Set(idlePrev);
          next.delete(worktreeId);
          return next;
        });
        if (prev.has(worktreeId)) return prev;
        return new Set([...prev, worktreeId]);
      } else {
        // Set idle when thinking stops (only if was thinking)
        if (prev.has(worktreeId)) {
          setIdleWorktreeIds((idlePrev) => {
            if (idlePrev.has(worktreeId)) return idlePrev;
            return new Set([...idlePrev, worktreeId]);
          });
        }
        if (!prev.has(worktreeId)) return prev;
        const next = new Set(prev);
        next.delete(worktreeId);
        return next;
      }
    });
  }, []);

  // Project notification handler
  const handleProjectNotification = useCallback((projectId: string, title: string, body: string) => {
    setNotifiedProjectIds((prev) => new Set([...prev, projectId]));
    // Only send OS notification if this project is not active (or a worktree is active)
    if (activeWorktreeId || projectId !== activeProjectId) {
      const notificationTitle = title || (() => {
        const project = projects.find(p => p.id === projectId);
        return project?.name ?? 'Shellflow';
      })();
      sendOsNotification(notificationTitle, body);
    }
  }, [activeWorktreeId, activeProjectId, projects]);

  // Project thinking state handler
  const handleProjectThinkingChange = useCallback((projectId: string, isThinking: boolean) => {
    setThinkingProjectIds((prev) => {
      if (isThinking) {
        // Clear idle when thinking starts
        setIdleProjectIds((idlePrev) => {
          if (!idlePrev.has(projectId)) return idlePrev;
          const next = new Set(idlePrev);
          next.delete(projectId);
          return next;
        });
        if (prev.has(projectId)) return prev;
        return new Set([...prev, projectId]);
      } else {
        // Set idle when thinking stops (only if was thinking)
        if (prev.has(projectId)) {
          setIdleProjectIds((idlePrev) => {
            if (idlePrev.has(projectId)) return idlePrev;
            return new Set([...idlePrev, projectId]);
          });
        }
        if (!prev.has(projectId)) return prev;
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      }
    });
  }, []);

  return {
    notifiedWorktreeIds,
    thinkingWorktreeIds,
    idleWorktreeIds,
    notifiedProjectIds,
    thinkingProjectIds,
    idleProjectIds,
    handleWorktreeNotification,
    handleWorktreeThinkingChange,
    handleProjectNotification,
    handleProjectThinkingChange,
  };
}
