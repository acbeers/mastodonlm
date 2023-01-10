import { fireEvent, render, screen } from "@testing-library/react";
import TopBar from "./TopBar";

test("renders the account info", () => {
  render(<TopBar acct="test@test.io" />);
  const acct = screen.getByText(/@test@test.io/);
  expect(acct).toBeInTheDocument();
});

test("triggers new list callback", (done) => {
  const handler = () => done();
  render(<TopBar acct="test@test.io" handleMenuNewList={handler} />);
  // Open menu
  const menu = screen.getByTestId("topbar-menu");
  fireEvent.click(menu);
  // Now click the button
  const button = screen.getByText("New List");
  fireEvent.click(button);
});

test("triggers about callback", (done) => {
  const handler = () => done();
  render(<TopBar acct="test@test.io" handleMenuAbout={handler} />);
  // Open menu
  const menu = screen.getByTestId("topbar-menu");
  fireEvent.click(menu);
  // Now click the button
  const button = screen.getByText("About");
  fireEvent.click(button);
});

test("triggers logout callback", (done) => {
  const handler = () => done();
  render(<TopBar acct="test@test.io" handleMenuLogout={handler} />);
  // Open menu
  const menu = screen.getByTestId("topbar-menu");
  fireEvent.click(menu);
  // Now click the button
  const button = screen.getByText("Logout");
  fireEvent.click(button);
});
