import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth";
import { App } from "./app";

vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return { ...original, getToken: () => null, api: vi.fn() };
});

describe("página inicial", () => {
  it("presenta las reglas centrales y una acción para buscar horarios", () => {
    render(<MemoryRouter><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /la pista está/i })).toBeInTheDocument();
    expect(screen.getByText(/grupos de 2 a 8/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buscar una tanda/i })).toHaveAttribute("href", "/reservar");
  });
});
