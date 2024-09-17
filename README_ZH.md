# Issue Game

**这是一个可以在 GitHub Issue 上玩的游戏的 Action 项目**

[中文](README_ZH.md) | [English](README.md)

## 🎮 开始游玩

+ [井字棋](https://github.com/xiaohuohumax/issue-game/issues/new?title=Play%20Tic-Tac-Toe&body=Do%20not%20modify%20the%20Issue%20title,%20just%20submit%20it%20directly. '点击此处创建房间，开始游戏')

## 📖 使用方法

在 GitHub 仓库中创建一个 `.github/workflows/Issue-game.yml` 文件，并添加以下内容：

> [!Note]
> 请确保 Token 拥有读写 Issue 和 Label 的权限 (Settings => Actions => General)。

```yaml
name: Issue Game

on:
  issues:
    types:
      - opened
  issue_comment:
    types:
      - created

jobs:
  Issue-game:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Issue Game Action
        uses: xiaohuohumax/Issue-game
          # with:
          #   token: ${{ secrets.GITHUB_TOKEN }}
          #   ttt-init-pattern: "^play\\s+tic[-_]tac[-_]toe"
          #   ttt-label-name: "game-ttt-room"
          #   ttt-label-color: "#009527"
          #   ttt-label-description: "This Issue is a Tic-Tac-Toe game room."
```

## ⚙ 使用参数

| 名称                    | 类型   | 说明                                | 默认值                                   |
| ----------------------- | ------ | ----------------------------------- | ---------------------------------------- |
| `token`                 | string | 用于身份验证的 GitHub 令牌          | {{ github.token }}                       |
| `ttt-init-pattern`      | string | 井字棋游戏：创建房间 Issue 标题正则 | "^play\\s+tic[-\_]tac[-\_]toe"           |
| `ttt-label-name`        | string | 井字棋游戏：issue 标签名称          | "game-ttt-room"                          |
| `ttt-label-color`       | string | 井字棋游戏：issue 标签颜色          | "#009527"                                |
| `ttt-label-description` | string | 井字棋游戏：issue 标签描述          | "This Issue is a Tic-Tac-Toe game room." |
