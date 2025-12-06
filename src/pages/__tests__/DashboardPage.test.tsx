import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import * as api from "@/lib/api";

// Mock the API
vi.mock("@/lib/api", () => ({
  getTransactionsByDateRange: vi.fn(),
}));

describe("DashboardPage", () => {
  it("renders correctly and loads data", async () => {
    // Mock return value for API
    const mockTransactions = [
      {
        id: "1",
        date: "2025-12-01",
        amount: 50000,
        transaction_name: "Test Income",
        category: "Salary",
        type: "income",
      },
      {
        id: "2",
        date: "2025-12-02",
        amount: 20000,
        transaction_name: "Test Expense",
        category: "Food",
        type: "expense",
      },
    ];

    (api.getTransactionsByDateRange as any).mockResolvedValue(mockTransactions);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // check title
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Your financial playground")).toBeInTheDocument();

    // Check loading state (might be too fast to catch, but check eventual state)
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Total Income")).toBeInTheDocument();
      expect(screen.getByText("IDR 50,000")).toBeInTheDocument(); // Formatted currency
    });

    expect(screen.getByText("Total Expense")).toBeInTheDocument();
    expect(screen.getByText("IDR 20,000")).toBeInTheDocument();
  });
});
