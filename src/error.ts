import * as core from '@actions/core';
import issue_api from './api/issue';

export class IGError extends Error { }

export interface ReplyMessageErrorOptions {
  reply_type: 'Error' | 'Warning' | 'Info';
  issue_number: number;
  message: string;
  target?: {
    login: string;
    name: string;
    url: string;
    body?: string;
  }
}

export class ReplyMessageError extends IGError {
  constructor(public options: ReplyMessageErrorOptions) {
    super(options.message);
  }
}

export async function catchError(error: Error) {
  if (!(error instanceof ReplyMessageError)) {
    return core.setFailed(error);
  }
  const { reply_type, issue_number, message, target } = error.options;
  let comment_body = `${reply_type}: ${message}`;

  if (target) {
    const body = target.body || '';
    const quote_body = body.split('\n').map(line => `> ${line}`).join('\n');
    comment_body = `@${target.login} Reply: [${target.name}](${target.url} "Click to view the comment")\n\n${quote_body}\n\n${comment_body}`;
  }

  await issue_api.createComment({
    issue_number,
    body: comment_body
  });
}