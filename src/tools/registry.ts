import type { ToolHandler } from './types';

const registry = new Map<string, ToolHandler>();

export function registerTool(name: string, handler: ToolHandler): void {
  registry.set(name, handler);
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const handler = registry.get(name);
  if (!handler) {
    return Promise.resolve(JSON.stringify({ error: `Unknown tool: ${name}` }));
  }
  const result = handler(args);
  return Promise.resolve(result);
}
