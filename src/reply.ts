import issue_api from './api/issue';
import i18n from './i18n';

export interface ReplyMessageParams {
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

export async function replyMessage({ message_type, issue_number, message, target }: ReplyMessageParams) {
  let body = `${message_type}: ${message}`;

  if (target) {
    const target_body = target.body || '';
    body = i18n.t('reply.body', {
      login: target.login,
      name: target.name,
      url: target.url,
      body: '```\n' + target_body + '\n```\n',
      message: body
    });
  }

  await issue_api.createComment({
    issue_number,
    body
  });
}