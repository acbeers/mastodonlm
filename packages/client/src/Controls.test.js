import { fireEvent, render, screen } from "@testing-library/react";
import Controls from "./Controls";

test("renders the select element", () => {
  render(<Controls groupBy="none" />);
  const selectElement = screen.getByTestId("controls-groupby-select");
  expect(selectElement).toBeInTheDocument();
});

test("selects the none groupby", () => {
  render(<Controls groupBy="none" />);
  const selectedElement = screen.getByText("Nothing");
  expect(selectedElement).toBeInTheDocument();
});

test("selects the name groupby", () => {
  render(<Controls groupBy="name" />);
  const selectedElement = screen.getByText("Name (first letter)");
  expect(selectedElement).toBeInTheDocument();
});

test("selects the domain groupby", () => {
  render(<Controls groupBy="domain" />);
  const selectedElement = screen.getByText("Account domain");
  expect(selectedElement).toBeInTheDocument();
});

test("renders the search element", () => {
  render(<Controls groupBy="none" />);
  const searchElement = screen.getByTestId("controls-search-textfield");
  expect(searchElement).toBeInTheDocument();
});

test("fires the search method", (done) => {
  const handler = (val) => {
    expect(val).toEqual("A");
    done();
  };
  render(<Controls groupBy="none" handleSearchChange={handler} />);
  const searchElement = screen.getByLabelText("Search");
  fireEvent.change(searchElement, { target: { value: "A" } });
});

test("fires the groupby method", (done) => {
  const handler = (val) => {
    expect(val).toEqual("name");
    done();
  };
  render(<Controls groupBy="none" handleGroupByChange={handler} />);
  const selectElement = screen.getByTestId("controls-groupby-input");
  fireEvent.change(selectElement, { target: { value: "name" } });
});

test("renders the filter element - everything", () => {
  render(<Controls filter="everything" />);
  const searchElement = screen.getByTestId("controls-filter-select");
  expect(searchElement).toBeInTheDocument();
  const selectedElement = screen.getByText("Everything");
  expect(selectedElement).toBeInTheDocument();
});

test("renders the filter element - nolists", () => {
  render(<Controls filter="nolists" />);
  const searchElement = screen.getByTestId("controls-filter-select");
  expect(searchElement).toBeInTheDocument();
  const selectedElement = screen.getByText("Not on any list");
  expect(selectedElement).toBeInTheDocument();
});

test("renders the filter element - lists", () => {
  const lists = [
    { id: 1, title: "List A" },
    { id: 2, title: "List B" },
  ];
  render(<Controls filter="not:2" lists={lists} />);
  const searchElement = screen.getByTestId("controls-filter-select");
  expect(searchElement).toBeInTheDocument();
  const selectedElement = screen.getByText("Not on List B");
  expect(selectedElement).toBeInTheDocument();
});

test("fires the filter method", (done) => {
  const handler = (val) => {
    expect(val).toEqual("nolists");
    done();
  };
  render(<Controls filter="everything" handleFilterChange={handler} />);
  const selectElement = screen.getByTestId("controls-filter-input");
  fireEvent.change(selectElement, { target: { value: "nolists" } });
});
