import * as core from '@actions/core';
import { ReplayMessageParams, replayMessage } from './replay';

export class IGError extends Error { }

export interface ReplyMessageErrorOptions extends ReplayMessageParams { }

export class ReplyMessageError extends IGError {
  constructor(public options: ReplyMessageErrorOptions) {
    super(options.message);
  }
}

export async function catchError(error: Error) {
  if (!(error instanceof ReplyMessageError)) {
    return core.setFailed(error);
  }
  replayMessage(error.options);
}