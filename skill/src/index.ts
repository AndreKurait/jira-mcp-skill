#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import * as keytar from 'keytar';

const SERVICE_NAME = 'jira-mcp-skill';

async function getCredentials() {
  const url = await keytar.getPassword(SERVICE_NAME, 'url');
  const email = await keytar.getPassword(SERVICE_NAME, 'email');
  const token = await keytar.getPassword(SERVICE_NAME, 'token');
  
  // Fallback to env vars
  return {
    url: url || process.env.JIRA_URL,
    email: email || process.env.JIRA_EMAIL,
    token: token || process.env.JIRA_API_TOKEN,
  };
}

interface IssueArgs {
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  storyPoints?: number;
}

interface SearchArgs { jql: string; maxResults?: number; }
interface GetIssueArgs { issueKey: string; }
interface UpdateArgs { issueKey: string; summary?: string; description?: string; priority?: string; assignee?: string; labels?: string[]; storyPoints?: number; parent?: string; }
interface CommentArgs { issueKey: string; comment: string; }
interface TransitionArgs { issueKey: string; transitionName: string; comment?: string; }
interface LinkArgs { inwardIssue: string; outwardIssue: string; linkType: string; }

class JiraServer {
  private server: Server;
  private axios!: AxiosInstance;
  private jiraUrl!: string;

