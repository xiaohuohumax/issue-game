import {
  IssueCommentCreatedEvent, IssuesOpenedEvent
} from '@octokit/webhooks-definitions/schema';
import { Meta, Game, Room, GameOptions, RoomOptions, RoomCommands, RoomCommandsParser } from '../game';
import {
  ArrayTable, ChessColor, Coordinates,
  CoordinatesWithOrigin, CHESS_COLORS, chessColorToEmoji
} from '../chess';
import issue_api from '../api/issue';
import { ReplyMessageError, catchError } from '../error';
import { ReplyMessageParams, replyMessage } from '../reply';
import i18n, { LANGUAGES, Language, changeLanguage } from '../i18n';
import input from '../input';

type MetaStatus = 'init' | 'waiting' | 'playing' | 'end';

type MetaPlayer = {
  login: string;
  chess_color: ChessColor;
} & ({
  robot?: undefined
  url: string;
} | {
  robot: true;
  url?: undefined;
})

type MetaDataChessColor = ChessColor | null;

interface MetaStep {
  chess_color: ChessColor;
  coordinates: CoordinatesWithOrigin;
  comment?: {
    url: string;
  }
}

interface MetaCreator {
  login: string;
  url: string;
  issue_number: number;
  issue_url: string;
}

type MetaWinner = MetaPlayer | null | 'tie';

interface TicTacToeMeta extends Meta {
  language: Language | null;
  status: MetaStatus;
  players: MetaPlayer[];
  data: ArrayTable<MetaDataChessColor, 3, 3>;
  steps: MetaStep[];
  creator: MetaCreator;
  winner: MetaWinner;
  create_time: string;
  update_time: string;
}

interface RobotMove {
  score: number;
  coordinates?: Coordinates;
}

type CommandRobot = 'add' | 'remove';

const COMMAND_ROBOTS: CommandRobot[] = ['add', 'remove'];
const ROBOT_EMOJI: string = '🤖';
const ROBOT_LOGIN: string = 'robot';
const ROW_LETTERS: string[] = ['a', 'b', 'c', 'd', 'e'];

function getMessageParamsByComment(comment: IssueCommentCreatedEvent['comment'], message_params: ReplyMessageParams): ReplyMessageParams {
  return {
    ...message_params,
    target: {
      login: comment.user.login,
      name: 'issue-comment: ' + comment.id,
      url: comment.html_url,
      body: comment.body
    },
  };
}

function throwReplyMessageError(issue_number: number, comment: IssueCommentCreatedEvent['comment'], message: string): never {
  const message_params: ReplyMessageParams = getMessageParamsByComment(comment, {
    message,
    issue_number,
    message_type: 'Error',
  });
  throw new ReplyMessageError(message_params);
}

function coordinatesToCoordinatesWithOrigin(coordinates: Coordinates): CoordinatesWithOrigin {
  return {
    x: coordinates.x,
    y: coordinates.y,
    ox: coordinates.x + 1 + '',
    oy: ROW_LETTERS[coordinates.y]
  };
}

function getRandomChessColor(excludes: ChessColor[] = []): ChessColor {
  const all_chess_colors = CHESS_COLORS
    .filter(color => !excludes.includes(color));
  const random_index = Math.floor(Math.random() * CHESS_COLORS.length);
  return all_chess_colors[random_index % all_chess_colors.length];
}

export interface TicTacToeRoomOptions extends RoomOptions { }

export interface TicTacToeRoomCommands extends RoomCommands {
  chess?: CoordinatesWithOrigin;
  color?: ChessColor;
  language?: Language;
  robot?: CommandRobot;
}

export type TicTacToeRoomCommandsParser = RoomCommandsParser<Required<TicTacToeRoomCommands>>;

export class TicTacToeRoom extends Room<TicTacToeMeta, TicTacToeRoomOptions> {

  constructor(meta: TicTacToeMeta, options: TicTacToeRoomOptions) {
    super(meta, options);
    if (meta.language) {
      changeLanguage(meta.language);
    }
  }

