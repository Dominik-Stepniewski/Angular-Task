export interface SearchQuery {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  tokens: string[];
}

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
