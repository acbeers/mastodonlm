import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

type CreateListDialogProps = {
  open: boolean;
  handleCreate: (title: string) => void;
  handleClose: () => void;
};

function CreateListDialog({
  open,
  handleCreate,
  handleClose,
}: CreateListDialogProps) {
  const [value, setValue] = useState("");

  const clear = () => {
    setValue("");
  };
  const onCreate = (value: string) => {
    handleCreate(value);
    clear();
  };
  const onClose = () => {
    clear();
    handleClose();
  };

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
          autoFocus
          onChange={(evt) => setValue(evt.target.value)}
          onKeyPress={(ev) => {
            if (ev.key === "Enter") {
              onCreate(value);
              ev.preventDefault();
            }
          }}
        ></TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onCreate(value)} autoFocus>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateListDialog;
