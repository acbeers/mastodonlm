import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

type TimeoutDialogProps = {
  open: boolean;
  handleClose: () => void;
};

function TimeoutDialog({ open, handleClose }: TimeoutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">A Timeout Occurred</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          <p>
            A timeout has occurred communicating with your Mastodon server. It
            could be that the server is busy, in which case you could try again
            later. Or, you may be following lots of accounts or have long lists
            which are taking too long to retrieve. I'm working on changes to
            this service which will allow for longer lists and/or slower
            servers.
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

export default TimeoutDialog;
