import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";

function Login(params) {
  //const site = params.site;

  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    fetch(urlAuth, {
      credentials: "include",
    })
      .then((resp) => resp.json())
      .then((data) => {
        console.log(data);
        if (data.status === "OK") {
          setRedirect(`/manager`);
        } else {
          // This one has to be done here, as it is to an external URL.
          const url = data.url;
          window.location = url;
        }
      });
  }, []);

  if (redirect) {
    return <Navigate to={redirect} />;
  }
  return "";
}

export default Login;