  public static readonly WIN_MAP: ArrayTable<Coordinates, 3, 8> = [
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

  public static readonly COMMAND_PARSER_MAP: TicTacToeRoomCommandsParser = {
    chess: (value: string, origin: string) => {
      const match = value.match(/^(([1-3]:[a-c])|([a-c]:[1-3]))$/ig);
      if (!match) {
        throw new Error(i18n.t('games.ttt.command.chess.unmatched', {
          origin,
          value,
        }));
      }
      let [x, y] = match[0].toLocaleLowerCase().split(':');

      let int_x = parseInt(x, 10), int_y = parseInt(y, 10);
      if (isNaN(int_x) && !isNaN(int_y)) {
        [int_x, int_y] = [int_y, int_x];
        [x, y] = [y, x];
      }
      return { x: int_x - 1, y: ROW_LETTERS.indexOf(y), ox: x, oy: y };
    },
    color: (value: string, origin: string) => {
      if (!CHESS_COLORS.includes(value as ChessColor)) {
        throw new Error(i18n.t('games.ttt.command.color.invalid', {
          origin,
          value
        }));
      }
      return value as ChessColor;
    },
    language: (value: string, origin: string) => {
      if (!LANGUAGES.includes(value as Language)) {
        throw new Error(i18n.t('games.ttt.command.language.invalid', {
          origin,
          value
        }));
      }
      return value as Language;
    },
    robot: (value: string, origin: string) => {
      if (!COMMAND_ROBOTS.includes(value as CommandRobot)) {
        throw new Error(i18n.t('games.ttt.command.robot.invalid', {
          origin,
          value
        }));
      }
      return value as CommandRobot;
    }
  };

  public static async createEmptyRoom(options: TicTacToeRoomOptions, create_player: MetaPlayer, command: TicTacToeRoomCommands, issue: IssuesOpenedEvent['issue']): Promise<TicTacToeRoom> {
    if (command.color) {
      create_player.chess_color = command.color;
    }
    const meta: TicTacToeMeta = {
      language: command.language || null,
      status: 'init',
      players: [create_player],
      data: [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ],
      steps: [],
      creator: {
        login: issue.user.login,
        url: issue.user.html_url,
        issue_number: issue.number,
        issue_url: issue.html_url
      },
      winner: null,
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };
    const room = new TicTacToeRoom(meta, options);
    if (command.chess) {
      room.updateDataAndStep(command.chess, create_player, { url: issue.html_url });
    }
    if (command.robot === 'add') {
      const robot_player: MetaPlayer = TicTacToeRoom.createRobotPlayer([create_player.chess_color]);
      meta.players.push(robot_player);
      if (command.chess) {
        await room.robotMove();
      }
    }
    return room;
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

  public static parseCommands(command_body?: string): [TicTacToeRoomCommands, Error[]] {
    const commands: TicTacToeRoomCommands = {};
    const errors: Error[] = [];
    if (command_body) {
      const command_regex = /^(\w+):(.*)$/igm;
      for (const [origin, key, value] of command_body.matchAll(command_regex)) {
        const parser_key = key as keyof TicTacToeRoomCommandsParser;
        const parser = TicTacToeRoom.COMMAND_PARSER_MAP[parser_key];
        if (!parser) {
          // errors.push(new Error(i18n.t('games.ttt.command.unknown', { origin })));
          continue;
        }
        try {
          // @ts-expect-error ignore type error
          commands[parser_key] = parser(value.trim(), origin);
        } catch (error) {
          errors.push(error as Error);
        }
      }
    }
    return [commands, errors];
  }

  public static createRobotPlayer(excludes: ChessColor[]): MetaPlayer {
    return {
      login: ROBOT_LOGIN,
      chess_color: getRandomChessColor(excludes),
      robot: true,
    };
  }

  public getWinnerPrintInfo(): string {
    const winner = this.meta.winner;
    return winner
      ? winner === 'tie'
        ? i18n.t('games.ttt.room.winner.tie')
        : i18n.t('games.ttt.room.winner.win', {
          winner: winner.robot
            ? ROBOT_EMOJI + winner.login
            : winner.login
        })
      : '';
  }

  public getIssueTitle(): string {
    const room_title_func: { [key: string]: () => string } = {
      'name': () => i18n.t('games.ttt.name'),
      'state': () => this.meta.status,
      'vs': () => this.isRoomFull()
        ? this.meta.players
          .map(player => player.robot ? player.login + ROBOT_EMOJI : player.login)
          .join(' vs ')
        : '',
      'next': () => {
        const next_player = this.getNextPlayer();
        return next_player
          ? next_player.robot
            ? `${next_player.login} ${ROBOT_EMOJI}`
            : next_player.login
          : '';
      },
      'creator': () => this.meta.creator.login,
      'result': () => this.isGameEnded()
        ? this.getWinnerPrintInfo()
        : '',
      'winner': () => this.meta.winner && typeof this.meta.winner !== 'string'
        ? `${this.meta.winner.login} ${ROBOT_EMOJI}`
        : '',
    };

    const room_titles = [];
    top: for (let room_title_item of input.ttt_room_title.split('|')) {
      const matches = room_title_item.matchAll(/\{\w+\}/ig);
      for (const match of matches) {
        const func = room_title_func[match[0].slice(1, -1)];
        if (!func) {
          break top;
        }
        const replace_content = func();
        if (!replace_content || replace_content.trim() === '') {
          break top;
        }
        room_title_item = room_title_item.replaceAll(match[0], replace_content);
      }
      room_titles.push(room_title_item);
    }
    return room_titles.join('');
  }

  public getIssueBody(): string {
    const { players, creator, status, steps } = this.meta;

    const only_creator = `<span title="${i18n.t('games.ttt.room.body.only_creator_can_use')}">🚧</span>`;

    const player_line = players
      .map(player => player.robot
        ? `${player.login} ${ROBOT_EMOJI}${chessColorToEmoji(player.chess_color)}`
        : `[${player.login}](${player.url}) ${chessColorToEmoji(player.chess_color)}`
      )
      .join(' `vs` ');
    const colors_line = CHESS_COLORS.map(c => `\`${c}\``).join(' ');
    const languages_line = LANGUAGES.map(c => `\`${c}\``).join(' ');
    const creator_line = `[${creator.login}](${creator.url}) [#${creator.issue_number}](${creator.issue_url})`;

    const body_lines: string[] = [
      `<!-- ${JSON.stringify(this.meta)} -->`,
      `## ${i18n.t('games.ttt.room.body.welcome')}`,
      `**${i18n.t('games.ttt.room.body.play_game_by_command')}**`,
      `- ${i18n.t('games.ttt.room.body.chess_command_description')}`,
      `- ${i18n.t('games.ttt.room.body.color_command_description', { colors: colors_line })}`,
      `- ${only_creator}${i18n.t('games.ttt.room.body.language_command_description', { languages: languages_line })}`,
      `- ${only_creator}${i18n.t('games.ttt.room.body.robot_command_description')}`,
      `\n${i18n.t('games.ttt.room.body.status', { status: status })}`,
      `${i18n.t('games.ttt.room.body.creator', { creator: creator_line })}`,
      i18n.t('games.ttt.room.body.players', { players: player_line }),
    ];

    const next_player = this.getNextPlayer();
    if (next_player && !this.isGameEnded()) {
      const chess_emoji = chessColorToEmoji(next_player.chess_color);
      body_lines.push(
        i18n.t('games.ttt.room.body.next_player', {
          next_player: next_player.robot
            ? `${next_player.login} ${ROBOT_EMOJI}${chess_emoji}`
            : `[${next_player.login}](${next_player.url}) ${chess_emoji}`
        })
      );
    }

    const table = this.getChessColorTable();
    body_lines.push(
      '\n|+|a|b|c|',
      '|:--:|:--:|:--:|:--:|',
      `|1|${table[0][0]}|${table[0][1]}|${table[0][2]}|`,
      `|2|${table[1][0]}|${table[1][1]}|${table[1][2]}|`,
      `|3|${table[2][0]}|${table[2][1]}|${table[2][2]}|`
    );

    if (steps.length > 0) {
      body_lines.push(
        '',
        i18n.t('games.ttt.room.body.steps'),
        ...steps.map(step => {
          const { chess_color, coordinates, comment } = step;
          const player = this.getPlayerByChessColor(chess_color)!;
          const chess_emoji = chessColorToEmoji(player.chess_color);
          const robot_emoji = player.robot ? ROBOT_EMOJI : '';
          if (comment) {
            return `+ ${chess_emoji} [${coordinates.ox}:${coordinates.oy} ${robot_emoji}${player.login}](${comment.url})`;
          } else {
            return `+ ${chess_emoji} ${coordinates.ox}:${coordinates.oy} ${robot_emoji}${player.login}`;
          }
        })
      );
    }

    const winner_line = this.getWinnerPrintInfo();
    if (winner_line !== '') {
      body_lines.push(
        '',
        i18n.t('games.ttt.room.body.result', {
          result: winner_line
        })
      );
    }

    return body_lines.join('\n');
  }

  public getNextPlayer(): MetaPlayer | null {
    if (!this.isRoomFull()) {
      return null;
    }
    const last_step = this.getLastStep();
    if (last_step) {
      const last_index = this.meta.players.findIndex(player => player.chess_color === last_step.chess_color);
      return this.meta.players[(last_index + 1) % this.meta.players.length];
    }
    return null;
  }

  public getChessColorTable(): ArrayTable<ChessColor | '', 3, 3> {
    return this.meta.data.map(row => row.map(col => chessColorToEmoji(col))) as ArrayTable<ChessColor | '', 3, 3>;
  }

  public getUserPlayerByLogin(login: string): MetaPlayer | null {
    return this.meta.players
      .find(player => player.login === login && !player.robot) || null;
  }

  public getPlayerByChessColor(chess_color: ChessColor): MetaPlayer | null {
    return this.meta.players
      .find(player => player.chess_color === chess_color) || null;
  }

  public getRobotPlayer(): MetaPlayer | null {
    return this.meta.players.find(player => player.robot) || null;
  }

  public getUserPlayer(): MetaPlayer | null {
    return this.meta.players.find(player => !player.robot) || null;
  }

  public getLastStep(): MetaStep | null {
    return this.meta.steps[this.meta.steps.length - 1] || null;
  }

  public getRobotBestMove = async (is_max: boolean, player_color: ChessColor, robot_color: ChessColor, depth: number = 0, max_depth: number = 5): Promise<RobotMove> => {
    // minimax and random move
    // max_depth = 5 easy mode
    this.updateWinner();
    const winner = this.meta.winner;
    if (winner === 'tie' || depth >= max_depth) {
      return { score: 0 };
    } else if (winner) {
      return { score: Math.floor((winner.robot ? 10000 : -10000) / depth) };
    }
    const data = this.meta.data;
    let best_score = is_max ? -Infinity : Infinity;
    let moves: RobotMove[] = [];
    for (let x = 0; x < data.length; x++) {
      for (let y = 0; y < data[x].length; y++) {
        if (data[x][y] !== null) {
          continue;
        }
        data[x][y] = is_max ? robot_color : player_color;
        const move = await this.getRobotBestMove(!is_max, player_color, robot_color, depth + 1, max_depth);
        data[x][y] = null;
        if (is_max ? (move.score > best_score) : (move.score < best_score)) {
          best_score = move.score;
          moves = [];
        }
        if (move.score === best_score) {
          moves.push({ score: move.score, coordinates: { x, y } });
        }
      }
    }
    return moves[Math.floor(Math.random() * moves.length)];
  };

  public isGameEnded(): boolean {
    return this.meta.status === 'end';
  }

  public isRoomFull(): boolean {
    return this.meta.players.length >= 2;
  }

  public async robotMove() {
    const robot_player = this.getRobotPlayer();
    const player = this.getUserPlayer();
    if (!robot_player || !player) {
      return;
    }
    this.updateWinner();
    const winner = this.meta.winner;
    if (winner) {
      return;
    }
    const step = this.getLastStep();
    if (!step || step.chess_color === robot_player.chess_color) {
      return;
    }
    const best_move = await this.getRobotBestMove(true, player.chess_color, robot_player.chess_color);
    const cwo = coordinatesToCoordinatesWithOrigin(best_move.coordinates!);
    this.updateDataAndStep(cwo, robot_player, undefined);
  }

  public async parseCoordinatesCommand(issue_number: number, { chess: coordinates }: TicTacToeRoomCommands, comment: IssueCommentCreatedEvent['comment']): Promise<void> {
    if (!coordinates) {
      return;
    }

    let player = this.getUserPlayerByLogin(comment.user.login);
    if (!player) {
      const new_player: MetaPlayer = {
        login: comment.user.login,
        url: comment.user.html_url,
        chess_color: getRandomChessColor(this.meta.players.map(p => p.chess_color))
      };
      this.meta.players.push(new_player);
      player = new_player;
    }

    const last_step = this.getLastStep();
    if (last_step && last_step.chess_color === player.chess_color) {
      throwReplyMessageError(
        issue_number, comment,
        i18n.t('games.ttt.reply.wait_opponent_move', {
          ox: last_step.coordinates.ox,
          oy: last_step.coordinates.oy
        })
      );
    }

    const before_chess_color = this.meta.data[coordinates.x][coordinates.y];
    if (before_chess_color) {
      const before_player = this.getPlayerByChessColor(before_chess_color)!;
      throwReplyMessageError(
        issue_number, comment,
        i18n.t('games.ttt.reply.position_occupied', {
          login: before_player.login,
          ox: coordinates.ox,
          oy: coordinates.oy
        })
      );
    }

    this.updateDataAndStep(coordinates, player, { url: comment.html_url });

    await this.robotMove();
  }

  public async parseColorCommand(issue_number: number, { color }: TicTacToeRoomCommands, comment: IssueCommentCreatedEvent['comment']): Promise<void> {
    if (!color) {
      return;
    }

    const player = this.getUserPlayerByLogin(comment.user.login);
    if (!player) {
      throwReplyMessageError(
        issue_number, comment,
        i18n.t('games.ttt.reply.color_change_failed')
      );
    }

    const player_chess_colors = this.meta.players.map(p => p.chess_color);
    if (player_chess_colors.includes(color) && player.chess_color !== color) {
      throwReplyMessageError(
        issue_number, comment,
        i18n.t('games.ttt.reply.color_used', { color })
      );
    }
    this.meta.data.forEach(row => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === player.chess_color) {
          row[i] = color;
        }
      }
    });
    this.meta.steps.forEach((step, i, steps) => {
      if (step.chess_color === player.chess_color) {
        steps[i].chess_color = color;
      }
    });
    player.chess_color = color;
  }

  public async parseLanguageCommand(issue_number: number, { language }: TicTacToeRoomCommands, comment: IssueCommentCreatedEvent['comment']): Promise<void> {
    if (language) {
      const { user: { login } } = comment;
      if (login !== this.meta.creator.login) {
        throwReplyMessageError(
          issue_number, comment,
          i18n.t('games.ttt.reply.language_change_failed')
        );
      }
      this.meta.language = language;
      changeLanguage(language);
    }
  }

  public async parseRobotCommand(issue_number: number, { robot }: TicTacToeRoomCommands, comment: IssueCommentCreatedEvent['comment']): Promise<void> {
    if (!robot) {
      return;
    }
    const robot_player = this.getRobotPlayer();
    if (robot === 'add') {
      if (robot_player) {
        throwReplyMessageError(
          issue_number, comment,
          i18n.t('games.ttt.reply.room_has_robot_add_failed')
        );
      }

      if (this.isRoomFull()) {
        throwReplyMessageError(
          issue_number, comment,
          i18n.t('games.ttt.reply.room_full_add_robot_failed')
        );
      }

      const player_chess_colors = this.meta.players.map(p => p.chess_color);
      const new_robot_player: MetaPlayer = TicTacToeRoom.createRobotPlayer(player_chess_colors);
      this.meta.players.push(new_robot_player);

      await this.robotMove();
    } else if (robot === 'remove' && robot_player) {
      if (this.meta.steps.length > 0) {
        throwReplyMessageError(
          issue_number, comment,
          i18n.t('games.ttt.reply.game_start_remove_robot_failed')
        );
      }
      this.meta.players = this.meta.players.filter(player => !player.robot);
    }
  }

  public updateDataAndStep(coordinates: CoordinatesWithOrigin, player: MetaPlayer, comment: MetaStep['comment']): void {
    this.meta.data[coordinates.x][coordinates.y] = player.chess_color;
    this.meta.steps.push({
      chess_color: player.chess_color,
      coordinates,
      comment
    });
  }

  public updateWinner(): void {
    const { data } = this.meta;
    for (const [c1, c2, c3] of TicTacToeRoom.WIN_MAP) {
      const [l1, l2, l3] = [data[c1.x][c1.y], data[c2.x][c2.y], data[c3.x][c3.y]];
      if (l1 && l1 === l2 && l2 === l3) {
        this.meta.winner = this.getPlayerByChessColor(l1);
        return;
      }
    }
    const empty_cells = this.meta.data.flat().filter(cell => !cell);
    this.meta.winner = empty_cells.length === 0 ? 'tie' : null;
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
      const call_all_players = this.meta.players
        .filter(player => !player.robot)
        .map(player => `@[${player.login}](${player.url})`).join(' ');
      await issue_api.createComment({
        issue_number,
        body: i18n.t('games.ttt.reply.call_player_game_ended', {
          players: call_all_players,
          result: this.getWinnerPrintInfo()
        })
      });
    }
  }

  public async updateRoom(issue_number: number): Promise<void> {
    this.meta.update_time = new Date().toISOString();
    await issue_api.updateIssue({
      issue_number,
      title: this.getIssueTitle(),
      body: this.getIssueBody(),
      state: this.isGameEnded() ? 'closed' : 'open'
    });
  }

}

