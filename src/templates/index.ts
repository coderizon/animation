import { Project } from '../types/project';
import blankTemplate from './blank.json';
import neuralNetworkTemplate from './neural-network.json';
import logoShowcaseTemplate from './logo-showcase.json';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  data: Project;
}

export const templates: Record<string, TemplateInfo> = {
  blank: {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with an empty canvas',
    icon: '',
    data: blankTemplate as Project,
  },
  'neural-network': {
    id: 'neural-network',
    name: 'Neural Network',
    description: 'Distributed AI model communication visualization',
    icon: '',
    data: neuralNetworkTemplate as Project,
  },
  'logo-showcase': {
    id: 'logo-showcase',
    name: 'Logo Showcase',
    description: 'Animated logo presentation with different effects',
    icon: '',
    data: logoShowcaseTemplate as Project,
  },
};

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
