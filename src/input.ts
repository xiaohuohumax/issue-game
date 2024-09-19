import * as core from '@actions/core';

export interface Input {
  token: string;
  language: string;
  ttt_issue_title_pattern: string;
  ttt_label_prefix: string;
}

const input: Input = {
  token: core.getInput('token', { required: true }),
  language: core.getInput('language', { required: true }),
  ttt_issue_title_pattern: core.getInput('ttt-issue-title-pattern', { required: true }),
  ttt_label_prefix: core.getInput('ttt-label-prefix', { required: true }),
};

export default input;