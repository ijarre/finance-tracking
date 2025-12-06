import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import StatementListPage from "../StatementListPage";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getStatements: vi.fn(),
}));

describe("StatementListPage", () => {
  it("renders statement list", async () => {
    const mockStatements = [
      {
        id: "1",
        name: "statement_nov.pdf",
        created_at: "2025-11-01",
        status: "processed",
      },
      {
        id: "2",
        name: "statement_dec.pdf",
        created_at: "2025-12-01",
        status: "processed",
      },
    ];

    (api.getStatements as any).mockResolvedValue(mockStatements);

    render(
      <MemoryRouter>
        <StatementListPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Statement List")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("statement_nov.pdf")).toBeInTheDocument();
      expect(screen.getByText("statement_dec.pdf")).toBeInTheDocument();
    });
  });
});
