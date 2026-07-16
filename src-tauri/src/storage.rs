use crate::models::Task;
use std::fmt;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
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
            let corrupt_path = path.with_file_name(format!("tasks-{unix_seconds}.corrupt.json"));
            fs::rename(path, corrupt_path)?;
            Ok(Vec::new())
        }
    }
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
