import * as github from '@actions/github';
import { WebhookPayload } from '@actions/github/lib/interfaces';

export interface GameOptions {
  name: string;
  label: {
    name: string;
    description?: string | null;
    color?: string | null;
  };
  init_pattern: string;
}

export type PayloadIssue = Required<WebhookPayload>['issue'];

export abstract class Game {
  constructor(public options: GameOptions) { }
  abstract handleIssueCreatedEvent(issue: PayloadIssue): Promise<void>;
  abstract handleIssueCommentCreatedEvent(issue: PayloadIssue): Promise<void>;
}


export interface GameManagerOptions { }

export class GameManager {
  games: Game[] = [];
  constructor(public options: GameManagerOptions) { }

  injectGames(games: Game[]) {
    this.games = this.games.concat(games);
  }

  async handleAction() {
    const eventName = github.context.eventName;
    const issue = github.context.payload.issue;
    if (!issue) {
      return;
    }
    if (eventName === 'issue_comment' && !github.context.payload.pull_request) {
      const labels = issue.labels.map((label: { name: string }) => label.name);
      for (const game of this.games) {
        if (labels.includes(game.options.label.name)) {
          await game.handleIssueCommentCreatedEvent(issue);
        }
      }
    } else if (eventName === 'issues' && github.context.payload.action === 'opened') {
      for (const game of this.games) {
        await game.handleIssueCreatedEvent(issue);
      }
    }
  }

}