  constructor() {
    this.server = new Server(
      { name: 'jira-mcp-skill', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
    this.server.onerror = (e) => console.error('[MCP Error]', e);
    process.on('SIGINT', async () => { await this.server.close(); process.exit(0); });
  }

  private async initAxios() {
    const creds = await getCredentials();
    if (!creds.url || !creds.email || !creds.token) {
      throw new Error('Jira credentials not configured. Run: npx @akurait/jira-mcp-skill');
    }
    this.jiraUrl = creds.url;
    const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
    this.axios = axios.create({
      baseURL: `${creds.url}/rest/api/3`,
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: 'create_issue', description: 'Create a new Jira issue', inputSchema: { type: 'object', properties: { projectKey: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, issueType: { type: 'string' }, priority: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } }, storyPoints: { type: 'number' } }, required: ['projectKey', 'summary'] } },
        { name: 'search_issues', description: 'Search issues using JQL', inputSchema: { type: 'object', properties: { jql: { type: 'string' }, maxResults: { type: 'number' } }, required: ['jql'] } },
        { name: 'get_issue', description: 'Get issue details', inputSchema: { type: 'object', properties: { issueKey: { type: 'string' } }, required: ['issueKey'] } },
        { name: 'update_issue', description: 'Update an issue', inputSchema: { type: 'object', properties: { issueKey: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' }, storyPoints: { type: 'number' }, parent: { type: 'string' } }, required: ['issueKey'] } },
        { name: 'add_comment', description: 'Add comment to issue', inputSchema: { type: 'object', properties: { issueKey: { type: 'string' }, comment: { type: 'string' } }, required: ['issueKey', 'comment'] } },
        { name: 'transition_issue', description: 'Transition issue status', inputSchema: { type: 'object', properties: { issueKey: { type: 'string' }, transitionName: { type: 'string' }, comment: { type: 'string' } }, required: ['issueKey', 'transitionName'] } },
        { name: 'link_issues', description: 'Link two issues', inputSchema: { type: 'object', properties: { inwardIssue: { type: 'string' }, outwardIssue: { type: 'string' }, linkType: { type: 'string' } }, required: ['inwardIssue', 'outwardIssue', 'linkType'] } },
        { name: 'get_projects', description: 'List Jira projects', inputSchema: { type: 'object', properties: { maxResults: { type: 'number' } } } },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (req) => {
      if (!this.axios) await this.initAxios();
      try {
        const args = req.params.arguments as any;
        switch (req.params.name) {
          case 'create_issue': return await this.createIssue(args);
          case 'search_issues': return await this.searchIssues(args);
          case 'get_issue': return await this.getIssue(args);
          case 'update_issue': return await this.updateIssue(args);
          case 'add_comment': return await this.addComment(args);
          case 'transition_issue': return await this.transitionIssue(args);
          case 'link_issues': return await this.linkIssues(args);
          case 'get_projects': return await this.getProjects(args);
          default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${req.params.name}`);
        }
      } catch (e: any) {
        if (axios.isAxiosError(e)) {
          return { content: [{ type: 'text', text: `Jira API error: ${e.response?.data?.errorMessages?.join(', ') || e.message}` }], isError: true };
        }
        throw e;
      }
    });
  }

  private adf(text: string) {
    return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
  }

  private async createIssue(args: IssueArgs) {
    const fields: any = { project: { key: args.projectKey }, summary: args.summary, issuetype: { name: args.issueType || 'Story' } };
    if (args.description) fields.description = this.adf(args.description);
    if (args.priority) fields.priority = { name: args.priority };
    if (args.labels) fields.labels = args.labels;
    if (args.storyPoints) fields.customfield_10032 = args.storyPoints;
    const res = await this.axios.post('/issue', { fields });
    return { content: [{ type: 'text', text: `✅ Created ${res.data.key}\nURL: ${this.jiraUrl}/browse/${res.data.key}` }] };
  }

  private async searchIssues(args: SearchArgs) {
    const res = await this.axios.post('/search/jql', { jql: args.jql, maxResults: args.maxResults || 50, fields: ['summary', 'status', 'priority', 'assignee'] });
    const list = res.data.issues?.map((i: any) => `${i.key}: ${i.fields?.summary} (${i.fields?.status?.name})`).join('\n') || 'No issues found';
    return { content: [{ type: 'text', text: `Found ${res.data.total} issues:\n${list}` }] };
  }

  private async getIssue(args: GetIssueArgs) {
    const res = await this.axios.get(`/issue/${args.issueKey}`);
    const i = res.data;
    return { content: [{ type: 'text', text: `📋 ${i.key}: ${i.fields.summary}\nType: ${i.fields.issuetype.name}\nStatus: ${i.fields.status.name}\nPriority: ${i.fields.priority?.name || 'None'}\nURL: ${this.jiraUrl}/browse/${i.key}` }] };
  }

  private async updateIssue(args: UpdateArgs) {
    const fields: any = {};
    if (args.summary) fields.summary = args.summary;
    if (args.description) fields.description = this.adf(args.description);
    if (args.priority) fields.priority = { name: args.priority };
    if (args.storyPoints) fields.customfield_10032 = args.storyPoints;
    if (args.parent) fields.parent = { key: args.parent };
    await this.axios.put(`/issue/${args.issueKey}`, { fields });
    return { content: [{ type: 'text', text: `✅ Updated ${args.issueKey}` }] };
  }

  private async addComment(args: CommentArgs) {
    await this.axios.post(`/issue/${args.issueKey}/comment`, { body: this.adf(args.comment) });
    return { content: [{ type: 'text', text: `✅ Comment added to ${args.issueKey}` }] };
  }

  private async transitionIssue(args: TransitionArgs) {
    const trans = await this.axios.get(`/issue/${args.issueKey}/transitions`);
    const t = trans.data.transitions.find((x: any) => x.name.toLowerCase() === args.transitionName.toLowerCase());
    if (!t) return { content: [{ type: 'text', text: `❌ Transition not found. Available: ${trans.data.transitions.map((x: any) => x.name).join(', ')}` }], isError: true };
    await this.axios.post(`/issue/${args.issueKey}/transitions`, { transition: { id: t.id } });
    return { content: [{ type: 'text', text: `✅ ${args.issueKey} → ${t.name}` }] };
  }

  private async linkIssues(args: LinkArgs) {
    await this.axios.post('/issueLink', { type: { name: args.linkType }, inwardIssue: { key: args.inwardIssue }, outwardIssue: { key: args.outwardIssue } });
    return { content: [{ type: 'text', text: `✅ Linked ${args.outwardIssue} ${args.linkType} ${args.inwardIssue}` }] };
  }

  private async getProjects(args: { maxResults?: number }) {
    const res = await this.axios.get('/project/search', { params: { maxResults: args?.maxResults || 50 } });
    const list = res.data.values.map((p: any) => `${p.key}: ${p.name}`).join('\n');
    return { content: [{ type: 'text', text: `Projects:\n${list}` }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jira MCP server running');
  }
}

new JiraServer().run().catch(console.error);
