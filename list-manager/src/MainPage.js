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

function MainPage() {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          bgcolor: "background.paper",
          pt: 8,
          pb: 6,
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
            Mastodon List Manager
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            paragraph
          >
            A dead simple manager for all of your Mastodon Lists, letting you
            quickly assign people that you are following to one or more lists.
            Search, filter, and organize your follow list to make reasoning
            about your lists easy.
          </Typography>
          <LoginForm />
        </Container>
      </Box>
      {/* Footer */}
      <Box sx={{ bgcolor: "background.paper", p: 6 }} component="footer">
        <Copyright />
      </Box>
      {/* End footer */}
    </ThemeProvider>
  );
}

export default MainPage;
