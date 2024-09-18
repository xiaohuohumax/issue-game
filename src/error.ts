import { WebhookPayload } from '@actions/github/lib/interfaces';

export class IGError extends Error {
}

export interface ReplyCommentErrorOptions {
  msg_type: 'error' | 'warning' | 'info';
  issue_number: number;
  msg: string;
  comment: WebhookPayload['comment'];
}

export class ReplyCommentError extends IGError {
  constructor(public options: ReplyCommentErrorOptions) {
    super(options.msg);
  }
}