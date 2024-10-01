import * as core from '@actions/core';

export interface Input {
  token: string;
  language: string;
  ttt_issue_title_pattern: string;
  ttt_label: string;
  ttt_room_title: string;
}

const input: Input = {
  token: core.getInput('token', { required: true }),
  language: core.getInput('language', { required: true }),
  ttt_issue_title_pattern: core.getInput('ttt-issue-title-pattern', { required: true }),
  ttt_label: core.getInput('ttt-label', { required: true }),
  ttt_room_title: core.getInput('ttt-room-title', { required: true })
};

export default input;