import { GameManager } from './game';
import { TicTacToeGame } from './games';
import { catchError } from './error';
import input from './input';
import { version } from '../package.json';

const major_version = version.split('.')[0];

const manager = new GameManager({});

manager.addGame(
  new TicTacToeGame({
    name: 'TicTacToe',
    description: 'Tic-Tac-Toe game',
    label: input.ttt_label_prefix + 'v' + major_version,
    issue_title_pattern: input.ttt_issue_title_pattern
  })
);

manager.handleAction().catch(catchError);
process.on('unhandledRejection', catchError);