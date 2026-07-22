# Today To Do List 项目交接

- 最后更新：2026-07-17
- 当前版本：`0.1.0`
- 当前主分支提交：`fbacf3da55c7f4ebb48bb388d8bacbfbc1899fcc`

## 1. 项目概况

Today To Do List 是一个仅在本机运行的 macOS 桌面待办小组件。它采用浅黄色便签样式，不需要账号或网络，任务保存在用户自己的 Mac 上。

- GitHub 仓库：https://github.com/suisasa0322/today-to-do-list
- 已合并的主开发 PR：https://github.com/suisasa0322/today-to-do-list/pull/1
- 技术栈：Tauri 2、Rust、TypeScript、Vite、原生 DOM/CSS
- macOS Bundle Identifier：`com.suisasa.todaytodolist`
- 应用名称：`Today To Do List`
- 当前定位：个人本机使用，不面向所有用户公开分发

截至本文更新时间，PR #1 已合并，仓库本地 `main` 与 GitHub `main` 均指向 `fbacf3d`。创建本文前工作区干净；创建后 `handover.md` 是唯一新增的未提交文件。

## 2. 已完成功能

- 在底部输入框输入文字并按 Enter 新建任务。
- 自动去除任务文字首尾空格，不添加空白任务。
- 未完成任务显示为灰色且没有删除线。
- 点击任务可切换完成状态；完成后显示勾选和删除线，再次点击可恢复。
- 鼠标悬停在任务行时才显示删除按钮。
- 任务不会在每天结束时自动清空。
- 任务新增、完成状态和删除结果都会保存到本地 JSON 文件。
- 多次快速修改会按顺序串行保存，避免较早的写入覆盖较新的状态。
- 关闭窗口前会等待保存队列完成；最后一次保存失败时应用保持打开并显示错误。
- 数据加载失败或安全关闭机制初始化失败时会禁用编辑，避免覆盖原有数据。
- JSON 损坏时会先保留带时间戳的损坏文件，再以空列表启动。
- 窗口可以移动和调整大小，可以被其他窗口遮住，不会永久置顶。
- 已使用米黄色眨眼猫图作为应用图标。
- 已提供带校验、备份和失败恢复能力的本机安装脚本。

## 3. 当前未包含的功能

以下功能不属于当前 v0.1.0：

- 登录、账号或云同步
- iCloud 同步或多设备同步
- 提醒、通知、截止日期
- 开机自动启动
- 每日自动清空或历史归档
- 分类、标签、优先级、拖拽排序
- 菜单栏模式或真正的 macOS WidgetKit 小组件
- Apple Developer ID 正式签名、公证或 Mac App Store 发布

## 4. 目录结构

```text
today-to-do-list/
├── src/                         # TypeScript 前端
│   ├── main.ts                  # 启动、保存队列、关闭流程
│   ├── persistence.ts           # Tauri load/save 命令适配
│   ├── render.ts                # DOM 渲染和交互事件
│   ├── task-store.ts            # 新增、切换、删除纯函数
│   ├── style.css                # 便签界面样式
│   └── types.ts                 # Task 类型
├── src-tauri/
│   ├── src/
│   │   ├── commands.rs          # load_tasks / save_tasks 命令
│   │   ├── storage.rs           # 原子写入和损坏文件备份
│   │   ├── models.rs            # Rust Task 数据结构
│   │   └── lib.rs               # Tauri 应用入口与命令注册
│   ├── capabilities/default.json# 最小化窗口生命周期权限
│   ├── icons/                   # 猫咪主图和各平台图标
│   └── tauri.conf.json          # 窗口、Bundle、图标和签名配置
├── tests/e2e/                   # Playwright 完整交互流程
├── scripts/
│   ├── install-macos-app.command# 安全安装到 /Applications
│   ├── install-macos-app.test.sh# 安装器回归测试
│   └── verify-icon-assets.sh    # 图标完整性检查
├── docs/superpowers/specs/      # 原始设计说明
├── docs/superpowers/plans/      # 原始实施计划
├── package.json                 # Node 依赖和常用命令
└── README.md                    # 简短的开发入口
```

## 5. 数据模型与本地存储

单个任务的数据结构为：

```json
{
  "id": "UUID",
  "text": "任务内容",
  "completed": false,
  "createdAt": "ISO-8601 时间"
}
```

macOS 上的实际数据文件位于：

