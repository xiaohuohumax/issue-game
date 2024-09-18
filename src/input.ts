import * as core from '@actions/core';

export interface Input {
  token: string;
  ttt_issue_title_pattern: string;
  ttt_label: string;
}

const input: Input = {
  token: core.getInput('token', { required: true }),
  ttt_issue_title_pattern: core.getInput('ttt-issue-title-pattern', { required: true }),
  ttt_label: core.getInput('ttt-label', { required: true }),
};

export default input;