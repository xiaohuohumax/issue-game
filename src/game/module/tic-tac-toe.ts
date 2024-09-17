import * as github from '@actions/github';
import * as core from '@actions/core';
import { Game } from '../game';
import * as issue_api from '../../api/issue';

type ChessEmoji = ':black_circle:'
  | ':white_circle:'
  | ':brown_circle:'
  | ':purple_circle:'
  | ':green_circle:'
  | ':yellow_circle:'
  | ':orange_circle:'
  | ':red_circle:';

const chess_emojis: ChessEmoji[] = [
  ':black_circle:',
  ':white_circle:',
  ':brown_circle:',
  ':purple_circle:',
  ':green_circle:',
  ':yellow_circle:',
  ':orange_circle:',
  ':red_circle:'
];

type SizeArray<T, S extends number> = Array<T> & { length: S };

type SizeArrayGroup<T, X extends number, Y extends number> = SizeArray<SizeArray<T, X>, Y>;

interface ChessPlayer {
  login: string;
  html_url: string;
  chess_emoji: ChessEmoji;
}

interface Coordinates {
  x: number;
  y: number;
}

type CoordinatesWithOrigin = Coordinates & {
  ox: string;
  oy: string;
}

interface ChessStep {
  login: string;
  coordinates: CoordinatesWithOrigin;
  issue_comment_id: number;
  issue_comment_url: string;
}

interface ChessMeta {
  player: SizeArray<ChessPlayer | null, 2>;
  data: SizeArrayGroup<string | null, 3, 3>;
  steps: ChessStep[];
  status: 'Empty' | 'Waiting' | 'Playing' | 'End';
  winner: ChessPlayer | null | 'tie';
}

export class TicTacToeGame extends Game {

