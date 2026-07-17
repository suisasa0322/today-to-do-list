mod commands;
mod models;
mod storage;

#[cfg(test)]
mod storage_tests;

#[cfg(test)]
mod capability_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::load_tasks,
            commands::save_tasks
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
