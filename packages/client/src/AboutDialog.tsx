import React, { MouseEvent } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type AboutDialogProps = {
  open: boolean;
  handleClose: (evt: MouseEvent<HTMLElement>) => void;
};

function AboutDialog({ open, handleClose }: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">About Fedi List Manager</DialogTitle>
      <DialogContent>
        <DialogContentText
          style={{ marginBottom: "10px" }}
          id="alert-dialog-description"
        >
          This is an app that lets you manage membership of your follows in
          Lists on Mastodon or Bluesky, in the style of Twitter List Manager.
          Click on a cell in the table to add/remove the user in that row to the
          list in that column.
        </DialogContentText>
        <DialogContentText style={{ marginBottom: "10px" }}>
          Maintained by{" "}
          <a href="https://hachyderm.io/@acbeers">@acbeers@hachyderm.io</a> /{" "}
          <a href="https://bsky.app/profile/acbeers.bsky.social">
            @acbeers.bsky.social
          </a>
        </DialogContentText>
        <DialogContentText style={{ marginBottom: "10px" }}>
          Released under{" "}
          <a href="https://github.com/acbeers/mastodonlm/blob/main/LICENSE.md">
            MIT license
          </a>
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
