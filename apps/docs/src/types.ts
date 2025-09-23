export interface Section {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  content: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  sections: Section[];
} 