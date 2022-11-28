import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import Typography from "@mui/material/Typography";

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

const urlCallback = process.env.REACT_APP_BACKEND_URL + "/callback";

function LoginCallback() {
  const [redirect, setRedirect] = useState(null);

  // We'll get code as a URL parameter at this point.
  let { search } = useLocation();

  const query = new URLSearchParams(search);
  const code = query.get("code");
  const domain = query.get("domain");

  // Our job is to hand this code to the backend, so it can be used
  // for our work with the server.

  useEffect(() => {
    myFetch(`${urlCallback}?code=${code}&domain=${domain}`, {
      credentials: "include",
      method: "POST",
      data: { code: code },
    }).then((data) => {
      // This data will have an token that we can use.
      window.sessionStorage.setItem("list-manager-cookie", data.auth);
      setRedirect(`/manager`);
    });
  }, [code, domain]);

  if (redirect) {
    return <Navigate to={redirect} />;
  }
  return (
    <div>
      <Typography variant="body">Logging you in...</Typography>
    </div>
  );
}
export default LoginCallback;
