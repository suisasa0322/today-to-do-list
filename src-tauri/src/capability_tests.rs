use serde_json::Value;
use std::path::Path;

#[test]
fn default_capability_has_only_the_required_main_window_permissions() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("capabilities/default.json");
    let contents = std::fs::read_to_string(path).expect("default capability must exist");
    let capability: Value = serde_json::from_str(&contents).expect("capability must be valid JSON");

    assert_eq!(capability["windows"], serde_json::json!(["main"]));
    assert!(capability.get("webviews").is_none());

    let mut permissions: Vec<_> = capability["permissions"]
        .as_array()
        .expect("permissions must be an array")
        .iter()
        .map(|permission| {
            permission
                .as_str()
                .expect("each permission must be a string")
        })
        .collect();
    permissions.sort_unstable();

    assert_eq!(
        permissions,
        [
            "core:event:allow-listen",
            "core:event:allow-unlisten",
            "core:window:allow-destroy",
        ]
    );
}
