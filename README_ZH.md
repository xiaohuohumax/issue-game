# Issue Game

**这是一个可以在 GitHub Issue 上玩游戏的 Action 项目**

[中文](README_ZH.md) | [English](README.md)

## 🎮 开始游玩

点击下面的链接，即可开始游戏：

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
        uses: xiaohuohumax/issue-game
          # with:
          #   token: ${{ secrets.GITHUB_TOKEN }}
          #   ttt-issue-title-pattern: "^play\\s+tic[-_]?tac[-_]?toe"
          #   ttt-label-prefix: "game-ttt-room-"
```

## ⚙ 使用参数

| 名称                      | 类型   | 说明                                | 默认值                           |
| ------------------------- | ------ | ----------------------------------- | -------------------------------- |
| `token`                   | string | 用于身份验证的 GitHub 令牌          | {{ github.token }}               |
| `ttt-issue-title-pattern` | string | 井字棋游戏：创建房间 Issue 标题正则 | "^play\\s+tic[-\_]?tac[-\_]?toe" |
| `ttt-label-prefix`        | string | 井字棋游戏：issue 标签名称前缀      | "game-ttt-room-"                 |
