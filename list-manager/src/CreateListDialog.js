import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

function CreateListDialog({ open, handleCreate, handleClose }) {
  const [value, setValue] = useState("");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Create New List</DialogTitle>
      <DialogContent>
        <TextField
          sx={{ marginTop: "5px" }}
          label="List name"
          value={value}
          onChange={(evt) => setValue(evt.target.value)}
        ></TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={() => handleCreate(value)} autoFocus>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateListDialog;
