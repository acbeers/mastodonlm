import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./ComlinkHook");

test("renders without exception", async () => {
  render(<App />);
});
