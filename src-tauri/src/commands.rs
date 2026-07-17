use crate::models::Task;
use crate::storage::{load_from_path, save_to_path};
use tauri::{AppHandle, Manager};

const TASKS_FILE_NAME: &str = "tasks.json";

#[tauri::command]
pub async fn load_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(TASKS_FILE_NAME);
    load_from_path(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_tasks(tasks: Vec<Task>, app: AppHandle) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(TASKS_FILE_NAME);
    save_to_path(&path, &tasks).map_err(|error| error.to_string())
}
