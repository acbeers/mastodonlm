import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("./datastore", () => ({
  Datastore: { getAuth: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  follow: jest.fn(),
  unfollow: jest.fn(),
  follow_by_names: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const datastore = await import("./datastore");
const Datastore = datastore.Datastore;
const shared = await import("@mastodonlm/shared");
const follow = shared.follow;
const unfollow = shared.unfollow;
const follow_by_names = shared.follow_by_names;

// follow should resolve to a value.
follow.mockResolvedValue(void 0);
unfollow.mockResolvedValue(void 0);

// Unit under test
const mod = await import("./follow_server");
const follow_handler = mod.follow_handler;
const unfollow_handler = mod.unfollow_handler;
const follow_by_names_handler = mod.follow_by_names_handler;

test("follow succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  follow.mockResolvedValue(void 0);

  follow_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(200);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("follow fails", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  follow.mockRejectedValue(void 0);

  follow_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(500);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("unfollow succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  unfollow.mockResolvedValue(void 0);

  unfollow_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(200);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("unfollow fails", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  unfollow.mockRejectedValue(void 0);

  unfollow_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(500);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("follow_by_names succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  follow_by_names.mockResolvedValue([{}]);

  follow_by_names_handler(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(200);
      done();
    } catch (err) {
      done(err);
    }
  });
});
