import { components } from '@octokit/openapi-types';
import * as github from '@actions/github';
import input from '../input';

export type Issue = components['schemas']['issue'];
export type IssueComment = components['schemas']['issue-comment'];

export interface CreateIssueParams {
  title: string;
  body: string;
  labels: string[];
}

export type UpdateIssueParams = Partial<CreateIssueParams> & {
  issue_number: number;
  state?: 'open' | 'closed';
};

export interface CreateCommentParams {
  issue_number: number;
  body: string;
}

export class IssueApi {
  public octokit: ReturnType<typeof github.getOctokit>;
  constructor(public owner: string, public repo: string, public token: string) {
    this.octokit = github.getOctokit(this.token);
  }

  public async updateIssue(params: UpdateIssueParams): Promise<Issue> {
    const { status, data } = await this.octokit.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      ...params
    });
    if (status !== 200) {
      throw new Error('Failed to update issue');
    }
    return data;
  }

  public async createIssue(params: CreateIssueParams): Promise<Issue> {
    const { status, data } = await this.octokit.rest.issues.create({
      owner: this.owner,
      repo: this.repo,
      ...params
    });
    if (status !== 201) {
      throw new Error('Failed to create issue');
    }
    return data;
  }

  public async createComment(params: CreateCommentParams): Promise<IssueComment> {
    const { status, data } = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      ...params
    });
    if (status !== 201) {
      throw new Error('Failed to create comment');
    }
    return data;
  }
}

const { owner, repo } = github.context.repo;
export default new IssueApi(owner, repo, input.token);