import { components } from '@octokit/openapi-types';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import * as github from '@actions/github';
import config from '../config';

const { owner, repo } = github.context.repo;
const octokit = github.getOctokit(config.token);

export type Issue = components['schemas']['issue'];

export interface CreateIssueParams {
  title: string;
  body: string;
  labels: RestEndpointMethodTypes['issues']['create']['parameters']['labels'];
}

export type UpdateIssueParams = Partial<CreateIssueParams> & {
  issue_number: number;
  state?: 'open' | 'closed';
};

export async function updateIssue(params: UpdateIssueParams): Promise<Issue> {
  const { status, data } = await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: params.issue_number,
    title: params.title,
    body: params.body,
    labels: params.labels,
    state: params.state,
  });
  if (status !== 200) {
    throw new Error('Failed to update issue');
  }
  return data;
}

export async function createIssue(params: CreateIssueParams): Promise<Issue> {
  const { status, data } = await octokit.rest.issues.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    labels: params.labels,
  });
  if (status !== 201) {
    throw new Error('Failed to create issue');
  }
  return data;
}

export type IssueComment = components['schemas']['issue-comment'];

export interface CreateCommentParams {
  issue_number: number;
  body: string;
}

export async function createComment(params: CreateCommentParams): Promise<IssueComment> {
  const { status, data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: params.issue_number,
    body: params.body,
  });
  if (status !== 201) {
    throw new Error('Failed to create comment');
  }
  return data;
}    