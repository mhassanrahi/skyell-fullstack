import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Create a custom render function with providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const testQueryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock data for testing
export const mockURLEntry = {
  id: 1,
  url: "https://example.com",
  status: "completed" as const,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  error_message: null,
};

export const mockCrawlResult = {
  id: 1,
  url_id: 1,
  url: "https://example.com",
  title: "Example Page",
  html_version: "HTML5",
  internal_links: 10,
  external_links: 5,
  broken_links: 2,
  has_login_form: false,
  heading_counts: {
    h1: 1,
    h2: 3,
    h3: 2,
    h4: 1,
    h5: 0,
    h6: 0,
  },
  crawled_at: "2024-01-01T00:00:00Z",
};

export const mockPaginatedURLs = {
  data: [mockURLEntry],
  pagination: {
    total: 1,
    page: 1,
    per_page: 10,
    total_pages: 1,
  },
};

export const mockPaginatedResults = {
  data: [mockCrawlResult],
  pagination: {
    total: 1,
    page: 1,
    per_page: 10,
    total_pages: 1,
  },
};

export const mockResultLinks = [
  {
    id: 1,
    url: "https://example.com/link1",
    is_internal: true,
    is_broken: false,
    status_code: 200,
  },
  {
    id: 2,
    url: "https://external.com/link2",
    is_internal: false,
    is_broken: true,
    status_code: 404,
  },
];

// API service mock
export const createMockApiService = () => ({
  // URL Management
  getURLs: vi.fn().mockResolvedValue(mockPaginatedURLs),
  addURL: vi.fn().mockResolvedValue(mockURLEntry),
  deleteURL: vi.fn().mockResolvedValue({}),
  startCrawl: vi.fn().mockResolvedValue({}),
  stopCrawl: vi.fn().mockResolvedValue({}),
  bulkStartCrawl: vi.fn().mockResolvedValue({}),
  bulkStopCrawl: vi.fn().mockResolvedValue({}),
  bulkDeleteURLs: vi.fn().mockResolvedValue({}),

  // Results
  getResults: vi.fn().mockResolvedValue(mockPaginatedResults),
  getResultDetail: vi.fn().mockResolvedValue(mockCrawlResult),
  getResultLinks: vi.fn().mockResolvedValue(mockResultLinks),
});
