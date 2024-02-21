import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import LoginForm from "./LoginForm";

function Copyright() {
  return (
    <div>
      <Typography variant="body2" color="text.secondary" align="center">
        {"Copyright © "}
        <Link color="inherit" href="https://hachyderm.io/@acbeers">
          Andrew Beers
        </Link>{" "}
        {new Date().getFullYear()}
        {". "}
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        <Link
          color="inherit"
          href="https://github.com/acbeers/mastodonlm/blob/main/LICENSE.md"
        >
          License
        </Link>
        {" | "}
        <Link color="inherit" href="https://github.com/acbeers/mastodonlm">
          Source
        </Link>
      </Typography>
    </div>
  );
}

const theme = createTheme();

function MainPage({ api }) {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          bgcolor: "background.paper",
          pt: 4,
          pb: 4,
        }}
      >
        <Container maxWidth="sm">
          <Typography
            component="h1"
            variant="h3"
            align="center"
            color="text.primary"
            gutterBottom
          >
            {process.env.REACT_APP_NAME}
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            paragraph
          >
            A really simple manager for all of your Mastodon and Bluesky Lists,
            letting you quickly assign people that you are following to one or
            more lists. Search, filter, and organize your follow list to make
            reasoning about your lists easy.
          </Typography>
          <LoginForm api={api} />
        </Container>
      </Box>
      <Box sx={{ bgcolor: "background.paper" }}>
        <Container maxWidth="sm">
          <Typography color="text.secondary">
            Other stuff you should know:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ul>
              <li>
                This should work even if you are following many thousands of
                accounts. Use the page size to keep the size of the tables under
                control, and search/group/filter to find the accounts you want
                to change.
              </li>
              <li>
                I collect some telemetry about usage that's tied to your account
                name that I store for two weeks, to aid in support.
              </li>
              <li>
                So far everything is free, and you are limited only by the API
                limits on your Mastodon or Bluesky instance. However, if you'd
                like to support, please feel free to{" "}
                <a href="https://ko-fi.com/acbeers">buy me a coffee!</a>
              </li>
            </ul>
          </Typography>
        </Container>
      </Box>
      {/* Footer */}
      <Box
        sx={{ bgcolor: "background.paper", pt: 2, pb: 6 }}
        component="footer"
      >
        <Copyright />
      </Box>
      {/* End footer */}
    </ThemeProvider>
  );
}

export default MainPage;
