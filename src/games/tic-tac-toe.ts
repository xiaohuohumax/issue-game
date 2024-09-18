import {
  IssueCommentCreatedEvent, IssuesOpenedEvent
} from '@octokit/webhooks-definitions/schema';
import { Meta, Game, Room, GameOptions, RoomOptions } from '../game';
import {
  ArrayTable, ChessColor, Coordinates,
  CoordinatesWithOrigin, CHESS_COLORS, chessColorToEmoji
} from '../chess';
import issue_api from '../api/issue';
import { ReplyMessageError, catchError } from '../error';

type MetaStatus = 'init' | 'waiting' | 'playing' | 'end';

interface MetaPlayer {
  login: string;
  url: string;
  chess_color: ChessColor;
}

type MetaData = string | null;

interface MetaStep {
  login: string;
  coordinates: CoordinatesWithOrigin;
  comment: {
    id: number;
    url: string;
  }
}

type MetaWinner = MetaPlayer | null | 'tie';

interface TicTacToeMeta extends Meta {
  status: MetaStatus;
  players: MetaPlayer[];
  data: ArrayTable<MetaData, 3, 3>;
  steps: MetaStep[];
  winner: MetaWinner;
  create_time: string;
  update_time: string;
}

function throwReplyMessageError(issue_number: number, comment: IssueCommentCreatedEvent['comment'], message: string): never {
  throw new ReplyMessageError({
    message,
    issue_number,
    reply_type: 'Error',
    target: {
      login: comment.user.login,
      name: 'issue-comment: ' + comment.id,
      url: comment.html_url,
      body: comment.body
    }
  });
}

const WIN_MAP: ArrayTable<Coordinates, 3, 8> = [
  // rows
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
  [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }],

  // columns
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
  [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],

  // diagonals
  [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
  [{ x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 0 }],
];

export interface TicTacToeRoomOptions extends RoomOptions { }

export class TicTacToeRoom extends Room<TicTacToeMeta, TicTacToeRoomOptions> {

  public static createEmptyRoom(options: TicTacToeRoomOptions, default_player?: MetaPlayer): TicTacToeRoom {
    const meta: TicTacToeMeta = {
      status: 'init',
      players: default_player ? [default_player] : [],
      data: [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ],
      steps: [],
      winner: null,
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };
    return new TicTacToeRoom(meta, options);
  }

  public static createRoomByIssueBody(options: TicTacToeRoomOptions, body?: string): TicTacToeRoom {
    if (body) {
      const meta_match = body.match(/<!--\s*(\{.*\})\s*-->/);
      if (meta_match) {
        return new TicTacToeRoom(JSON.parse(meta_match[1]) as TicTacToeMeta, options);
      }
    }
    throw new Error('Game meta data not found.');
  }

  public static getRandomChessColor(excludes: ChessColor[] = []): ChessColor {
    const all_chess_colors = CHESS_COLORS
      .filter(color => !excludes.includes(color));
    const random_index = Math.floor(Math.random() * CHESS_COLORS.length);
    return all_chess_colors[random_index];
  }

  public static getCoordinatesByCommentBody(comment_body: string): CoordinatesWithOrigin | null {
    const chess_regex = /^chess:(([1-3]:[a-c])|([a-c]:[1-3]))/igm;
    const chess_match = chess_regex.exec(comment_body);
    if (chess_match) {
      const row_letters = ['a', 'b', 'c'];
      let [x, y] = chess_match[1].toLocaleLowerCase().split(':');

      let int_x = parseInt(x, 10), int_y = parseInt(y, 10);
      if (isNaN(int_x) && !isNaN(int_y)) {
        [int_x, int_y] = [int_y, int_x];
        [x, y] = [y, x];
      }

      return { x: int_x - 1, y: row_letters.indexOf(y), ox: x, oy: y };
    }
    return null;
  }

  public getWinnerPrintInfo(): string {
    return this.meta.winner
      ? this.meta.winner === 'tie'
        ? 'Tie'
        : `${this.meta.winner.login} wins`
      : '';
  }

  public getNextPlayer(): MetaPlayer | null {
    const { players, steps } = this.meta;
    if (players.length < 2) {
      return null;
    }
    const last_step = steps[steps.length - 1];
    if (last_step) {
      const last_player_index = players.findIndex(player => player.login === last_step.login);
      return players[(last_player_index + 1) % players.length];
    } else {
      return null;
    }
  }

  public getLoginChessColorMap(): Map<string, ChessColor> {
    const chess_color_map = new Map<string, ChessColor>();
    this.meta.players.forEach(p => chess_color_map.set(p.login, p.chess_color));
    return chess_color_map;
  }

