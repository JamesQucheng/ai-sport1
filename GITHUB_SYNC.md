# GitHub 同步指南

本指南帮助你把本地或 Codespaces 中的改动推送到远程 GitHub 仓库并创建合并请求。

## 1. 关联远程仓库
- 查看远程：`git remote -v`
- 如需新增：`git remote add origin <your_repo_url>`（已存在 origin 时可跳过）

## 2. 拉取最新代码
- `git fetch origin`
- `git switch work`（或你的工作分支），若从主分支起步：`git switch main && git pull`

## 3. 提交你的改动
- 确认变更：`git status`
- 添加文件：`git add <files>`
- 提交：`git commit -m "feat: sync latest changes"`

## 4. 推送并创建 PR
- 推送：`git push origin <branch_name>`
- 在 GitHub 打开仓库，按照提示创建 Pull Request，填写变更摘要与测试结果。

## 5. 常用检查（建议）
- 前端：在 `ai-sport/ai-workout-vue` 运行 `npm run build`
- 后端：在 `ai-sport/backend` 运行 `npm test`

完成上述步骤后，GitHub 会展示你的提交，团队即可审查并合并到主分支。
