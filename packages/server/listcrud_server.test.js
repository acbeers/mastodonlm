import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("./datastore", () => ({
  Datastore: { getAuth: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  list_create: jest.fn(),
  list_delete: jest.fn(),
  list_add: jest.fn(),
  list_remove: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const datastore = await import("./datastore");
const Datastore = datastore.Datastore;
const shared = await import("@mastodonlm/shared");
const list_create = shared.list_create;
const list_delete = shared.list_delete;
const list_add = shared.list_add;
const list_remove = shared.list_remove;

// Unit under test
const mod = await import("./listcrud_server");

const list_create_handler = mod.list_create_handler;
const list_delete_handler = mod.list_delete_handler;
const list_add_handler = mod.list_add_handler;
const list_remove_handler = mod.list_remove_handler;

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
});

test("list create succeeds, return a list", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123" },
  };

  list_create.mockResolvedValue({ list: { id: 123, title: "list-123" } });

  list_create_handler(event, {}).then((res) => {
    const exp = {
      list: { id: 123, title: "list-123" },
      status: "OK",
    };
    try {
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe(JSON.stringify(exp));
      expect(list_create).toHaveBeenCalled();
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("list create fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123" },
  };

  list_create.mockRejectedValue(jest.fn());

  list_create_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(500);
      expect(list_create).toHaveBeenCalled();
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("list delete succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_id: "123" },
  };

  list_delete.mockResolvedValue(jest.fn());

  list_delete_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(200);
      expect(list_delete).toHaveBeenCalled();
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("list delete fails, return an error", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_name: "list-123" },
  };

  list_delete.mockRejectedValue(jest.fn());

  list_delete_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(500);
      expect(list_delete).toHaveBeenCalled();
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("list add succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { list_id: "123", account_id: "45" },
  };

  list_add.mockResolvedValue(jest.fn());

  list_add_handler(event, {}).then((res) => {
    try {
      expect(list_add).toBeCalled();
      expect(res.statusCode).toBe(200);
      done();
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

  list_add.mockRejectedValue(jest.fn());

  list_add_handler(event, {}).then((res) => {
    try {
      expect(list_add).toBeCalled();
      expect(res.statusCode).toBe(500);
      done();
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

  list_remove.mockResolvedValue(jest.fn());

  list_remove_handler(event, {}).then((res) => {
    try {
      expect(list_remove).toBeCalled();
      expect(res.statusCode).toBe(200);
      done();
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

  list_remove.mockRejectedValue(jest.fn());

  list_remove_handler(event, {}).then((res) => {
    try {
      expect(list_remove).toBeCalled();
      expect(res.statusCode).toBe(500);
      done();
    } catch (err) {
      done(err);
    }
  });
});
