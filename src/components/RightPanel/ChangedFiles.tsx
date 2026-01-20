import { FileChange } from '../../types';

interface ChangedFilesProps {
  files: FileChange[];
}

const statusConfig: Record<FileChange['status'], { color: string; label: string }> = {
  added: { color: 'text-green-400', label: 'A' },
  modified: { color: 'text-yellow-400', label: 'M' },
  deleted: { color: 'text-red-400', label: 'D' },
  renamed: { color: 'text-blue-400', label: 'R' },
  untracked: { color: 'text-zinc-400', label: '?' },
};

export function ChangedFiles({ files }: ChangedFilesProps) {
  // Calculate total insertions and deletions
  const totals = files.reduce(
    (acc, file) => ({
      insertions: acc.insertions + (file.insertions ?? 0),
      deletions: acc.deletions + (file.deletions ?? 0),
    }),
    { insertions: 0, deletions: 0 }
  );

  const hasChanges = totals.insertions > 0 || totals.deletions > 0;

  return (
    <div className="flex flex-col h-full select-none">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </span>
        {hasChanges && (
          <span className="text-xs font-mono">
            <span className="text-green-400">+{totals.insertions}</span>
            {' '}
            <span className="text-red-400">-{totals.deletions}</span>
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            No changes detected
          </div>
        ) : (
          <ul className="py-1">
            {files.map((file) => {
              const config = statusConfig[file.status];
              return (
                <li
                  key={file.path}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 group"
                >
                  <span className={`flex-shrink-0 w-4 text-xs font-mono ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-sm text-zinc-300 truncate flex-1" title={file.path}>
                    {file.path}
                  </span>
                  {(file.insertions !== undefined || file.deletions !== undefined) && (
                    <span className="text-xs font-mono flex-shrink-0">
                      {file.insertions !== undefined && file.insertions > 0 && (
                        <span className="text-green-400">+{file.insertions}</span>
                      )}
                      {file.insertions !== undefined && file.insertions > 0 && file.deletions !== undefined && file.deletions > 0 && ' '}
                      {file.deletions !== undefined && file.deletions > 0 && (
                        <span className="text-red-400">-{file.deletions}</span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
