import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("./datastore", () => ({
  Datastore: { getAuth: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  fetchAnalytics: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const datastore = await import("./datastore");
const Datastore = datastore.Datastore;
const shared = await import("@mastodonlm/shared");
const fetchAnalytics = shared.fetchAnalytics;

// fetchAnalytics should resolve to a value.
fetchAnalytics.mockResolvedValue("test_value");

// Unit under test
const mod = await import("./analytics_server");
const analytics = mod.analytics;

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  Factory.fromCookie.mockResolvedValue(jest.fn());
  Datastore.getAuth.mockResolvedValue(jest.fn());
});

test("handles no cookie", (done) => {
  const event = {
    headers: {},
  };

  Factory.fromCookie.mockResolvedValue(null);

  analytics(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(401);
      done();
    } catch (err) {
      done(err);
    }
  });
});

test("handles cookie", (done) => {
  const event = {
    headers: { authorization: "value" },
    queryStringParameters: { list_id: "listid" },
  };

  analytics(event, {}).then((res) => {
    try {
      expect(res.statusCode).toBe(200);
      expect(fetchAnalytics).toHaveBeenCalled();
      done();
    } catch (err) {
      done(err);
    }
  });
});
