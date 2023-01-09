import { fireEvent, render, screen } from "@testing-library/react";
import FollowingTable from "./FollowingTable";

/* TEST DATA */

const group_2members = {
  followers: [
    { id: "1", display_name: "user-1", lists: [] },
    { id: "2", display_name: "user-2", lists: ["a"] },
  ],
};

const lists_2members = [
  { id: "a", title: "list-a" },
  { id: "b", title: "list-b" },
];

test("renders the whole list of users when open", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(
    <FollowingTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
    />
  );

  group.followers.forEach((fol) => {
    const elt = screen.getByText(fol.display_name);
    expect(elt).toBeInTheDocument();
  });
});

test("renders all lists when open", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(
    <FollowingTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
    />
  );

  lists.forEach((list) => {
    const elt = screen.getByText(list.title);
    expect(elt).toBeInTheDocument();
  });
});

test("opens and closes", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(<FollowingTable groupIndex={1} group={group} lists={lists} />);

  const nouser = screen.queryByText(group.followers[0].display_name);
  expect(nouser).toEqual(null);

  const expando = screen.getByTestId("ft-expando");

  fireEvent.click(expando);
  const user = screen.queryByText(group.followers[0].display_name);
  expect(user).toBeInTheDocument();

  fireEvent.click(expando);
  const nouser2 = screen.queryByText(group.followers[0].display_name);
  expect(nouser2).toEqual(null);
});

test("adds", (done) => {
  const group = group_2members;
  const lists = lists_2members;

  const handler = () => done();

  render(
    <FollowingTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      add={handler}
    />
  );

  const u1 = group.followers[0].id;
  const l1 = lists[0].id;
  const cell = screen.getByTestId(`${l1}${u1}`);

  fireEvent.click(cell);
});

test("removes", (done) => {
  const group = group_2members;
  const lists = lists_2members;

  const handler = () => done();

  render(
    <FollowingTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      remove={handler}
    />
  );

  const u2 = group.followers[1].id;
  const l1 = lists[0].id;
  const cell = screen.getByTestId(`${l1}${u2}`);

  fireEvent.click(cell);
});
