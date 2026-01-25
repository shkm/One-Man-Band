import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIndicators } from './useIndicators';
import { resetMocks, createTestProject, createTestWorktree } from '../test/setup';
import { Project } from '../types';

// Mock the notifications module
vi.mock('../lib/notifications', () => ({
  sendOsNotification: vi.fn(),
}));

import { sendOsNotification } from '../lib/notifications';

describe('useIndicators', () => {
  const defaultOptions = {
    activeWorktreeId: null,
    activeProjectId: null,
    projects: [] as Project[],
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with empty indicator sets', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      expect(result.current.notifiedWorktreeIds.size).toBe(0);
      expect(result.current.thinkingWorktreeIds.size).toBe(0);
      expect(result.current.idleWorktreeIds.size).toBe(0);
      expect(result.current.notifiedProjectIds.size).toBe(0);
      expect(result.current.thinkingProjectIds.size).toBe(0);
      expect(result.current.idleProjectIds.size).toBe(0);
    });
  });

  describe('worktree notifications', () => {
    it('adds worktree to notified set on notification', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleWorktreeNotification('wt-1', 'Title', 'Body');
      });

      expect(result.current.notifiedWorktreeIds.has('wt-1')).toBe(true);
    });

    it('sends OS notification for inactive worktree', () => {
      const { result } = renderHook(() =>
        useIndicators({ ...defaultOptions, activeWorktreeId: 'wt-2' })
      );

      act(() => {
        result.current.handleWorktreeNotification('wt-1', 'Test Title', 'Test Body');
      });

      expect(sendOsNotification).toHaveBeenCalledWith('Test Title', 'Test Body');
    });

    it('does not send OS notification for active worktree', () => {
      const { result } = renderHook(() =>
        useIndicators({ ...defaultOptions, activeWorktreeId: 'wt-1' })
      );

      act(() => {
        result.current.handleWorktreeNotification('wt-1', 'Title', 'Body');
      });

      expect(sendOsNotification).not.toHaveBeenCalled();
    });

    it('uses worktree name as title if not provided', () => {
      const worktree = createTestWorktree({ id: 'wt-1', name: 'feature-branch' });
      const project = createTestProject({ worktrees: [worktree] });

      const { result } = renderHook(() =>
        useIndicators({
          ...defaultOptions,
          projects: [project],
        })
      );

      act(() => {
        result.current.handleWorktreeNotification('wt-1', '', 'Body');
      });

      expect(sendOsNotification).toHaveBeenCalledWith('feature-branch', 'Body');
    });

    it('clears notification when worktree becomes active', () => {
      const { result, rerender } = renderHook(
        (props) => useIndicators(props),
        { initialProps: defaultOptions }
      );

      act(() => {
        result.current.handleWorktreeNotification('wt-1', 'Title', 'Body');
      });

      expect(result.current.notifiedWorktreeIds.has('wt-1')).toBe(true);

      rerender({ ...defaultOptions, activeWorktreeId: 'wt-1' });

      expect(result.current.notifiedWorktreeIds.has('wt-1')).toBe(false);
    });
  });

  describe('worktree thinking state', () => {
    it('adds worktree to thinking set when thinking starts', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', true);
      });

      expect(result.current.thinkingWorktreeIds.has('wt-1')).toBe(true);
    });

    it('removes worktree from thinking set when thinking stops', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', true);
      });
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', false);
      });

      expect(result.current.thinkingWorktreeIds.has('wt-1')).toBe(false);
    });

    it('clears idle state when thinking starts', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      // First, make worktree idle by completing a thinking cycle
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', true);
      });
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', false);
      });

      expect(result.current.idleWorktreeIds.has('wt-1')).toBe(true);

      // Start thinking again - should clear idle
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', true);
      });

      expect(result.current.idleWorktreeIds.has('wt-1')).toBe(false);
    });

    it('sets idle state when thinking stops', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', true);
      });
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', false);
      });

      expect(result.current.idleWorktreeIds.has('wt-1')).toBe(true);
    });

    it('does not set idle if was not thinking', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', false);
      });

      expect(result.current.idleWorktreeIds.has('wt-1')).toBe(false);
    });

    it('clears idle state when worktree becomes active', () => {
      const { result, rerender } = renderHook(
        (props) => useIndicators(props),
        { initialProps: defaultOptions }
      );

      // Create idle state
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', true);
      });
      act(() => {
        result.current.handleWorktreeThinkingChange('wt-1', false);
      });

      expect(result.current.idleWorktreeIds.has('wt-1')).toBe(true);

      rerender({ ...defaultOptions, activeWorktreeId: 'wt-1' });

      expect(result.current.idleWorktreeIds.has('wt-1')).toBe(false);
    });
  });

  describe('project notifications', () => {
    it('adds project to notified set on notification', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleProjectNotification('proj-1', 'Title', 'Body');
      });

      expect(result.current.notifiedProjectIds.has('proj-1')).toBe(true);
    });

    it('sends OS notification for inactive project', () => {
      const { result } = renderHook(() =>
        useIndicators({ ...defaultOptions, activeProjectId: 'proj-2' })
      );

      act(() => {
        result.current.handleProjectNotification('proj-1', 'Test Title', 'Test Body');
      });

      expect(sendOsNotification).toHaveBeenCalledWith('Test Title', 'Test Body');
    });

    it('does not send OS notification for active project when no worktree active', () => {
      const { result } = renderHook(() =>
        useIndicators({ ...defaultOptions, activeProjectId: 'proj-1' })
      );

      act(() => {
        result.current.handleProjectNotification('proj-1', 'Title', 'Body');
      });

      expect(sendOsNotification).not.toHaveBeenCalled();
    });

    it('sends OS notification for active project when a worktree is active', () => {
      const { result } = renderHook(() =>
        useIndicators({
          ...defaultOptions,
          activeWorktreeId: 'wt-1',
          activeProjectId: 'proj-1',
        })
      );

      act(() => {
        result.current.handleProjectNotification('proj-1', 'Title', 'Body');
      });

      expect(sendOsNotification).toHaveBeenCalledWith('Title', 'Body');
    });

    it('uses project name as title if not provided', () => {
      const project = createTestProject({ id: 'proj-1', name: 'my-project' });

      const { result } = renderHook(() =>
        useIndicators({
          ...defaultOptions,
          projects: [project],
        })
      );

      act(() => {
        result.current.handleProjectNotification('proj-1', '', 'Body');
      });

      expect(sendOsNotification).toHaveBeenCalledWith('my-project', 'Body');
    });

    it('clears notification when project becomes active', () => {
      const { result, rerender } = renderHook(
        (props) => useIndicators(props),
        { initialProps: defaultOptions }
      );

      act(() => {
        result.current.handleProjectNotification('proj-1', 'Title', 'Body');
      });

      expect(result.current.notifiedProjectIds.has('proj-1')).toBe(true);

      // Project becomes active (no worktree active)
      rerender({ ...defaultOptions, activeProjectId: 'proj-1' });

      expect(result.current.notifiedProjectIds.has('proj-1')).toBe(false);
    });

    it('does not clear notification when project active but worktree also active', () => {
      const { result, rerender } = renderHook(
        (props) => useIndicators(props),
        { initialProps: defaultOptions }
      );

      act(() => {
        result.current.handleProjectNotification('proj-1', 'Title', 'Body');
      });

      expect(result.current.notifiedProjectIds.has('proj-1')).toBe(true);

      // Worktree is active, so project notification shouldn't clear
      rerender({
        ...defaultOptions,
        activeWorktreeId: 'wt-1',
        activeProjectId: 'proj-1',
      });

      expect(result.current.notifiedProjectIds.has('proj-1')).toBe(true);
    });
  });

  describe('project thinking state', () => {
    it('adds project to thinking set when thinking starts', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleProjectThinkingChange('proj-1', true);
      });

      expect(result.current.thinkingProjectIds.has('proj-1')).toBe(true);
    });

    it('removes project from thinking set when thinking stops', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleProjectThinkingChange('proj-1', true);
      });
      act(() => {
        result.current.handleProjectThinkingChange('proj-1', false);
      });

      expect(result.current.thinkingProjectIds.has('proj-1')).toBe(false);
    });

    it('sets idle state when thinking stops', () => {
      const { result } = renderHook(() => useIndicators(defaultOptions));

      act(() => {
        result.current.handleProjectThinkingChange('proj-1', true);
      });
      act(() => {
        result.current.handleProjectThinkingChange('proj-1', false);
      });

      expect(result.current.idleProjectIds.has('proj-1')).toBe(true);
    });

    it('clears idle state when project becomes active', () => {
      const { result, rerender } = renderHook(
        (props) => useIndicators(props),
        { initialProps: defaultOptions }
      );

      // Create idle state
      act(() => {
        result.current.handleProjectThinkingChange('proj-1', true);
      });
      act(() => {
        result.current.handleProjectThinkingChange('proj-1', false);
      });

      expect(result.current.idleProjectIds.has('proj-1')).toBe(true);

      // Project becomes active (no worktree active)
      rerender({ ...defaultOptions, activeProjectId: 'proj-1' });

      expect(result.current.idleProjectIds.has('proj-1')).toBe(false);
    });
  });
});
