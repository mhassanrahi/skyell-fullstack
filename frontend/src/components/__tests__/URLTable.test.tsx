import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import URLTable from "../URLTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "../../services/api";

// Mock data
const mockURLs = [
  {
    id: 1,
    url: "https://example.com",
    status: "completed" as const,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    error_message: undefined,
    user_id: 1,
  },
  {
    id: 2,
    url: "https://test.com",
    status: "running" as const,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    error_message: undefined,
    user_id: 1,
  },
];

// Mock API service
vi.mock("../../services/api", () => ({
  default: {
    getURLs: vi.fn(),
    startCrawl: vi.fn(),
    stopCrawl: vi.fn(),
    deleteURL: vi.fn(),
    bulkStartCrawl: vi.fn(),
    bulkStopCrawl: vi.fn(),
    bulkDeleteURLs: vi.fn(),
  },
}));

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("URLTable", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default successful responses
    vi.mocked(api.getURLs).mockResolvedValue({
      data: mockURLs,
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        total_pages: 1,
      },
    });

    vi.mocked(api.startCrawl).mockResolvedValue();
    vi.mocked(api.stopCrawl).mockResolvedValue();
    vi.mocked(api.deleteURL).mockResolvedValue();
    vi.mocked(api.bulkStartCrawl).mockResolvedValue();
    vi.mocked(api.bulkStopCrawl).mockResolvedValue();
    vi.mocked(api.bulkDeleteURLs).mockResolvedValue();
  });

  it("renders table with URL data", async () => {
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for data to load first
    await screen.findByText("https://example.com");
    await screen.findByText("https://test.com");

    // Then check for table title
    expect(screen.getByText("Your URLs")).toBeInTheDocument();
  });

  it("displays status badges correctly", async () => {
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for data to load by finding the URLs first
    await screen.findByText("https://example.com");
    await screen.findByText("https://test.com");

    // Check for status badges within table cells (not the dropdown)
    expect(
      screen.getByRole("cell", { name: /completed/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /running/i })).toBeInTheDocument();
  });

  it("shows search input and filters", async () => {
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for the component to load data and render the search input
    await screen.findByText("https://example.com");

    expect(screen.getByPlaceholderText("Search URLs...")).toBeInTheDocument();
    expect(screen.getByDisplayValue("All Status")).toBeInTheDocument();
  });

  it("allows user to search URLs", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for the component to load data first
    await screen.findByText("https://example.com");

    const searchInput = screen.getByPlaceholderText("Search URLs...");
    await user.type(searchInput, "example");

    expect(searchInput).toHaveValue("example");
  });

  it("shows action buttons for each URL", async () => {
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for data to load
    await screen.findByText("https://example.com");

    // Should have Start/Stop buttons (based on URL status)
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();

    // Should have Delete buttons
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it("displays checkboxes for bulk selection", async () => {
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for data to load
    await screen.findByText("https://example.com");

    // Should have checkboxes for each row
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("allows user to select URLs with checkboxes", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for data to load
    await screen.findByText("https://example.com");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]); // Click first URL checkbox

    // Should show bulk actions when selected
    expect(screen.getByText(/selected/)).toBeInTheDocument();
  });

  it("shows sortable column headers", async () => {
    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Wait for the component to load data first
    await screen.findByText("https://example.com");

    expect(screen.getByText("URL")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("displays empty state when no URLs", async () => {
    // Mock empty response
    vi.mocked(api.getURLs).mockResolvedValue({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        total_pages: 0,
      },
    });

    render(
      <TestWrapper>
        <URLTable />
      </TestWrapper>
    );

    // Should show empty state message
    expect(
      await screen.findByText(
        "No URLs found. Add your first URL above to get started!"
      )
    ).toBeInTheDocument();
  });
});