export interface TicTacToeGameOptions extends GameOptions {
  label: string;
}

export class TicTacToeGame extends Game<TicTacToeGameOptions> {

  public async handleIssueOpenedEvent(payload: IssuesOpenedEvent): Promise<void> {
    const { title, user, number: issue_number, body: issue_body } = payload.issue;
    const title_match = title.match(new RegExp(input.ttt_issue_title_pattern, 'ig'));
    if (!title_match) {
      return;
    }
    const create_player: MetaPlayer = {
      login: user.login,
      url: user.html_url,
      chess_color: getRandomChessColor(),
    };

    const [command, errors] = TicTacToeRoom.parseCommands(issue_body);
    if (errors.length > 0) {
      await issue_api.createComment({
        issue_number,
        body: 'Warning:\n' + errors.map(e => '+ ' + e.message).join('\n')
      });
    }

    const room = await TicTacToeRoom.createEmptyRoom(this.options, create_player, command, payload.issue);

    const game_issue = await issue_api.createIssue({
      title: room.getIssueTitle(),
      body: room.getIssueBody(),
      labels: [this.options.label]
    });

    await issue_api.createComment({
      issue_number,
      body: i18n.t('games.ttt.reply.game_room_created', {
        name: game_issue.title,
        url: game_issue.html_url,
        login: user.login,
      })
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
    if (room.isGameEnded()) {
      throwReplyMessageError(issue_number, comment, i18n.t('games.ttt.reply.game_ended'));
    }
    if (room.isRoomFull() && !room.getUserPlayerByLogin(comment.user.login)) {
      throwReplyMessageError(issue_number, comment, i18n.t('games.ttt.reply.room_full'));
    }

    const [command, errors] = TicTacToeRoom.parseCommands(comment.body);
    if (errors.length > 0) {
      const error_messages = errors.map(e => '+ ' + e.message).join('\n');
      const message_params = getMessageParamsByComment(comment, {
        message: '\n' + error_messages,
        message_type: 'Warning',
        issue_number
      });
      replyMessage(message_params);
    }

    await room.parseLanguageCommand(issue_number, command, comment).catch(catchError);
    await room.parseCoordinatesCommand(issue_number, command, comment).catch(catchError);
    await room.parseColorCommand(issue_number, command, comment).catch(catchError);
    await room.parseRobotCommand(issue_number, command, comment).catch(catchError);

    room.updateWinner();
    await room.updateStatus(issue_number);
    await room.updateRoom(issue_number);
  }

}