import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import Typography from "@mui/material/Typography";

import API from "./api";

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
    API.authCallback(code, domain).then((data) => {
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
