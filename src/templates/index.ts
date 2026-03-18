import { Project } from '../types/project';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  data: Project;
}

export const templates: Record<string, TemplateInfo> = {};

export function loadTemplate(templateId: string): Project {
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Template "${templateId}" not found`);
  }

  // Deep clone to avoid mutations
  return JSON.parse(JSON.stringify(template.data));
}

export function getTemplateList(): TemplateInfo[] {
  return Object.values(templates);
}
