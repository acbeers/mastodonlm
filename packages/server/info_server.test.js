import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("./datastore", () => ({
  Datastore: { getAuth: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  info_meta: jest.fn(),
  info_following: jest.fn(),
  info_followers: jest.fn(),
  info_lists: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const datastore = await import("./datastore");
const Datastore = datastore.Datastore;
const shared = await import("@mastodonlm/shared");
const info_meta = shared.info_meta;
const info_following = shared.info_following;
const info_followers = shared.info_followers;

// Unit under test
const mod = await import("./info_server");
const info_meta_handler = mod.info_meta_handler;
const info_following_handler = mod.info_following_handler;
const info_followers_handler = mod.info_followers_handler;

afterEach(() => {
  jest.clearAllMocks();
});

test("meta succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: {},
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  info_meta.mockResolvedValue({});

  info_meta_handler(event, {}).then((res) => {
    try {
      expect(info_meta).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("following succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: {},
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  info_following.mockResolvedValue({});

  info_following_handler(event, {}).then((res) => {
    try {
      expect(info_following).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("followers succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: {},
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
  info_followers.mockResolvedValue({});

  info_followers_handler(event, {}).then((res) => {
    try {
      expect(info_followers).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      done();
    } catch (err) {
      done(err);
    }
  });
});
