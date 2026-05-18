import { executeTool } from '@tools';

export const ToolExecutor = {
  async execute(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    try {
      return await executeTool(toolName, args);
    } catch (e: any) {
      return JSON.stringify({ error: e.message || 'Tool execution failed' });
    }
  },
};
