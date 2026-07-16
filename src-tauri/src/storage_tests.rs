use crate::models::Task;
use crate::storage::{corrupt_path_for_timestamp, load_from_path, save_to_path};
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
fn saved_task_json_uses_created_at_camel_case() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("tasks.json");
    let tasks = vec![Task {
        id: "task-1".into(),
        text: "Buy milk".into(),
        completed: false,
        created_at: "2026-07-12T00:00:00Z".into(),
    }];

    save_to_path(&path, &tasks).unwrap();

    let json = std::fs::read_to_string(path).unwrap();
    assert!(json.contains("\"createdAt\""));
    assert!(!json.contains("created_at"));
}

#[test]
fn corrupt_data_is_renamed_and_load_returns_empty() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("tasks.json");
    std::fs::write(&path, "not json").unwrap();
    assert_eq!(load_from_path(&path).unwrap(), Vec::<Task>::new());

    let entries: Vec<_> = std::fs::read_dir(directory.path())
        .unwrap()
        .map(Result::unwrap)
        .collect();
    assert_eq!(entries.len(), 1);
    let backup_name = entries[0].file_name();
    let backup_name = backup_name.to_str().unwrap();
    let timestamp = backup_name
        .strip_prefix("tasks-")
        .and_then(|name| name.strip_suffix(".corrupt.json"))
        .unwrap();
    assert!(!timestamp.is_empty());
    assert!(timestamp.bytes().all(|byte| byte.is_ascii_digit()));
    assert_eq!(std::fs::read(entries[0].path()).unwrap(), b"not json");
}

#[test]
fn corrupt_backup_path_uses_a_suffix_without_overwriting_an_existing_backup() {
    let directory = tempdir().unwrap();
    let tasks_path = directory.path().join("tasks.json");
    let existing_backup = directory.path().join("tasks-123.corrupt.json");
    std::fs::write(&existing_backup, b"first corrupt payload").unwrap();

    let next_backup = corrupt_path_for_timestamp(&tasks_path, 123);

    assert_eq!(
        next_backup.file_name().unwrap(),
        "tasks-123-1.corrupt.json"
    );
    std::fs::write(&next_backup, b"second corrupt payload").unwrap();
    assert_eq!(
        std::fs::read(existing_backup).unwrap(),
        b"first corrupt payload"
    );
}