```text
~/Library/Application Support/com.suisasa.todaytodolist/tasks.json
```

当前这台 Mac 上该目录和 `tasks.json` 均已存在。不要在构建、安装或排错时删除该文件。

保存流程：

1. Rust 将完整任务数组序列化到同目录的 `tasks.json.tmp`。
2. 调用 `sync_all`，确保内容写入磁盘。
3. 用重命名操作将临时文件原子替换为 `tasks.json`。

如果 `tasks.json` 无法解析，程序会将它保存为以下形式，然后返回空任务列表：

```text
tasks-<Unix 时间>.corrupt.json
tasks-<Unix 时间>-<序号>.corrupt.json
```

同一秒内出现多个损坏文件时会递增序号，不会覆盖已有备份。

## 6. 开发环境

已知可工作的本机版本：

- Node.js `v24.18.0`
- pnpm `11.9.0`
- Rust/Cargo `1.97.0`

项目声明支持 Node.js `20.19+` 或 `22.13+`，并固定使用 pnpm `11.9.0`。首次拉取后执行：

```bash
pnpm install
pnpm tauri dev
```

`pnpm tauri dev` 会启动 Vite 开发服务器并打开原生 Tauri 窗口。不要只通过普通浏览器判断所有功能，因为数据保存和窗口关闭依赖 Tauri API。

## 7. 测试与验证

常用检查：

```bash
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm playwright test
./scripts/verify-icon-assets.sh
./scripts/install-macos-app.test.sh
```

各项覆盖范围：

- Vitest：任务 reducer、DOM 行为、加载/保存失败、保存顺序和安全关闭。
- Cargo test：JSON 往返、camelCase 字段、损坏数据备份、备份名冲突、最小权限。
- Playwright：新增、重启恢复、完成状态、悬停删除和删除后恢复。
- 图标脚本：主图必须为至少 1024×1024 的正方形，`icon.icns` 必须有效。
- 安装器测试：成功替换、无效 Bundle 拒绝、备份冲突、复制失败、切换失败和恢复失败等路径。

2026-07-17 的最新核验结果：

- Vitest：15 项通过，0 项失败。
- TypeScript 检查和 Vite 正式构建：通过。
- Rust：5 项通过，0 项失败。
- 图标检查：通过，主图为 1254×1254。
- 安装器：9 种情形全部通过。
- Tauri debug `.app` 构建和 ad-hoc 签名：通过。
- Playwright：当前 Codex 受限运行环境在启动系统 Chrome 时返回 `EPERM/SIGABRT`，测试没有进入应用断言阶段。发布前应在普通 Terminal 中重新执行 `pnpm playwright test`。

当前受限环境里的 pnpm 包装器还可能尝试联网检查元数据；断网时可直接使用 `node_modules/.bin/` 下已经安装的工具验证。正常开发环境仍应优先使用本文列出的 pnpm 命令。

完整构建前建议使用：

```bash
pnpm test && \
pnpm build && \
cargo test --manifest-path src-tauri/Cargo.toml && \
pnpm playwright test && \
./scripts/verify-icon-assets.sh && \
./scripts/install-macos-app.test.sh && \
pnpm tauri build --debug
```

## 8. 构建与安装

生成本机调试版 `.app`：

```bash
pnpm tauri build --debug
```

默认产物：

```text
src-tauri/target/debug/bundle/macos/Today To Do List.app
```

安装到 Finder 的“应用程序”目录：

```bash
./scripts/install-macos-app.command
```

安装器会：

1. 校验 `Contents` 结构、`Info.plist` 和 Bundle Identifier。
2. 先复制到 `/Applications` 内的临时目录并再次校验。
3. 将旧版本保留为 `Today To Do List.backup-<时间>-<随机标识>.app`。
4. 原子切换到 `/Applications/Today To Do List.app`。
5. 如果最后切换失败，尝试恢复原来的应用。

当前这台 Mac 上已安装：

```text
/Applications/Today To Do List.app
```

已安装版本为 `0.1.0`，包含 `icon.icns`，Bundle Identifier 正确，并使用 ad-hoc 签名。

## 9. 签名与发布状态

`src-tauri/tauri.conf.json` 当前设置：

```json
"macOS": {
  "signingIdentity": "-"
}
```

