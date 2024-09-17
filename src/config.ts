import * as core from '@actions/core';

export interface Config {
  token: string;
  ttt_init_pattern: string;
  ttt_label_name: string;
  ttt_label_color: string;
  ttt_label_description: string;
}

const config: Config = {
  token: core.getInput('token', { required: true }),
  ttt_init_pattern: core.getInput('ttt-init-pattern', { required: false }),
  ttt_label_name: core.getInput('ttt-label-name', { required: false }),
  ttt_label_color: core.getInput('ttt-label-color', { required: false }),
  ttt_label_description: core.getInput('ttt-label-description', { required: false }),
};

export default config;