import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TransactionListPage from "../TransactionListPage";
import * as api from "@/lib/api";

// Mock the API
vi.mock("@/lib/api", () => ({
  getTransactionsByDateRange: vi.fn(),
  updateTransaction: vi.fn(),
}));

// Mock the DateRangePicker to avoid complex interactions in integration test if needed,
// but for now let's use the real one since it's "integration".
// However, ResizeObserver might be missing in jsdom for some ui components.
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("TransactionListPage", () => {
  it("renders list of transactions", async () => {
    const mockTransactions = [
      {
        id: "1",
        date: "2025-12-05",
        amount: 100000,
        transaction_name: "Grocery Shopping",
        category: "Groceries",
        type: "expense",
        notes: "Weekly needs",
      },
    ];

    (api.getTransactionsByDateRange as any).mockResolvedValue(mockTransactions);

    render(
      <MemoryRouter>
        <TransactionListPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Audit Transactions")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Grocery Shopping")).toBeInTheDocument();
      expect(screen.getByText("IDR 100,000")).toBeInTheDocument();
      expect(screen.getByText("Weekly needs")).toBeInTheDocument();
    });
  });
});
