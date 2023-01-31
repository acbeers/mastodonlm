// This is incomplete - need all of the API methods mocked!
class mockClientAPI {
  async auth(): Promise<string> {
    return "mock_url";
  }
  async ready(): Promise<boolean> {
    return false;
  }
}
const comlinkHook = () => () => ({ proxy: mockClientAPI });
export default comlinkHook;
