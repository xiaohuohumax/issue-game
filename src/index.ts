import { GameManager } from './game';
import { TicTacToeGame } from './games';
import { catchError } from './error';
import input from './input';
import i18n, { Language, changeLanguage } from './i18n';

changeLanguage(input.language as Language);

const manager = new GameManager({});

manager.addGame(
  new TicTacToeGame({
    name: i18n.t('games.ttt.name'),
    description: i18n.t('games.ttt.description'),
    label: input.ttt_label,
  })
);

manager.handleAction().catch(catchError);
process.on('unhandledRejection', catchError);