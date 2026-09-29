export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  facts: string[];
  upsell: string;
  keywords: string[];
}
export interface Analysis {
  intent: string;
  customer_reply: string;
  manager_hint: string;
  upsell_opportunity: "none" | "low" | "medium" | "high";
  confidence: number;
  used_knowledge: { id: string; title: string; matched_facts: string[] }[];
  missing_information: string[];
  rationale: string;
}
export interface Health {
  status: string;
  mode: "demo" | "live";
}
