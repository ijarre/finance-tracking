import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DuplicateTransactionsPage from "../DuplicateTransactionsPage";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getDuplicateTransactions: vi.fn(),
  getTransactionsByIds: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

describe("DuplicateTransactionsPage", () => {
  it("renders potential duplicates", async () => {
    const mockDuplicates = [
      {
        id: "1",
        transaction_name: "Dup Receipt",
        amount: 50000,
        date: "2025-12-01",
        currency: "IDR",
        type: "expense",
        match_id: "100", // Links to existing transaction
      },
    ];

    const mockMatches = [
      {
        id: "100",
        transaction_name: "Statement TX",
        amount: 50000,
        date: "2025-12-01",
        currency: "IDR",
        type: "expense",
      },
    ];

    (api.getDuplicateTransactions as any).mockResolvedValue(mockDuplicates);
    (api.getTransactionsByIds as any).mockResolvedValue(mockMatches);

    render(
      <MemoryRouter>
        <DuplicateTransactionsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Duplicate Management")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Dup Receipt")).toBeInTheDocument();
    });
  });

  it("shows empty state when no duplicates", async () => {
    (api.getDuplicateTransactions as any).mockResolvedValue([]);
    (api.getTransactionsByIds as any).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DuplicateTransactionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No duplicate transactions found/i)
      ).toBeInTheDocument();
    });
  });
});
