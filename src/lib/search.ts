import { createFromSource } from 'fumadocs-core/search/server';
import { source } from './source';

// shared by the search route and the Ask AI `search` tool
export const searchServer = createFromSource(source);
