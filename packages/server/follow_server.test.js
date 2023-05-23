import { jest } from "@jest/globals";

// Modules I'm mocking
jest.unstable_mockModule("./factory", () => ({
  Factory: { fromCookie: jest.fn() },
}));
jest.unstable_mockModule("@mastodonlm/shared", () => ({
  follow: jest.fn(),
  unfollow: jest.fn(),
}));

// Things I'm mocking
// Some values will be set inside tests.
const factory = await import("./factory");
const Factory = factory.Factory;
const shared = await import("@mastodonlm/shared");
const follow = shared.follow;
const unfollow = shared.unfollow;

// follow should resolve to a value.
follow.mockResolvedValue(void 0);
unfollow.mockResolvedValue(void 0);

// Unit under test
const mod = await import("./follow_server");
const follow_handler = mod.follow_handler;

test("follow succeeds", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  follow_handler(event, {}).then((res) => {
    if (res.statusCode === 200) done();
  });
});

test("follow fails", (done) => {
  const event = {
    headers: {},
    queryStringParameters: { user_id: "123" },
  };

  Factory.fromCookie.mockResolvedValue(jest.fn());
  follow.mockRejectedValue(void 0);
  follow_handler(event, {}).then((res) => {
    if (res.statusCode === 500) done();
  });
});