  public getChessColorTable(): ArrayTable<ChessColor | '', 3, 3> {
    const chess_color_map = this.getLoginChessColorMap();
    return this.meta.data.map(row => {
      return row.map(col => {
        if (col) {
          const chess_color = chess_color_map.get(col);
          if (chess_color) {
            return chessColorToEmoji(chess_color);
          }
        }
        return '';
      });
    }) as ArrayTable<ChessColor | '', 3, 3>;
  }

  public getIssueTitle(): string {
    const titles: string[] = [
      this.options.name,
      this.meta.status
    ];
    const players = this.meta.players;
    if (players.length == 2) {
      titles.push(players.map(player => player.login).join(' vs '));
      if (this.meta.winner) {
        titles.push(this.getWinnerPrintInfo());
      }
    }
    return `:chess_pawn: ${titles.map(t => `\`${t}\``).join(' ')}`;
  }

  public getIssueBody(): string {
    const player_line = this.meta.players
      .map(player => `[${player.login}](${player.url}) ${chessColorToEmoji(player.chess_color)}`)
      .join(' vs ');

    const body_lines: string[] = [
      `<!-- ${JSON.stringify(this.meta)} -->`,
      `# Welcome to the ${this.options.name} game!`,
      '**Use the following commands in the comments of this issue to play the game:**',
      '- `chess:x:y` to place your chess piece at position x,y',
      '  _e.g. `chess:1:a` or `chess:a:1` means the first row and first column._',
      '- `color:color_name` to change your chess piece color, available colors:' + CHESS_COLORS.map(c => `\`${c}\``).join(', '),
      '  _e.g. `color:red` to change your chess piece to red color._',
      `\n\`Status\`: ${this.meta.status}`,
      `\`Player\`: ${player_line}`,
    ];

    const next_player = this.getNextPlayer();
    if (next_player) {
      const chess_emoji = chessColorToEmoji(next_player.chess_color);
      body_lines.push(`\`Next\`: [${next_player.login}](${next_player.url}) ${chess_emoji}`);
    }

    const table = this.getChessColorTable();
    body_lines.push(
      '\n|+|a|b|c|',
      '|:--:|:--:|:--:|:--:|',
      `|1|${table[0][0]}|${table[0][1]}|${table[0][2]}|`,
      `|2|${table[1][0]}|${table[1][1]}|${table[1][2]}|`,
      `|3|${table[2][0]}|${table[2][1]}|${table[2][2]}|`
    );

    if (this.meta.steps.length > 0) {
      const chess_color_map = this.getLoginChessColorMap();
      body_lines.push(
        '\n`Steps`:',
        ...this.meta.steps.map(step => {
          const { login, coordinates, comment: { url } } = step;
          const chess_emoji = chessColorToEmoji(chess_color_map.get(step.login));
          return `+ ${chess_emoji} [${coordinates.ox}:${coordinates.oy} ${login}](${url})`;
        })
      );
    }

    const winner_line = this.getWinnerPrintInfo();
    if (winner_line !== '') {
      body_lines.push(`\n\`Result\`: ${winner_line}`);
    }

    return body_lines.join('\n');
  }

  public getPlayerByLogin(login: string): MetaPlayer | null {
    return this.meta.players
      .find(player => player.login === login) || null;
  }

  public async updateWinner(): Promise<void> {
    const { data } = this.meta;
    for (const [c1, c2, c3] of WIN_MAP) {
      const [l1, l2, l3] = [data[c1.x][c1.y], data[c2.x][c2.y], data[c3.x][c3.y]];
      if (l1 && l1 === l2 && l2 === l3) {
        this.meta.winner = this.getPlayerByLogin(l1);
        return;
      }
    }
    const empty_cells = this.meta.data.flat().filter(cell => !cell);
    this.meta.winner = empty_cells.length === 0 ? 'tie' : null;
  }

  public async parseCoordinatesCommand(issue_number: number, comment: IssueCommentCreatedEvent['comment']): Promise<void> {
    const coordinates = TicTacToeRoom.getCoordinatesByCommentBody(comment.body);
    if (!coordinates) {
      return;
    }

    let player = this.getPlayerByLogin(comment.user.login);
    if (!player) {
      if (this.meta.players.length >= 2) {
        throwReplyMessageError(issue_number, comment, 'Game room is full, cannot join!');
      }
      const new_player: MetaPlayer = {
        login: comment.user.login,
        url: comment.user.html_url,
        chess_color: TicTacToeRoom.getRandomChessColor(this.meta.players.map(p => p.chess_color))
      };
      this.meta.players.push(new_player);
      player = new_player;
    }

    const last_step = this.meta.steps[this.meta.steps.length - 1];
    if (last_step && last_step.login === player.login) {
      throwReplyMessageError(
        issue_number, comment,
        `You have already placed chess piece at ${last_step.coordinates.ox},${last_step.coordinates.oy}, please wait for your opponent's move.`
      );
    }

    const before_login = this.meta.data[coordinates.x][coordinates.y];
    if (before_login) {
      throwReplyMessageError(
        issue_number, comment,
        `${coordinates.ox},${coordinates.oy} already has a chess piece by ${before_login}, please choose another position.`
      );
    }

    this.meta.data[coordinates.x][coordinates.y] = player.login;
    this.meta.steps.push({
      login: player.login,
      coordinates,
      comment: {
        id: comment.id,
        url: comment.html_url
      }
    });
  }

  public async parseColorCommand(issue_number: number, comment: IssueCommentCreatedEvent['comment']): Promise<void> {
    const color_regex = new RegExp(`^color:(${CHESS_COLORS.join('|')})$`, 'igm');
    const color_match = color_regex.exec(comment.body);
    if (!color_match) {
      return;
    }

    const player = this.getPlayerByLogin(comment.user.login);
    if (!player) {
      throwReplyMessageError(
        issue_number, comment,
        'You are not in the game room, cannot change your color!');
    }

    const color = color_match[1] as ChessColor;
    if (CHESS_COLORS.includes(color)) {
      const player_chess_colors = this.meta.players.map(p => p.chess_color);
      if (player_chess_colors.includes(color)) {
        const eg = CHESS_COLORS.map(c => `\`${c}\``).join(', ');
        throwReplyMessageError(
          issue_number, comment,
          `\`${color}\` chess piece has been used, please choose another color.\ne.g. ${eg}`);
      }
      player.chess_color = color;
    }
  }

  public async updateStatus(issue_number: number): Promise<void> {
    const player_count = this.meta.players.length;
    if (player_count === 0) {
      this.meta.status = 'init';
    } else if (player_count === 1) {
      this.meta.status = 'waiting';
    } else if (player_count === 2) {
      this.meta.status = 'playing';
    }
    if (this.meta.winner) {
      this.meta.status = 'end';
      const call_all_players = this.meta.players.map(player => '@' + player.login).join(' ');
      await issue_api.createComment({
        issue_number,
        body: `${call_all_players} Game has ended! ${this.getWinnerPrintInfo()}`
      });
    }
  }

  public hasGameEnded(): boolean {
    return this.meta.status === 'end';
  }

  public async updateRoom(issue_number: number): Promise<void> {
    this.meta.update_time = new Date().toISOString();
    await issue_api.updateIssue({
      issue_number,
      title: this.getIssueTitle(),
      body: this.getIssueBody(),
      state: this.hasGameEnded() ? 'closed' : 'open'
    });
  }

}

