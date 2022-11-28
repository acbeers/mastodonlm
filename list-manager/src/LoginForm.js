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
  const [enabled, setEnabled] = useState(true);

  const handleGo = () => {
    setError("");
    setEnabled(false);
    fetch(`${urlAuth}?domain=${domain}`, {
      credentials: "include",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.errorType === "LambdaTimeoutError") {
          setError("Seems the backend has timed out.  Try again another time.");
          setEnabled(true);
        } else if (data.status === "OK") {
          setRedirect(`/manager`);
        } else if (data.status === "not_allowed") {
          setError("Looks like your domain is not currently supported!");
          setEnabled(true);
        } else if (data.url) {
          // This one has to be done here, as it is to an external URL.
          const url = data.url;
          window.location = url;
        } else {
          setError("Hm.  Something has gone wrong.  Try again later.");
          setEnabled(true);
        }
      })
      .catch((err) => {
        setEnabled(true);
        setError("Hm.  Something has gone wrong.  Try again later.");
      });
  };

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  return (
    <div className="loginform_container">
      <div className="loginForm">
        <Typography variant="body">
          To get started, enter your instance name below (e.g. mastodon.social)
        </Typography>
        <TextField
          value={domain}
          onChange={(evt) => setDomain(evt.target.value)}
          sx={{ width: "100%", mt: 2, mb: 1 }}
          label="Host"
          onKeyPress={(ev) => {
            if (ev.key === "Enter") {
              handleGo();
              ev.preventDefault();
            }
          }}
        />
        <br />
        <Button
          sx={{ width: "100%" }}
          label={enabled ? "Go" : "Authenticating..."}
          onClick={handleGo}
          variant="contained"
          disabled={!enabled}
        >
          {enabled ? "Go" : "Authenticating..."}
        </Button>
        <div className="error">
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
