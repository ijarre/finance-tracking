import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import StatementDetailPage from "../StatementDetailPage";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getStatement: vi.fn(),
  getTransactions: vi.fn(),
  getEnrichmentLogs: vi.fn(),
  uploadStatementFile: vi.fn(),
  processStatement: vi.fn(),
  updateStatementStatus: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
      }),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("StatementDetailPage", () => {
  it("renders statement details and transactions", async () => {
    const mockStatement = {
      id: "123",
      name: "November Statement",
      status: "parsed",
      created_at: "2025-11-01",
    };
    const mockTransactions = [
      { id: "1", transaction_name: "Coffee", amount: 5000, date: "2025-11-05" },
    ];
    const mockLogs: any[] = [];

    (api.getStatement as any).mockResolvedValue(mockStatement);
    (api.getTransactions as any).mockResolvedValue(mockTransactions);
    (api.getEnrichmentLogs as any).mockResolvedValue(mockLogs);

    render(
      <MemoryRouter initialEntries={["/statement/123"]}>
        <Routes>
          <Route path="/statement/:id" element={<StatementDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("November Statement")).toBeInTheDocument();
      expect(screen.getByText("Parsed")).toBeInTheDocument();
      expect(screen.getByText("Coffee")).toBeInTheDocument();
    });
  });

  it("renders upload UI for draft statement", async () => {
    const mockStatement = {
      id: "124",
      name: "Draft Statement",
      status: "draft",
      created_at: "2025-12-01",
    };

    (api.getStatement as any).mockResolvedValue(mockStatement);
    (api.getTransactions as any).mockResolvedValue([]);
    (api.getEnrichmentLogs as any).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/statement/124"]}>
        <Routes>
          <Route path="/statement/:id" element={<StatementDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Bank Statement")).toBeInTheDocument();
      expect(screen.getByText("Parse Statement")).toBeInTheDocument();
    });
  });
});
