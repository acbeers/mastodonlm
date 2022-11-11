import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// This fancy function prevents multiple fetches in useEffect
// in development mode.
const createFetch = () => {
  // Create a cache of fetches by URL
  const fetchMap = {};
  return (url, options) => {
    // Check to see if its not in the cache otherwise fetch it
    if (!fetchMap[url]) {
      fetchMap[url] = fetch(url, options).then((res) => res.json());
    }
    // Return the cached promise
    return fetchMap[url];
  };
};
const myFetch = createFetch();

function LoginCallback() {
  // We'll get code as a URL parameter at this point.
  let { search } = useLocation();

  const query = new URLSearchParams(search);
  const code = query.get("code");

  // Our job is to hand this code to the backend, so it can be used
  // for our work with the server.

  useEffect(() => {
    myFetch("http://localhost:4000/callback?code=" + code, {
      credentials: "include",
      method: "POST",
      data: { code: code },
    }).then(() => (window.location = "/manager"));
  }, [code]);

  return <div>code={code}</div>;
}
export default LoginCallback;
