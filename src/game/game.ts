import * as github from '@actions/github';

export interface GameOptions {
  name: string;
  room_label: {
    name: string;
    description?: string | null;
    color?: string | null;
  };
  init_pattern: string;
}

export abstract class Game {
  constructor(public options: GameOptions) { }
  abstract handleIssueCreatedEvent(): Promise<void>;
  abstract handleIssueCommentCreatedEvent(): Promise<void>;
}

export interface GameManagerOptions { }

export class GameManager {
  games: Game[] = [];
  constructor(public options: GameManagerOptions) { }

  injectGames(games: Game[]) {
    this.games = this.games.concat(games);
  }

  async handleIssueCreatedEvent() {
    for (const game of this.games) {
      await game.handleIssueCreatedEvent();
    }
  }

  async handleIssueCommentCreatedEvent() {
    const issue = github.context.payload.issue;
    if (!issue) {
      return;
    }

    const labels = issue.labels.map((label: { name: string }) => label.name);
    for (const game of this.games) {
      if (labels.includes(game.options.room_label.name)) {
        await game.handleIssueCommentCreatedEvent();
      }
    }
  }
}