这会生成内部一致的 ad-hoc 签名，适合当前这台 Mac 自用，但不是 Apple Developer ID 正式签名，也没有经过 Apple 公证。把 `.app` 或压缩包发给其他人时，仍可能遇到 Gatekeeper 阻止或“无法验证开发者”的提示。

仓库之前发布过预览包：

```text
https://github.com/suisasa0322/today-to-do-list/releases/tag/v0.1.0-preview.1
```

该预览包早于后续猫咪图标、安全安装器、关闭保存和签名修复。它不能代表当前 `main`。当前自用最新版应从 `main` 本机构建，不要直接用旧预览包覆盖 `/Applications` 中的应用。

若未来要面向任何人正常分发，需要：

1. Apple Developer Program 账号。
2. Developer ID Application 证书。
3. 使用正式证书签名。
4. 提交 Apple notarization 并 stapling。
5. 重新创建与当前 `main` 对应的 GitHub Release。

## 10. 图标和头像资源

应用图标的源文件：

```text
src-tauri/icons/icon-master.png
```

它是 1254×1254 的米黄色眨眼猫 PNG。Tauri 生成的 `.icns`、Windows、Android 和 iOS 图标也都保存在 `src-tauri/icons/`。

无水印头像成品不在 Git 仓库内，位于仓库同级的发布目录：

```text
../publish/Winking-Cat-Avatar.png
```

当前绝对路径：

```text
/Users/suisasa/Documents/Codex/2026-07-11/codex-logs-2-sqlite-trace-sqlite/work/publish/Winking-Cat-Avatar.png
```

如果移动或重新克隆仓库，需要单独备份这个头像文件；它不会随 GitHub 仓库下载。

## 11. Git 与协作状态

- 默认分支：`main`
- 当前合并提交：`fbacf3d`
- 已合并功能分支：`codex/desktop-widget`
- PR #1：已合并并关闭
- 仓库当前为公开仓库
- 本地功能分支仍保留，没有删除
- `handover.md` 是本文创建后唯一尚未提交的新文件

后续开发建议从最新 `main` 创建新的短期功能分支，不要继续在已经合并的 `codex/desktop-widget` 上堆叠修改。

开始工作前：

```bash
git switch main
git pull --ff-only
git switch -c codex/<功能名称>
```

交付前至少确认：

```bash
git status -sb
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

## 12. 故障处理

### 应用无法打开

- 确认使用的是 `/Applications/Today To Do List.app`。
- 当前应用是 ad-hoc 签名；必要时在 Finder 中右键应用并选择“打开”。
- 若系统仍阻止运行，重新本地构建并通过安装脚本安装，避免直接使用旧预览下载包。

### 修改后没有保存

- 界面会显示 `Changes are not saved yet.`。
- 此时不要强制结束进程；应用会在最后一次保存失败时阻止关闭。
- 检查 `~/Library/Application Support/com.suisasa.todaytodolist/` 的写权限和磁盘空间。

### 启动后任务为空

- 先检查 `tasks.json` 是否仍存在。
- 再检查同目录是否出现 `tasks-*.corrupt.json`。
- 不要立即创建大量新任务，以免混淆恢复过程；先复制整个数据目录作为备份。

### 安装失败

- 安装脚本会尽量保留或恢复旧应用。
- 检查 `/Applications` 下是否存在 `Today To Do List.backup-*.app`。
- 不要手动删除备份，直到确认新应用能打开且原任务仍然存在。

## 13. 后续可选方向

当前版本没有必须立即修复的已知阻塞问题。若继续迭代，建议一次只选择一个方向并先写设计：

- 数据导出、导入和手动备份
- 开机启动
- 提醒和截止日期
- 菜单栏快速录入
- 每日归档而不是清空
- 正式签名与公证
- 为当前 `main` 制作新的 GitHub Release
- 将 README 扩充为面向普通用户的安装和使用说明

涉及数据格式、Bundle Identifier 或应用数据目录的修改必须考虑向后兼容，不能让现有 `tasks.json` 丢失。

## 14. 交接结论

项目当前已经具备可用的本机 macOS v0.1.0：核心交互、持久化、安全关闭、图标和本机安装均已完成，单元测试、构建、图标及安装器验证已通过。Playwright 需要在不限制 Chrome 启动的普通 Terminal 中补跑。继续开发时应以 `main` 的 `fbacf3d` 为基线，优先保护本地任务数据，并把旧 GitHub 预览包视为历史产物。
