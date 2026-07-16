use crate::models::Task;
use std::fmt;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug)]
pub enum StorageError {
    Io(std::io::Error),
    Json(serde_json::Error),
    Clock(std::time::SystemTimeError),
}

impl fmt::Display for StorageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "storage I/O error: {error}"),
            Self::Json(error) => write!(formatter, "storage JSON error: {error}"),
            Self::Clock(error) => write!(formatter, "system clock error: {error}"),
        }
    }
}

impl std::error::Error for StorageError {}

impl From<std::io::Error> for StorageError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for StorageError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

impl From<std::time::SystemTimeError> for StorageError {
    fn from(error: std::time::SystemTimeError) -> Self {
        Self::Clock(error)
    }
}

pub fn load_from_path(path: &Path) -> Result<Vec<Task>, StorageError> {
    let contents = match fs::read(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error.into()),
    };

    match serde_json::from_slice(&contents) {
        Ok(tasks) => Ok(tasks),
        Err(_) => {
            let unix_seconds = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
            backup_corrupt_file(path, unix_seconds)?;
            Ok(Vec::new())
        }
    }
}

pub(crate) fn backup_corrupt_file(
    path: &Path,
    unix_seconds: u64,
) -> Result<PathBuf, StorageError> {
    for suffix in 0_u64.. {
        let file_name = if suffix == 0 {
            format!("tasks-{unix_seconds}.corrupt.json")
        } else {
            format!("tasks-{unix_seconds}-{suffix}.corrupt.json")
        };
        let candidate = path.with_file_name(file_name);
        match fs::hard_link(path, &candidate) {
            Ok(()) => {
                fs::remove_file(path)?;
                return Ok(candidate);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error.into()),
        }
    }

    unreachable!("the corrupt backup suffix range is inexhaustible")
}

pub fn save_to_path(path: &Path, tasks: &[Task]) -> Result<(), StorageError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let temporary_path = path.with_file_name("tasks.json.tmp");
    let serialized = serde_json::to_vec(tasks)?;
    let mut file = File::create(&temporary_path)?;
    file.write_all(&serialized)?;
    file.sync_all()?;
    drop(file);
    fs::rename(temporary_path, path)?;
    Ok(())
}
