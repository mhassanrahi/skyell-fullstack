// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

// URL and Crawl types
export type CrawlStatus = "queued" | "running" | "completed" | "error";

export interface URLEntry {
  id: number;
  user_id: number;
  url: string;
  status: CrawlStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CrawlResult {
  id: number;
  url_id?: number;
  url: string;
  html_version: string;
  title: string;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  h4_count: number;
  h5_count: number;
  h6_count: number;
  internal_links: number;
  external_links: number;
  broken_links: number;
  has_login_form: boolean;
  status: string;
  crawled_at: string;
  chart_data?: LinkChartData;
  broken_links_list?: Link[];
}

export interface LinkChartData {
  internal_links: number;
  external_links: number;
  broken_links: number;
  total_links: number;
}

export interface Link {
  id: number;
  crawl_result_id: number;
  url: string;
  type: "internal" | "external";
  is_accessible: boolean;
  status_code?: number;
  checked_at: string;
}

// UI Component types
export interface TableFilter {
  search: string;
  status: "all" | CrawlStatus;
  sortBy: "url" | "status" | "created_at";
  sortOrder: "asc" | "desc";
}

export interface ResultsFilter {
  search: string;
  status: "all" | "has_login_form";
  sortBy: "url" | "title" | "links" | "crawled_at";
  sortOrder: "asc" | "desc";
}

export interface URLFormData {
  url: string;
}
