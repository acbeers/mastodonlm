// This file handles an oAuth callback, by simply storing the code and domain in
// local storage, and then redirecting to the main app.  We do this so the main
// app can redeem the code for a token without loading a new URL, because a web
// worker will handle authorization and token storage, and must stay loaded so
// it doesn't lose that token.

import { useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";

export default function Callback() {
  // For extracting query string parameters
  const { search } = useLocation();

  // If we have a code, redeem it.
  const query = new URLSearchParams(search);
  const code = query.get("code");
  const domain = query.get("domain");

  if (code && domain) {
    localStorage.setItem("code", code);
    localStorage.setItem("domain", domain);

    return <Navigate to="/manager" />;
  }
  return <Navigate to="/main" />;
}
