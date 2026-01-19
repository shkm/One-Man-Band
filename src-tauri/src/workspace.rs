use crate::git;
use crate::state::{Project, Workspace};
use rand::seq::SliceRandom;
use std::path::{Path, PathBuf};
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum WorkspaceError {
    #[error("Git error: {0}")]
    Git(#[from] git::GitError),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Not a git repository")]
    NotARepository,
    #[error("Project not found: {0}")]
    ProjectNotFound(String),
    #[error("Workspace not found: {0}")]
    WorkspaceNotFound(String),
}

// Fun random name generator for workspaces
const ADJECTIVES: &[&str] = &[
    "fuzzy", "quick", "lazy", "happy", "sleepy", "brave", "calm", "eager",
    "gentle", "jolly", "keen", "lively", "merry", "noble", "proud", "swift",
    "witty", "zesty", "agile", "bold", "cosmic", "daring", "epic", "fierce",
];

const ANIMALS: &[&str] = &[
    "tiger", "bear", "fox", "wolf", "eagle", "hawk", "owl", "panda",
    "koala", "otter", "seal", "whale", "dolphin", "falcon", "raven", "lynx",
    "badger", "ferret", "marten", "stoat", "heron", "crane", "swan", "robin",
];

pub fn generate_workspace_name() -> String {
    let mut rng = rand::thread_rng();
    let adj = ADJECTIVES.choose(&mut rng).unwrap_or(&"quick");
    let animal = ANIMALS.choose(&mut rng).unwrap_or(&"fox");
    format!("{}-{}", adj, animal)
}

pub fn get_workspaces_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".workspaces")
}

pub fn create_project(path: &Path) -> Result<Project, WorkspaceError> {
    if !git::is_git_repo(path) {
        return Err(WorkspaceError::NotARepository);
    }

    Ok(Project {
        id: Uuid::new_v4().to_string(),
        name: git::get_repo_name(path),
        path: path.to_string_lossy().to_string(),
        workspaces: vec![],
    })
}

pub fn create_workspace(
    project: &mut Project,
    name: Option<String>,
) -> Result<Workspace, WorkspaceError> {
    let workspace_name = name.unwrap_or_else(generate_workspace_name);

    // Create workspace directory
    let workspaces_base = get_workspaces_dir();
    let repo_workspaces = workspaces_base.join(&project.name);
    let workspace_path = repo_workspaces.join(&workspace_name);

    std::fs::create_dir_all(&repo_workspaces)?;

    // Create git worktree
    let project_path = Path::new(&project.path);
    git::create_worktree(project_path, &workspace_path, &workspace_name)?;

    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name: workspace_name.clone(),
        path: workspace_path.to_string_lossy().to_string(),
        branch: workspace_name,
        created_at: chrono_lite_now(),
    };

    project.workspaces.push(workspace.clone());

    Ok(workspace)
}

pub fn delete_workspace(project: &mut Project, workspace_id: &str) -> Result<(), WorkspaceError> {
    let workspace_idx = project
        .workspaces
        .iter()
        .position(|w| w.id == workspace_id)
        .ok_or_else(|| WorkspaceError::WorkspaceNotFound(workspace_id.to_string()))?;

    let workspace = &project.workspaces[workspace_idx];

    // Delete worktree
    let project_path = Path::new(&project.path);
    git::delete_worktree(project_path, &workspace.name)?;

    // Remove workspace directory if it still exists
    let workspace_path = Path::new(&workspace.path);
    if workspace_path.exists() {
        std::fs::remove_dir_all(workspace_path)?;
    }

    project.workspaces.remove(workspace_idx);

    Ok(())
}

// Simple timestamp without external chrono dependency
fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();

    // Convert to ISO-8601-ish format (simplified)
    let days_since_1970 = secs / 86400;
    let years = 1970 + days_since_1970 / 365;
    let remaining_days = days_since_1970 % 365;
    let month = (remaining_days / 30) + 1;
    let day = (remaining_days % 30) + 1;
    let hour = (secs % 86400) / 3600;
    let min = (secs % 3600) / 60;
    let sec = secs % 60;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        years, month, day, hour, min, sec
    )
}
