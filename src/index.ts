import * as core from '@actions/core';
import * as github from '@actions/github';
import { GameManager, TicTacToeGame } from './game';
import config from './config';

const manager = new GameManager({});

manager.injectGames([
  new TicTacToeGame({
    name: 'TicTacToe',
    room_label: {
      name: config.ttt_label_name,
      color: config.ttt_label_color,
      description: config.ttt_label_description,
    },
    init_pattern: config.ttt_init_pattern,
  })
]);

async function run() {
  const eventName = github.context.eventName;
  if (eventName === 'issue_comment' && !github.context.payload.pull_request) {
    manager.handleIssueCommentCreatedEvent();
  } else if (eventName === 'issues' && github.context.payload.action === 'opened') {
    manager.handleIssueCreatedEvent();
  }
}

run().catch(core.setFailed);