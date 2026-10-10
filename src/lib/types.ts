export type ContentType = 'news' | 'movie' | 'social';
export type Category = 'technology'|'sports'|'finance'|'entertainment'|'science'|'health'|'business';
export interface ContentItem { id:string; type:ContentType; category:Category; title:string; description:string; image:string; url:string; source:string; author?:string; publishedAt:string; score:number; }
export interface Page { items: ContentItem[]; nextPage: number | null; source: 'live' | 'mock'; }
