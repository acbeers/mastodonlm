import { fireEvent, render, screen } from "@testing-library/react";
import UsersTable from "./UsersTable";

/* TEST DATA */

const group_2members = {
  users: [
    {
      id: "1",
      display_name: "user-1",
      acct: "user-1@domain",
      following: true,
      follower: false,
      lists: [],
    },
    {
      id: "2",
      display_name: "user-2",
      acct: "user-2@domain",
      following: true,
      follower: false,
      lists: ["a"],
    },
  ],
};

const group_2members_suspended = {
  users: [
    {
      id: "1",
      display_name: "user-1",
      acct: "user-1@domain",
      following: true,
      follower: false,
      lists: [],
    },
    {
      id: "2",
      display_name: "user-2",
      acct: "user-2@domain",
      following: true,
      follower: false,
      suspended: true,
      lists: ["a"],
    },
  ],
};

const group_2members_limited = {
  users: [
    {
      id: "1",
      display_name: "user-1",
      acct: "user-1@domain",
      following: true,
      follower: false,
      lists: [],
    },
    {
      id: "2",
      display_name: "user-2",
      acct: "user-2@domain",
      following: true,
      follower: false,
      limited: true,
      lists: ["a"],
    },
  ],
};

const lists_2members = [
  { id: "a", title: "list-a" },
  { id: "b", title: "list-b" },
];

function generateGroup(num) {
  return {
    users: Array.from(Array(num)).map((_, x) => ({
      id: `${x}`,
      display_name: "user-" + x,
      acct: `user-${x}@domain`,
      following: true,
      follower: false,
      lists: x % 2 ? ["a"] : ["b"],
    })),
  };
}

test("renders the whole list of users when open", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(
    <UsersTable groupIndex={1} group={group} lists={lists} defaultOpen={true} />
  );

  group.users.forEach((fol) => {
    const elt = screen.getByText(fol.display_name);
    expect(elt).toBeInTheDocument();
  });
});

test("renders suspended users correctly when open", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(
    <UsersTable groupIndex={1} group={group} lists={lists} defaultOpen={true} />
  );

  group.users.forEach((fol) => {
    const elt = screen.getByText(fol.display_name);
    expect(elt).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    const row = elt.closest("td");

    expect(row.className).toBe(
      fol.suspended ? "usercell suspended" : "usercell"
    );
  });
});

test("renders all lists when open", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(
    <UsersTable groupIndex={1} group={group} lists={lists} defaultOpen={true} />
  );

  lists.forEach((list) => {
    const elt = screen.getByText(list.title);
    expect(elt).toBeInTheDocument();
  });
});

test("has new list", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(
    <UsersTable groupIndex={1} group={group} lists={lists} defaultOpen={true} />
  );

  const newlist = screen.queryByTestId("new-list");
  expect(newlist).toBeInTheDocument();
});

test("new list creates new list", (done) => {
  const group = group_2members;
  const lists = lists_2members;

  const handler = () => done();

  render(
    <UsersTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      onNewList={handler}
    />
  );

  const newlist = screen.queryByTestId("new-list");
  fireEvent.click(newlist);
});

test("opens and closes", () => {
  const group = group_2members;
  const lists = lists_2members;

  render(<UsersTable groupIndex={1} group={group} lists={lists} />);

  const nouser = screen.queryByText(group.users[0].display_name);
  expect(nouser).toEqual(null);

  const expando = screen.getByTestId("ft-expando");

  fireEvent.click(expando);
  const user = screen.queryByText(group.users[0].display_name);
  expect(user).toBeInTheDocument();

  fireEvent.click(expando);
  const nouser2 = screen.queryByText(group.users[0].display_name);
  expect(nouser2).toEqual(null);
});

test("adds", (done) => {
  const group = group_2members;
  const lists = lists_2members;

  const handler = () => done();

  render(
    <UsersTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      add={handler}
    />
  );

  const u1 = group.users[0].id;
  const l1 = lists[0].id;
  const cell = screen.getByTestId(`${l1}${u1}`);

  fireEvent.click(cell);
});

test("removes", (done) => {
  const group = group_2members;
  const lists = lists_2members;

  const handler = () => done();

  render(
    <UsersTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      remove={handler}
    />
  );

  const u2 = group.users[1].id;
  const l1 = lists[0].id;
  const cell = screen.getByTestId(`${l1}${u2}`);

  fireEvent.click(cell);
});

test("adds on page 2", (done) => {
  const group = generateGroup(20);
  const lists = lists_2members;

  const uidx = 10;
  const u1 = group.users[uidx].id;
  const l1 = lists[0].id;

  const handler = (groupIndex, index, lid) => {
    expect(groupIndex).toEqual(1);
    expect(index).toEqual(uidx);
    expect(lid).toEqual(l1);
    done();
  };

  render(
    <UsersTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      add={handler}
      pageSize={10}
    />
  );

  const nextButton = screen.getByTestId("next-page");

  fireEvent.click(nextButton);

  const cell = screen.getByTestId(`${l1}${u1}`);
  fireEvent.click(cell);
});

test("removes on page 2", (done) => {
  const group = generateGroup(20);
  const lists = lists_2members;

  const uidx = 11;
  const u1 = group.users[uidx].id;
  const l1 = lists[0].id;

  const handler = (groupIndex, index, lid) => {
    expect(groupIndex).toEqual(1);
    expect(index).toEqual(uidx);
    expect(lid).toEqual(l1);
    done();
  };

  render(
    <UsersTable
      groupIndex={1}
      group={group}
      lists={lists}
      defaultOpen={true}
      remove={handler}
      pageSize={10}
    />
  );

  const nextButton = screen.getByTestId("next-page");

  fireEvent.click(nextButton);

  const cell = screen.getByTestId(`${l1}${u1}`);
  fireEvent.click(cell);
});

test("shade suspended row", () => {
  const group = group_2members_suspended;
  const lists = lists_2members;

  render(
    <UsersTable groupIndex={1} group={group} lists={lists} defaultOpen={true} />
  );

  const u1 = group.users[1].id;
  const cell = screen.getByTestId(`${u1}`);
  expect(cell.className).toContain("suspended");
});

test("shade limited row", () => {
  const group = group_2members_limited;
  const lists = lists_2members;

  render(
    <UsersTable groupIndex={1} group={group} lists={lists} defaultOpen={true} />
  );

  const u1 = group.users[1].id;
  const cell = screen.getByTestId(`${u1}`);
  expect(cell.className).toContain("limited");
});
