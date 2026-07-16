use crate::models::Task;
use crate::storage::{load_from_path, save_to_path};
use tempfile::tempdir;

#[test]
fn load_after_save_returns_the_same_tasks() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("tasks.json");
    let tasks = vec![Task {
        id: "task-1".into(),
        text: "Buy milk".into(),
        completed: false,
        created_at: "2026-07-12T00:00:00Z".into(),
    }];
    save_to_path(&path, &tasks).unwrap();
    assert_eq!(load_from_path(&path).unwrap(), tasks);
}

#[test]
fn corrupt_data_is_renamed_and_load_returns_empty() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("tasks.json");
    std::fs::write(&path, "not json").unwrap();
    assert_eq!(load_from_path(&path).unwrap(), Vec::<Task>::new());
    assert_eq!(std::fs::read_dir(directory.path()).unwrap().count(), 1);
}
