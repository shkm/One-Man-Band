import { useMemo, useCallback } from 'react';
import {
  ActionId,
  ActionContext,
  getActionAvailability,
  getMenuAvailability,
  isActionAvailable,
} from '../lib/actions';

// Handler functions for each action
export type ActionHandlers = Partial<Record<ActionId, () => void>>;

export interface UseActionsResult {
  /** Check if a specific action is available */
  isAvailable: (actionId: ActionId) => boolean;
  /** Execute an action (returns false if not available) */
  execute: (actionId: ActionId) => boolean;
  /** Execute an action by menu ID (menu IDs = action IDs in namespaced format) */
  executeByMenuId: (menuId: string) => boolean;
  /** Get availability map for all actions */
  availability: Record<ActionId, boolean>;
  /** Get availability map formatted for menu bar (menu item IDs) */
  menuAvailability: Record<string, boolean>;
}

/**
 * Hook that provides action availability checking and execution.
 *
 * @param ctx - Current application state needed to evaluate availability
 * @param handlers - Functions to execute for each action
 */
export function useActions(ctx: ActionContext, handlers: ActionHandlers): UseActionsResult {
  // Compute availability for all actions
  const availability = useMemo(() => getActionAvailability(ctx), [ctx]);

  // Compute menu availability (using menu item IDs)
  const menuAvailability = useMemo(() => getMenuAvailability(ctx), [ctx]);

  // Check if specific action is available
  const isAvailable = useCallback(
    (actionId: ActionId) => isActionAvailable(actionId, ctx),
    [ctx]
  );

  // Execute action (only if available)
  const execute = useCallback(
    (actionId: ActionId): boolean => {
      if (!isActionAvailable(actionId, ctx)) {
        return false;
      }
      const handler = handlers[actionId];
      if (handler) {
        handler();
        return true;
      }
      return false;
    },
    [ctx, handlers]
  );

  // Execute action by menu ID (direct passthrough since menu IDs = action IDs now)
  const executeByMenuId = useCallback(
    (menuId: string): boolean => {
      return execute(menuId as ActionId);
    },
    [execute]
  );

  return {
    isAvailable,
    execute,
    executeByMenuId,
    availability,
    menuAvailability,
  };
}
