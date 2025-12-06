import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

describe("LoginPage", () => {
  it("renders login form", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Login", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it("can toggle to sign up", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const toggle = screen.getByText(/Don't have an account/i).nextSibling;
    fireEvent.click(toggle!);

    expect(
      screen.getByText("Sign Up", { selector: "div" })
    ).toBeInTheDocument();
  });

  it("calls signInWithPassword on submit", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Login/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });
});
