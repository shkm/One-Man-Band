use crate::git;
use crate::state::FileChange;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
pub struct FilesChanged {
    pub workspace_id: String,
    pub files: Vec<FileChange>,
}

pub fn watch_workspace(app: AppHandle, workspace_id: String, workspace_path: String) {
    thread::spawn(move || {
        let (tx, rx) = channel::<notify::Result<Event>>();

        let config = Config::default()
            .with_poll_interval(Duration::from_secs(2))
            .with_compare_contents(false);

        let mut watcher: RecommendedWatcher = match Watcher::new(tx, config) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create watcher: {}", e);
                return;
            }
        };

        let path = Path::new(&workspace_path);
        if let Err(e) = watcher.watch(path, RecursiveMode::Recursive) {
            eprintln!("Failed to watch path: {}", e);
            return;
        }

        // Debounce timer
        let mut last_event = std::time::Instant::now();
        let debounce_duration = Duration::from_millis(500);

        loop {
            match rx.recv_timeout(Duration::from_secs(1)) {
                Ok(Ok(_event)) => {
                    let now = std::time::Instant::now();
                    if now.duration_since(last_event) > debounce_duration {
                        last_event = now;

                        // Get changed files
                        if let Ok(files) = git::get_changed_files(path) {
                            let _ = app.emit(
                                "files-changed",
                                FilesChanged {
                                    workspace_id: workspace_id.clone(),
                                    files,
                                },
                            );
                        }
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Watch error: {}", e);
                }
                Err(_) => {
                    // Timeout, continue watching
                }
            }
        }
    });
}
