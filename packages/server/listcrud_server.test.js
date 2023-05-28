import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  list_create: jest.fn(),
  list_delete: jest.fn(),
  list_add: jest.fn(),
  list_remove: jest.fn(),
  list_import: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const shared = await import("@mastodonlm/shared");
const list_create = shared.list_create;
const list_delete = shared.list_delete;
const list_add = shared.list_add;
const list_remove = shared.list_remove;
const list_import = shared.list_import;

// Unit under test
const mod = await import("./listcrud_server");

const list_create_handler = mod.list_create_handler;
const list_delete_handler = mod.list_delete_handler;
const list_add_handler = mod.list_add_handler;
const list_remove_handler = mod.list_remove_handler;
const list_import_handler = mod.list_import_handler;

afterEach(() => {
  jest.clearAllMocks();
});

test("list create succeeds, return a list", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_create.mockResolvedValue({ id: 123, title: "list-123" });

  list_create_handler(event, {}).then((res) => {
    const exp = {
      list: { id: 123, title: "list-123" },
      status: "OK",
    };
    if (res.statusCode === 200 && res.body == JSON.stringify(exp)) done();
  });
});

test("list create fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_create.mockRejectedValue(jest.fn());

  list_create_handler(event, {}).then((res) => {
    if (res.statusCode === 500) done();
  });
});

test("list delete succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_delete.mockResolvedValue(jest.fn());

  list_delete_handler(event, {}).then((res) => {
    if (res.statusCode === 200) done();
  });
});

test("list delete fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_delete.mockRejectedValue(jest.fn());

  list_delete_handler(event, {}).then((res) => {
    if (res.statusCode === 500) done();
  });
});

test("list add succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_id: "123", account_id: "45" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_add.mockResolvedValue(jest.fn());

  list_add_handler(event, {}).then((res) => {
    try {
      expect(list_add).toBeCalled();
      if (res.statusCode === 200) done();
    } catch (err) {
      done(err);
    }
  });
});

test("list add fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123", account_id: "45" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_add.mockRejectedValue(jest.fn());

  list_add_handler(event, {}).then((res) => {
    try {
      expect(list_add).toBeCalled();
      if (res.statusCode === 500) done();
    } catch (err) {
      done(err);
    }
  });
});

test("list remove succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_id: "123", account_id: "45" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_remove.mockResolvedValue(jest.fn());

  list_remove_handler(event, {}).then((res) => {
    try {
      expect(list_remove).toBeCalled();
      if (res.statusCode === 200) done();
    } catch (err) {
      done(err);
    }
  });
});

test("list remove fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123", account_id: "45" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_remove.mockRejectedValue(jest.fn());

  list_remove_handler(event, {}).then((res) => {
    try {
      expect(list_remove).toBeCalled();
      if (res.statusCode === 500) done();
    } catch (err) {
      done(err);
    }
  });
});

test("list import succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_id: "123", accts: "1,2,3" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_import.mockResolvedValue(jest.fn());

  list_import_handler(event, {}).then((res) => {
    try {
      expect(list_import).toBeCalled();
      if (res.statusCode === 200) done();
    } catch (err) {
      done(err);
    }
  });
});

test("list import fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123", accts: "1,2,3" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  list_import.mockRejectedValue(jest.fn());

  list_import_handler(event, {}).then((res) => {
    try {
      expect(list_import).toBeCalled();
      if (res.statusCode === 500) done();
    } catch (err) {
      done(err);
    }
  });
});
