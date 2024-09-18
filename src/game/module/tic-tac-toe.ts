import * as github from '@actions/github';
import { Game, PayloadIssue } from '../game';
import * as issue_api from '../../api/issue';
import {
  ChessEmoji, SizeArray, SizeArrayGroup,
  Coordinates, CoordinatesWithOrigin, chess_emojis
} from '../chess';
import { ReplyCommentError } from '../../error';

interface ChessPlayer {
  login: string;
  html_url: string;
  chess_emoji: ChessEmoji;
}

interface ChessStep {
  login: string;
  coordinates: CoordinatesWithOrigin;
  comment_id: number;
  comment_url: string;
}

interface ChessMeta {
  player: SizeArray<ChessPlayer | null, 2>;
  data: SizeArrayGroup<string | null, 3, 3>;
  steps: ChessStep[];
  status: 'Empty' | 'Waiting' | 'Playing' | 'End';
  winner: ChessPlayer | null | 'tie';
}

export class TicTacToeGame extends Game {

  protected readonly win_coordinates_map: SizeArray<SizeArray<Coordinates, 3>, 8> = [
    // 横向
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }],

    // 纵向
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],

    // 斜向
    [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
    [{ x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 0 }],
  ];

  protected createInitChessMeta(): ChessMeta {
    return {
      player: [null, null],
      data: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
      steps: [],
      status: 'Empty',
      winner: null,
    };
  }

  protected getChessResult(meta: ChessMeta): string {
    return meta.winner
      ? meta.winner === 'tie'
        ? 'Tie'
        : `${meta.winner.login} won`
      : '';
  }

  protected getNextPlayer(meta: ChessMeta): ChessPlayer | null {
    const players = this.getPlayers(meta);
    if (players.length < 2 || meta.steps.length < 2) {
      return null;
    }
    const last_step = meta.steps[meta.steps.length - 1];
    const player = players.pop()!;
    return player.login === last_step.login
      ? players[0]
      : player;
  }


  protected createGameBody(meta: ChessMeta): string {
    const chess_emoji_map: Map<string, ChessEmoji> = new Map<string, ChessEmoji>();
    this.getPlayers(meta).forEach(player => {
      chess_emoji_map.set(player.login, player.chess_emoji);
    });

    function getEmoji(x: number, y: number): ChessEmoji | '' {
      const login = meta.data[x][y] || '';
      return chess_emoji_map.get(login) || '';
    }

    const player_line = meta.player.map(player =>
      player
        ? `[${player.login}](${player.html_url}) ${player.chess_emoji}`
        : '_'
    ).join(' vs ');

    const lines: string[] = [
      `<!-- ${JSON.stringify(meta)} -->`,
      `# Welcome to the ${this.options.name} game!`,
      'Submit your chess piece coordinates in the comments of this issue to start the game.',
      '*e.g. `chess:1:a` or `chess:a:1` means the first row and first column.*',
      `\n\`Status\`: ${meta.status}`,
      `\`Player\`: ${player_line}`,
    ];

    const next_player = this.getNextPlayer(meta);
    if (next_player) {
      lines.push(`\`Next\`: ${next_player ? `[${next_player.login}](${next_player.html_url}) ${next_player.chess_emoji}` : ''}`);
    }

    lines.push(
      '\n|+|a|b|c|',
      '|:--:|:--:|:--:|:--:|',
      `|1|${getEmoji(0, 0)}|${getEmoji(0, 1)}|${getEmoji(0, 2)}|`,
      `|2|${getEmoji(1, 0)}|${getEmoji(1, 1)}|${getEmoji(1, 2)}|`,
      `|3|${getEmoji(2, 0)}|${getEmoji(2, 1)}|${getEmoji(2, 2)}|`
    );

    if (meta.steps.length > 0) {
      lines.push(
        '\n`Steps`:',
        ...meta.steps.map(step => {
          const { login, coordinates, comment_url } = step;
          const emoji = chess_emoji_map.get(login);
          return `+ ${emoji} [${coordinates.ox}:${coordinates.oy} ${login}](${comment_url})`;
        })
      );
    }

    const result_line = this.getChessResult(meta);
    if (result_line !== '') {
      lines.push(`\n\`Result\`: ${result_line}`);
    }

    return lines.join('\n');
  }

  protected getPlayers(meta: ChessMeta): ChessPlayer[] {
    return meta.player.filter(player => player) as ChessPlayer[];
  }

  protected getIssueTitle(meta: ChessMeta): string {
    const title_blocks: string[] = [
      `\`${this.options.name}\``,
      `\`${meta.status}\``,
    ];

    const players = this.getPlayers(meta);
    if (players.length === 2) {
      title_blocks.push(`\`${players[0]!.login} vs ${players[1]!.login}\``);
      if (meta.winner) {
        title_blocks.push(`\`${this.getChessResult(meta)}\``);
      }
    }

    return `:chess_pawn: ${title_blocks.join(' ')}`;
  }

  protected getChessMeta(): ChessMeta | null {
    const { body } = github.context.payload.comment!;
    if (!body) {
      return null;
    }
    const meta_match = body.match(/<!--\s*(\{.*\})\s*-->/);
    if (!meta_match) {
      throw new Error('Invalid issue body');
    }
    return JSON.parse(meta_match[1]) as ChessMeta;
  }

  protected getChessPieceCoordinates(comment_body: string): CoordinatesWithOrigin | null {
    const chess_regex = /^chess:(([1-3]:[a-c])|([a-c]:[1-3]))/ig;
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

  protected getChessWinner(meta: ChessMeta): ChessMeta['winner'] {
    for (const [c1, c2, c3] of this.win_coordinates_map) {
      const [l1, l2, l3] = [meta.data[c1.x][c1.y], meta.data[c2.x][c2.y], meta.data[c3.x][c3.y]];
      if (l1 && l1 === l2 && l2 === l3) {
        return meta.player.find(player => player?.login === l1) || null;
      }
    }
    const empty_cells = meta.data.flat().filter(cell => !cell);
    return empty_cells.length === 0 ? 'tie' : null;
  }

  protected getRandomChessEmoji(meta: ChessMeta): ChessEmoji {
    const used_emojis = this.getPlayers(meta).map(player => player.chess_emoji);
    const unused_emojis = chess_emojis.filter(emoji => !used_emojis.includes(emoji));
    return unused_emojis[Math.floor(Math.random() * unused_emojis.length)];
  }

  protected async initGameRooms(): Promise<issue_api.Issue> {
    const meta = this.createInitChessMeta();
    return await issue_api.createIssue({
      title: this.getIssueTitle(meta),
      body: this.createGameBody(meta),
      labels: [this.options.label]
    });
  }

  private throwReplyCommentError(issue_number: number, msg: string): never {
    throw new ReplyCommentError({
      msg,
      issue_number,
      msg_type: 'error',
      comment: github.context.payload.comment
    });
  }

  protected async handleChessPieceMove(issue_number: number, meta: ChessMeta): Promise<void> {
    const {
      id, html_url, body,
      user: { login, html_url: comment_html_url }
    } = github.context.payload.comment!;

    const coordinates = this.getChessPieceCoordinates(body);
    if (!coordinates) {
      return;
    }

    const player_count = this.getPlayers(meta).length;
    let player_index = meta.player.findIndex(player => player?.login === login);

    if (player_count < 2 && player_index === -1) {
      player_index = player_count;
      meta.player[player_index] = {
        login: login,
        html_url: comment_html_url,
        chess_emoji: this.getRandomChessEmoji(meta)
      };
    }

    if (player_index === -1) {
      this.throwReplyCommentError(issue_number, 'Game room is full, cannot join!');
    }

    const last_step = meta.steps[meta.steps.length - 1];
    if (last_step && last_step.login === login) {
      this.throwReplyCommentError(
        issue_number,
        `You have already placed chess piece at ${last_step.coordinates.ox},${last_step.coordinates.oy}, please wait for your opponent's move.`
      );
    }

    const before_login = meta.data[coordinates.x][coordinates.y];
    if (before_login) {
      this.throwReplyCommentError(
        issue_number,
        `${coordinates.ox},${coordinates.oy} already has a chess piece by ${before_login}, please choose another position.`
      );
    }

    meta.steps.push({
      login: login,
      coordinates,
      comment_id: id,
      comment_url: html_url
    });

    meta.data[coordinates.x][coordinates.y] = meta.player[player_index]!.login;
    meta.winner = this.getChessWinner(meta);
  }

  public async handleIssueCreatedEvent({ title, number: issue_number }: PayloadIssue): Promise<void> {
    const title_match = title.match(new RegExp(this.options.init_pattern, 'ig'));
    if (title_match) {
      const game_issue = await this.initGameRooms();
      await issue_api.createComment({
        issue_number,
        body: `Game room created: [${game_issue.title}](${game_issue.html_url}) click to join.`
      });
      await issue_api.updateIssue({ issue_number, state: 'closed' });
    }
  }

  public async handleIssueCommentCreatedEvent({ body, number: issue_number }: PayloadIssue): Promise<void> {
    if (!body) {
      return;
    }

    const meta = this.getChessMeta();
    if (!meta) {
      return;
    }

    if (meta.status === 'End') {
      this.throwReplyCommentError(issue_number, 'Game has ended!');
    }

    // handle chess piece move
    await this.handleChessPieceMove(issue_number, meta);

    const player_count = this.getPlayers(meta).length;
    if (player_count === 0) {
      meta.status = 'Empty';
    } else if (player_count <= 1) {
      meta.status = 'Waiting';
    } else if (player_count === 2) {
      meta.status = 'Playing';
    }
    if (meta.winner) {
      meta.status = 'End';
      const call_players = this.getPlayers(meta).map(player => '@' + player.login).join(' ');
      await issue_api.createComment({
        issue_number,
        body: `${call_players}: ${this.getChessResult(meta)}\nGame over!`
      });
    }

    await issue_api.updateIssue({
      title: this.getIssueTitle(meta),
      issue_number,
      body: this.createGameBody(meta),
      state: meta.winner ? 'closed' : 'open'
    });
  }

}