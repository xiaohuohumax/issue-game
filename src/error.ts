import * as core from '@actions/core';
import { ReplyMessageParams, replyMessage } from './reply';

export class IGError extends Error { }

export interface ReplyMessageErrorOptions extends ReplyMessageParams { }

export class ReplyMessageError extends IGError {
  constructor(public options: ReplyMessageErrorOptions) {
    super(options.message);
  }
}

export async function catchError(error: Error) {
  if (!(error instanceof ReplyMessageError)) {
    return core.setFailed(error);
  }
  replyMessage(error.options);
}