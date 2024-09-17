# Issue Game

**This is an Action project that allows you to play a game on GitHub Issue**

[中文](README_zh.md) | [English](README.md)

## 🎮 Game play

+ [Tic-Tac-Toe](https://github.com/xiaohuohumax/issue-game/issues/new?title=Play%20Tic-Tac-Toe&body=Do%20not%20modify%20the%20Issue%20title,%20just%20submit%20it%20directly. 'Click here to create a room and start the game')

## 📖 Usage

Create a file named `.github/workflows/Issue-game.yml` in your GitHub repository and add the following content:

> [!Note]
> Please ensure that the Token has read and write permissions for Issues and Labels (Settings => Actions => General).

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

## ⚙ Parameters

| Name                  | Type   | Description                                           | Default Value                            |
| --------------------- | ------ | ----------------------------------------------------- | ---------------------------------------- |
| token                 | string | GitHub token for authentication                       | {{ github.token }}                       |
| ttt-init-pattern      | string | Tic-Tac-Toe game: regex for creating room Issue title | "^play\s+tic[-_]tac[-_]toe"              |
| ttt-label-name        | string | Tic-Tac-Toe game: issue label name                    | "game-ttt-room"                          |
| ttt-label-color       | string | Tic-Tac-Toe game: issue label color                   | "#009527"                                |
| ttt-label-description | string | Tic-Tac-Toe game: issue label description             | "This Issue is a Tic-Tac-Toe game room." |

