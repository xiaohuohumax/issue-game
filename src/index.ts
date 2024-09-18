import { GameManager } from './game';
import { TicTacToeGame } from './games';
import { catchError } from './error';
import input from './input';

const manager = new GameManager({});

manager.addGame(
  new TicTacToeGame({
    name: 'TicTacToe',
    description: 'Tic-Tac-Toe game',
    label: input.ttt_label,
    issue_title_pattern: input.ttt_issue_title_pattern
  })
);

manager.handleAction().catch(catchError);
process.on('unhandledRejection', catchError);