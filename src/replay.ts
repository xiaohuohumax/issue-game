import issue_api from './api/issue';

export interface ReplayMessageParams {
  message_type: 'Error' | 'Warning' | 'Info';
  issue_number: number;
  message: string;
  target?: {
    login: string;
    name: string;
    url: string;
    body?: string;
  }
}

export async function replayMessage({ message_type, issue_number, message, target }: ReplayMessageParams) {
  let comment_body = `${message_type}: ${message}`;

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