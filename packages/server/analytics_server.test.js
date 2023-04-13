import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  fetchAnalytics: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const shared = await import("@mastodonlm/shared");
const fetchAnalytics = shared.fetchAnalytics;

// fetchAnalytics should resolve to a value.
fetchAnalytics.mockResolvedValue("test_value");

// Unit under test
const mod = await import("./analytics_server");
const analytics = mod.analytics;

test("handles no cookie", (done) => {
  const event = {
    headers: {},
  };

  Factory.fromCookie.mockResolvedValue(null);
  analytics(event, {}).then((res) => {
    if (res.statusCode === 401) done();
  });
});

test("handles cookie", (done) => {
  const event = {
    headers: { authorization: "value" },
    queryStringParameters: { list_id: "listid" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  analytics(event, {}).then((res) => {
    if (res.statusCode === 200) {
      expect(fetchAnalytics).toHaveBeenCalled();
      done();
    }
  });
});
