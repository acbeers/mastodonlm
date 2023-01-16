import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import API from "./api";

function Login() {
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    API.tryAuth()
      .then((resp) => resp.json())
      .then((data) => {
        if (data.status === "OK") {
          // This means we are already logged in
          setRedirect(`/manager`);
        } else if (data.status === "not_allowed") {
          setRedirect(`/main`);
        } else {
          // If we aren't logged in, we have to ask he user for a domain
          setRedirect("/main");
        }
      });
  }, []);

  if (redirect) {
    return <Navigate to={redirect} />;
  }
  return <span />;
}

export default Login;