  private readonly win_coordinates_map: SizeArray<SizeArray<Coordinates, 3>, 8> = [
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

  private createInitChessMeta(): ChessMeta {
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

  private getChessResult(meta: ChessMeta): string {
    return meta.winner
      ? meta.winner === 'tie'
        ? 'Tie'
        : `${meta.winner.login} won`
      : '';
  }

  private getNextPlayer(meta: ChessMeta): ChessPlayer | null {
    if (meta.steps.length < 2) {
      return null;
    }
    const last_step = meta.steps[meta.steps.length - 1];
    const last_player = meta.player.find(player => player?.login === last_step.login)!;
    const next_player_index = (meta.player.indexOf(last_player) + 1) % meta.player.length;
    return meta.player[next_player_index];
  }

  private createGameBody(meta: ChessMeta): string {
    interface ChessEmojiMap {
      [login: string]: ChessEmoji;
    }

    const chess_emojis: ChessEmojiMap = meta.player
      .filter(player => player)
      .reduce((acc, player) => {
        acc[player!.login] = player!.chess_emoji;
        return acc;
      }, {} as ChessEmojiMap);

    function getEmoji(x: number, y: number): ChessEmoji | '' {
      const login = meta.data[x][y];
      if (!login) {
        return '';
      }
      return chess_emojis[login];
    }

    const player_line = meta.player.map(player =>
      player
        ? `[${player.login}](${player.html_url}) ${player.chess_emoji}`
        : '_'
    ).join(' vs ');

    const next_player = this.getNextPlayer(meta);

    const lines: string[] = [
      `<!-- ${JSON.stringify(meta)} -->`,
      `# Welcome to the ${this.options.name} game!`,
      'Submit your chess piece coordinates in the comments of this issue to start the game.',
      '*e.g. `chess:1:a` or `chess:a:1` means the first row and first column.*',
      '',
      `\`Status\`: ${meta.status}`,
      `\`Player\`: ${player_line}`,
      `\`Next\`: ${next_player ? `[${next_player.login}](${next_player.html_url}) ${next_player.chess_emoji}` : ''}`,
      '',
      '|+|a|b|c|',
      '|:--:|:--:|:--:|:--:|',
      `|1|${getEmoji(0, 0)}|${getEmoji(0, 1)}|${getEmoji(0, 2)}|`,
      `|2|${getEmoji(1, 0)}|${getEmoji(1, 1)}|${getEmoji(1, 2)}|`,
      `|3|${getEmoji(2, 0)}|${getEmoji(2, 1)}|${getEmoji(2, 2)}|`,
      '',
      '`Steps`:',
      ...meta.steps.map(step => {
        const { login, coordinates } = step;
        const emoji = chess_emojis[login];
        return `+ ${emoji} [${coordinates.ox}:${coordinates.oy} ${step.login}](${step.issue_comment_url})`;
      }),
      '',
      `\`Result\`: ${this.getChessResult(meta)}`,
    ];

    return lines.join('\n');
  }

  private getIssueTitle(meta: ChessMeta): string {
    const title_blocks: string[] = [
      `\`${this.options.name}\``,
      `\`${meta.status}\``,
    ];

    const players = meta.player.filter(player => player);
    if (players.length === 2) {
      title_blocks.push(`\`${players[0]!.login} vs ${players[1]!.login}\``);
      if (meta.winner) {
        title_blocks.push(`\`${this.getChessResult(meta)}\``);
      }
    }

    return `:chess_pawn: ${title_blocks.join(' ')}`;
  }

  private getChessMeta(issue_body: string): ChessMeta {
    const meta_match = issue_body.match(/<!--\s*(\{.*\})\s*-->/);
    if (!meta_match) {
      throw new Error('Invalid issue body');
    }
    const meta_str = meta_match[1];
    const meta = JSON.parse(meta_str) as ChessMeta;
    return meta;
  }

  private getChessPieceCoordinates(comment_body: string): CoordinatesWithOrigin | null {
    const chess_regex = /^chess:(([1-3]:[a-c])|([a-c]:[1-3]))/ig;
    const chess_match = chess_regex.exec(comment_body);
    const row_letters = ['a', 'b', 'c'];
    if (chess_match) {
      const [x, y] = chess_match[1].toLocaleLowerCase().split(':');

      const int_x = parseInt(x, 10);
      const int_y = parseInt(y, 10);
      if (!isNaN(int_x) && isNaN(int_y)) {
        return { x: int_x - 1, y: row_letters.indexOf(y), ox: x, oy: y };
      } else {
        return { x: int_y - 1, y: row_letters.indexOf(x), ox: y, oy: x };
      }
    }
    return null;
  }

  private getChessWinner(meta: ChessMeta): ChessMeta['winner'] {
    for (const win of this.win_coordinates_map) {
      const [x, y, z] = win;
      const [a, b, c] = [meta.data[x.x][x.y], meta.data[y.x][y.y], meta.data[z.x][z.y]];
      if (a && a === b && b === c) {
        return meta.player.find(player => player?.login === a) || null;
      }
    }
    const all_filled = meta.data.every(row => row.every(cell => cell));
    if (all_filled) {
      return 'tie';
    }
    return null;
  }

  private loadRandomChessEmoji(meta: ChessMeta): ChessEmoji {
    const used_emojis = meta.player.filter(player => player).map(player => player!.chess_emoji);
    const unused_emojis = chess_emojis.filter(emoji => !used_emojis.includes(emoji));
    return unused_emojis[Math.floor(Math.random() * unused_emojis.length)];
  }

  private async initGameRooms(): Promise<issue_api.Issue> {
    const meta = this.createInitChessMeta();
    const params = {
      title: this.getIssueTitle(meta),
      body: this.createGameBody(meta),
      labels: [this.options.room_label]
    };
    return await issue_api.createIssue(params);
  }

  async handleIssueCreatedEvent(): Promise<void> {
    const { title, number: issue_number } = github.context.payload.issue!;

    const title_match = title.match(new RegExp(this.options.init_pattern, 'ig'));
    if (!title_match) {
      return;
    }

    const game_issue = await this.initGameRooms();

    await issue_api.createComment({
      issue_number,
      body: `Game room created: [${game_issue.title}](${game_issue.html_url}) click to join.`
    });

    await issue_api.updateIssue({
      issue_number,
      state: 'closed'
    });
  }

  async handleIssueCommentCreatedEvent(): Promise<void> {
    const { body, number: issue_number } = github.context.payload.issue!;
    if (!body) {
      return;
    }

    const { id: comment_id,
      html_url: comment_url,
      body: comment_body,
      user: { login: comment_user_login, html_url: comment_html_url }
    } = github.context.payload.comment!;


    if (!comment_body) {
      return;
    }

    async function replyWarningMessage(message: string) {
      const msg = [
        `@${comment_user_login} Reply: [${comment_id}](${comment_url})`,
        '',
        (comment_body as string).split('\n').map(line => `> ${line}`).join('\n'),
        '',
        `Error: *${message}*`,
      ].join('\n');
      core.warning(msg);
      await issue_api.createComment({
        issue_number,
        body: msg
      });
    }

    const meta = this.getChessMeta(body);

    if (meta.status === 'End') {
      return await replyWarningMessage('Game has ended!');
    }

    const coordinates = this.getChessPieceCoordinates(comment_body);
    if (coordinates) {
      const player_count = meta.player.filter(player => player).length;
      let player_index = meta.player.findIndex(player => player?.login === comment_user_login);

      if (player_count < 2 && player_index === -1) {
        player_index = player_count;
        meta.player[player_index] = {
          login: comment_user_login,
          html_url: comment_html_url,
          chess_emoji: this.loadRandomChessEmoji(meta)
        };
      }

      if (player_index === -1) {
        return await replyWarningMessage('Game room is full, cannot join!');
      }

      const last_step = meta.steps[meta.steps.length - 1];

      if (last_step && last_step.login === comment_user_login) {
        return await replyWarningMessage(`You have already placed chess piece at ${last_step.coordinates.ox},${last_step.coordinates.oy}, please wait for your opponent's move.`);
      }

      meta.steps.push({
        login: comment_user_login,
        coordinates,
        issue_comment_id: comment_id,
        issue_comment_url: comment_url
      });

      const player = meta.player[player_index]!;

      const before_login = meta.data[coordinates.x][coordinates.y];
      if (before_login) {
        return await replyWarningMessage(`${coordinates.ox},${coordinates.oy} already has a chess piece by ${before_login}, please choose another position.`);
      }

      meta.data[coordinates.x][coordinates.y] = player.login;

      const winner = this.getChessWinner(meta);
      if (winner) {
        meta.winner = winner;
      }
    }

    const player_count = meta.player.filter(player => player).length;
    if (player_count === 0) {
      meta.status = 'Empty';
    } else if (player_count <= 1) {
      meta.status = 'Waiting';
    } else if (player_count === 2) {
      meta.status = 'Playing';
    }
    if (meta.winner) {
      meta.status = 'End';
      await issue_api.createComment({
        issue_number,
        body: `${meta.player.map(player => `@${player?.login}`).join(' ')}: ${this.getChessResult(meta)}\nGame over!`
      });
    }

    await issue_api.updateIssue({
      title: this.getIssueTitle(meta),
      issue_number: issue_number,
      body: this.createGameBody(meta),
      state: meta.winner ? 'closed' : 'open'
    });
  }

}