import * as core from '@actions/core';
import { GameManager, TicTacToeGame } from './game';
import config from './config';
import * as issue_api from './api/issue';
import { ReplyCommentError } from './error';

const manager = new GameManager({});

manager.injectGames([
  new TicTacToeGame({
    name: 'TicTacToe',
    label: {
      name: config.ttt_label_name,
      color: config.ttt_label_color,
      description: config.ttt_label_description,
    },
    init_pattern: config.ttt_init_pattern,
  })
]);

async function catch_error(error: Error) {
  if (error instanceof ReplyCommentError) {
    const { msg_type, issue_number, comment } = error.options;
    let msg = `${msg_type.toUpperCase()}: _${error.message}_`;

    if (comment) {
      const { id, html_url, body, user } = comment;
      const body_line = ((body || '') as string)
        .split('\n')
        .map(line => '> ' + line)
        .join('\n');
      msg = `@${user.login} Reply: [${id}](${html_url} "Click to view the comment")\n${body_line}\n${msg}`;
    }

    core[msg_type](msg);
    await issue_api.createComment({
      issue_number: issue_number,
      body: msg,
    });
    return;
  }
  core.setFailed(error);
}

manager.handleAction().catch(catch_error);
process.on('unhandledRejection', reason => catch_error(reason as Error));