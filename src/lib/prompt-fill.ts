// Import-free so client components can preview a prompt: fills `{name}` from vars; a name with no value stays visible.
export const fillPrompt = (template: string, vars: Record<string, string>) => template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
