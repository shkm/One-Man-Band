import { ChangedFiles } from './ChangedFiles';
import { Terminal } from './Terminal';
import { Workspace, FileChange } from '../../types';

interface RightPanelProps {
  workspace: Workspace | null;
  changedFiles: FileChange[];
}

export function RightPanel({ workspace, changedFiles }: RightPanelProps) {
  if (!workspace) {
    return (
      <div className="h-full bg-zinc-900 border-l border-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
        Select a workspace
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col">
      <div className="h-1/2 overflow-hidden">
        <ChangedFiles files={changedFiles} />
      </div>
      <div className="h-1 bg-zinc-800" />
      <div className="h-1/2 overflow-hidden">
        <Terminal workspace={workspace} />
      </div>
    </div>
  );
}