export interface TicTacToeGameOptions extends GameOptions {
  label: string;
  issue_title_pattern: string;
}

export class TicTacToeGame extends Game<TicTacToeGameOptions> {

  public async handleIssueOpenedEvent(payload: IssuesOpenedEvent): Promise<void> {
    const { title, user, number: issue_number } = payload.issue;
    const title_match = title.match(new RegExp(this.options.issue_title_pattern, 'ig'));
    if (!title_match) {
      return;
    }

    const default_player: MetaPlayer = {
      login: user.login,
      url: user.html_url,
      chess_color: TicTacToeRoom.getRandomChessColor()
    };
    const room = TicTacToeRoom.createEmptyRoom(this.options, default_player);

    const game_issue = await issue_api.createIssue({
      title: room.getIssueTitle(),
      body: room.getIssueBody(),
      labels: [this.options.label]
    });

    await issue_api.createComment({
      issue_number,
      body: `Game room created: [${game_issue.title}](${game_issue.html_url}) click to join.`
    });

    await issue_api.updateIssue({ issue_number, state: 'closed' });
  }

  public async handleIssueCommentCreatedEvent(payload: IssueCommentCreatedEvent): Promise<void> {
    const { issue: { number: issue_number, body: issue_body, labels }, comment } = payload;
    const labels_names = labels.map(l => l.name);
    if (!labels_names.includes(this.options.label)) {
      return;
    }

    const room = TicTacToeRoom.createRoomByIssueBody(this.options, issue_body);
    if (room.hasGameEnded()) {
      throwReplyMessageError(issue_number, comment, 'Game has ended!');
    }

    await room.parseCoordinatesCommand(issue_number, comment).catch(catchError);
    await room.parseColorCommand(issue_number, comment).catch(catchError);

    await room.updateWinner();
    await room.updateStatus(issue_number);
    await room.updateRoom(issue_number);
  }

}