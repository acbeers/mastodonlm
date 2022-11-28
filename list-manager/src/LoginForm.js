import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import "./LoginForm.css";

const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";

function LoginForm() {
  const [error, setError] = useState(null);
  const [redirect, setRedirect] = useState(null);
  const [domain, setDomain] = useState("");

  const handleGo = () => {
    fetch(`${urlAuth}?domain=${domain}`, {
      credentials: "include",
    })
      .then((resp) => resp.json())
      .then((data) => {
        console.log(data);
        if (data.status === "OK") {
          setRedirect(`/manager`);
        } else if (data.status === "not_allowed") {
          setError("Looks like your domain is not currently supported!");
        } else if (data.url) {
          // This one has to be done here, as it is to an external URL.
          const url = data.url;
          window.location = url;
        } else {
          setError("Hm.  Something has gone wrong.  Try again later.");
        }
      });
  };

  if (redirect) {
    return <Navigate to={redirect} />;
  }
  return (
    <div className="loginform_container">
      <div className="loginForm">
        <Typography>
          Welcome to the Mastondon List Manager. To get started, enter your
          instance name below.
        </Typography>
        <TextField
          value={domain}
          onChange={(evt) => setDomain(evt.target.value)}
          sx={{ width: 300, marginTop: "8px" }}
          label="Host"
        />
        <br />
        <Button sx={{ width: 300 }} label="Go" onClick={handleGo}>
          Go
        </Button>
        <div>{error}</div>
        <Typography variant="caption">
          NOTE: This tool uses AWS as a backend, so you'll have to allow
          third-party cookies.
        </Typography>
      </div>
    </div>
  );
}

export default LoginForm;
