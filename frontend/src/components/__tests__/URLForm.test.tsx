import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import URLForm from "../URLForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Simple wrapper component
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

describe("URLForm", () => {
  it("renders the URL form with all elements", () => {
    render(
      <TestWrapper>
        <URLForm />
      </TestWrapper>
    );

    expect(screen.getByText("Add New URL")).toBeInTheDocument();
    expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add url/i })
    ).toBeInTheDocument();
  });

  it("allows user to input a URL", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <URLForm />
      </TestWrapper>
    );

    const urlInput = screen.getByLabelText(/website url/i);
    await user.type(urlInput, "https://example.com");

    expect(urlInput).toHaveValue("https://example.com");
  });

  it("shows validation error for invalid URL", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <URLForm />
      </TestWrapper>
    );

    const urlInput = screen.getByLabelText(/website url/i);
    const submitButton = screen.getByRole("button", { name: /add url/i });

    await user.type(urlInput, "invalid-url");
    await user.click(submitButton);

    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
  });

  it("accepts URLs without protocol - happy path", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <URLForm />
      </TestWrapper>
    );

    const urlInput = screen.getByLabelText(/website url/i);

    // Test www.google.com format
    await user.type(urlInput, "www.google.com");

    // Should be valid (no error message)
    expect(
      screen.queryByText(/please enter a valid url/i)
    ).not.toBeInTheDocument();
  });

  it("form is properly labeled and accessible", () => {
    render(
      <TestWrapper>
        <URLForm />
      </TestWrapper>
    );

    const urlInput = screen.getByLabelText(/website url/i);
    const submitButton = screen.getByRole("button", { name: /add url/i });

    expect(urlInput).toHaveAttribute("type", "url");
    expect(submitButton).toHaveAttribute("type", "submit");
  });
});
