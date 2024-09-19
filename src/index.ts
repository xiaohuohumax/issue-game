import { GameManager } from './game';
import { TicTacToeGame } from './games';
import { catchError } from './error';
import input from './input';
import i18n, { Language, changeLanguage } from './i18n';
import { version } from '../package.json';

changeLanguage(input.language as Language);
const major_version = version.split('.')[0];

const manager = new GameManager({});

manager.addGame(
  new TicTacToeGame({
    name: i18n.t('games.ttt.name'),
    description: i18n.t('games.ttt.description'),
    label: input.ttt_label_prefix + 'v' + major_version,
    issue_title_pattern: input.ttt_issue_title_pattern
  })
);

manager.handleAction().catch(catchError);
process.on('unhandledRejection', catchError);