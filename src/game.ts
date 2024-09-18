import * as github from '@actions/github';
import { IssueCommentCreatedEvent, IssuesOpenedEvent } from '@octokit/webhooks-definitions/schema';

export interface Meta { }

export interface GameOptions {
  name: string;
  description: string;
}

export interface RoomOptions extends GameOptions { }

export abstract class Room<M extends Meta = Meta, O extends RoomOptions = RoomOptions> {
  constructor(protected meta: M, protected options: O) { }
  public abstract getIssueTitle(): string;
  public abstract getIssueBody(): string;
}

export abstract class Game<T extends GameOptions = GameOptions> {
  constructor(protected options: T) { }
  public abstract handleIssueOpenedEvent(payload: IssuesOpenedEvent): Promise<void>;
  public abstract handleIssueCommentCreatedEvent(payload: IssueCommentCreatedEvent): Promise<void>;
}

export interface GameManagerOptions { }

export class GameManager {
  protected games: Game[] = [];
  constructor(protected options: GameManagerOptions) { }

  public addGame(game: Game) {
    this.games.push(game);
  }

  public async handleAction() {
    const payload = github.context.payload;
    const event_name = github.context.eventName;
    if (event_name === 'issues' && payload.action === 'opened') {
      for (const game of this.games) {
        await game.handleIssueOpenedEvent(payload as IssuesOpenedEvent);
      }
    } else if (event_name === 'issue_comment' && !payload.pull_request) {
      for (const game of this.games) {
        await game.handleIssueCommentCreatedEvent(payload as IssueCommentCreatedEvent);
      }
    }
  }
}