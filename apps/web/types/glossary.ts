export interface Glossary {
  id: string;
  name: string;
  user_id: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface GlossaryItem {
  id: string;
  glossary_id: string;
  word: string;
  intensifier: number;
  created_at: string;
  updated_at: string;
}

export interface CreateGlossaryRequest {
  name: string;
}

export interface UpdateGlossaryRequest {
  name: string;
}

export interface CreateGlossaryItemRequest {
  word: string;
  intensifier: number;
}

export interface UpdateGlossaryItemRequest {
  word?: string;
  intensifier?: number;
}

export interface GlossaryResponse {
  glossaries: Glossary[];
}

export interface GlossaryItemsResponse {
  glossary_name: string;
  glossaryItems: GlossaryItem[];
}