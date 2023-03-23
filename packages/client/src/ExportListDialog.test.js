import { fireEvent, render, screen, mount } from "@testing-library/react";
import ExportListDialog from "./ExportListDialog";

test("renders the select element", () => {
  const handler = () => {};
  render(
    <ExportListDialog
      lists={[]}
      open={true}
      handleClose={handler}
      handleExport={handler}
    />
  );
  const selectElement = screen.getByTestId("export-list-select");
  expect(selectElement).toBeInTheDocument();
});

test("calls the callback", (done) => {
  let closed = false;
  const closeHandler = () => {
    closed = true;
  };
  const handler = (list) => {
    expect(list.id).toBe("1");
    if (closed) done();
  };
  const lists = [
    { id: "1", title: "foo" },
    { id: "2", title: "bar" },
  ];
  render(
    <ExportListDialog
      lists={lists}
      open={true}
      handleClose={closeHandler}
      handleExport={handler}
    />
  );

  const selectElement = screen.getByTestId("export-list-input");
  // eslint-disable-next-line testing-library/no-node-access
  const selectButton = selectElement.parentNode.querySelector("[role=button]");
  fireEvent.mouseDown(selectButton);

  const fooElement = screen.getByText("foo");
  fireEvent.click(fooElement);

  const button = screen.getByTestId("export-list-button");
  fireEvent.click(button);
});
