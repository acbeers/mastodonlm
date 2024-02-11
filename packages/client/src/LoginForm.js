import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import "./LoginForm.css";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function LoginForm({ api }) {
  const [error, setError] = useState(null);
  const [redirect, setRedirect] = useState(null);
  const [domain, setDomain] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [service, setService] = useState(0);

  const handleBlueskyGo = async () => {
    const remote = await api;
    remote
      .login("bluesky", user, pass)
      .then(() => {
        setPass("");
        setRedirect("/manager");
      })
      .catch((err) => {
        if (err.name === "AuthError") setError("Invalid username or password");
        else setError("Something bad happened.");
      });
  };

  const handleMastoGo = async () => {
    setError("");
    setEnabled(false);

    const remote = await api;
    remote
      .auth("mastodon", domain)
      .then((data) => {
        if (data.url) {
          // This one has to be done here, as it is to an external URL.
          const url = data.url;
          window.location = url;
        } else {
          setError("Hm.  Something has gone wrong.  Try again later. 2");
          setEnabled(true);
        }
      })
      .catch((err) => {
        console.log(err);
        // NOTE: err.name is used here instead of instanceOf because Error subclasses don't
        // seem to survive going across Comlink - errors are instnaces of the subclasses in
        // the webworker, but once they arrive here they are instances of Error
        if (err.name === "TimeoutError") {
          setError("Seems the backend has timed out.  Try again another time.");
          setEnabled(true);
        } else if (err.name === "BadHostError") {
          setError(
            "Please enter a hostname of a Mastodon server (e.g. mastodon.social)"
          );
          setEnabled(true);
        } else if (err.name === "NotAllowedError") {
          setError("Looks like your domain is not currently supported!");
          setEnabled(true);
        } else {
          setEnabled(true);
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
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={service}
            onChange={(e, nv) => setService(nv)}
            aria-label="basic tabs example"
          >
            <Tab label="Mastodon" />
            <Tab label="Bluesky" />
          </Tabs>
        </Box>
        <CustomTabPanel value={service} index={0}>
          <Typography variant="body">
            Enter your instance name below (e.g. mastodon.social)
          </Typography>
          <TextField
            value={domain}
            onChange={(evt) => setDomain(evt.target.value)}
            sx={{ width: "100%", mt: 2, mb: 1 }}
            label="Host"
            onKeyPress={(ev) => {
              if (ev.key === "Enter") {
                handleMastoGo();
                ev.preventDefault();
              }
            }}
          />
          <br />
          <Button
            sx={{ width: "100%" }}
            label={enabled ? "Go" : "Authenticating..."}
            onClick={handleMastoGo}
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
        </CustomTabPanel>

        <CustomTabPanel value={service} index={1}>
          <Typography variant="body">
            Enter your Bluesky username and app password.
          </Typography>
          <TextField
            value={user}
            onChange={(evt) => setUser(evt.target.value)}
            sx={{ width: "100%", mt: 2, mb: 1 }}
            label="Bluesky username"
            onKeyPress={(ev) => {
              if (ev.key === "Enter") {
                handleBlueskyGo();
                ev.preventDefault();
              }
            }}
          />
          <TextField
            value={pass}
            onChange={(evt) => setPass(evt.target.value)}
            sx={{ width: "100%", mt: 0, mb: 1 }}
            label="Password"
            type="password"
            onKeyPress={(ev) => {
              if (ev.key === "Enter") {
                handleBlueskyGo();
                ev.preventDefault();
              }
            }}
          />{" "}
          <br />
          <Button
            sx={{ width: "100%" }}
            label={enabled ? "Go" : "Authenticating..."}
            onClick={handleBlueskyGo}
            variant="contained"
            disabled={!enabled}
          >
            {enabled ? "Go" : "Authenticating..."}
          </Button>
          <div className="error">
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          </div>{" "}
        </CustomTabPanel>
      </div>
    </div>
  );
}

export default LoginForm;
