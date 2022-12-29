import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

function AboutDialog({ open, handleClose }) {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        About Mastodon List Manager
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          <p>
            This is an app that lets you manage membership of your follows in
            Lists on Mastodon, in the style of Twitter List Manager. Click on a
            cell in the table to add/remove the user in that row to the list in
            that column.
          </p>
          <p>
            Maintained by{" "}
            <a href="https://hachyderm.io/@acbeers">@acbeers@hachyderm.io</a>.
          </p>
          <p>
            Released under{" "}
            <a href="https://github.com/acbeers/mastodonlm/blob/main/LICENSE.md">
              MIT license
            </a>
          </p>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} autoFocus>
          Great!
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AboutDialog;
