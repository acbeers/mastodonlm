import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { List } from "./types";

type CreateListDialogProps = {
  open: boolean;
  lists: List[];
  handleExport: (list: List) => void;
  handleClose: () => void;
};

function ExportListDialog({
  open,
  lists,
  handleExport,
  handleClose,
}: CreateListDialogProps) {
  const [value, setValue] = useState<number | string>("");

  const opts = lists.map((list, index) => (
    <MenuItem key={list.id} value={index}>
      {list.title}
    </MenuItem>
  ));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="export-list-dialog-title"
      aria-describedby="export-list-dialog-description"
    >
      <DialogTitle id="export-list-dialog-title">Export List</DialogTitle>
      <DialogContent>
        <FormControl
          sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}
        >
          <Select
            data-testid="export-list-select"
            inputProps={{ "data-testid": "export-list-input" }}
            value={value}
            label="List"
            onChange={(evt) => {
              setValue(evt.target.value as number);
            }}
          >
            {opts}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          data-testid="export-list-button"
          onClick={() => {
            if (value !== "") {
              handleClose();
              handleExport(lists[value as number]);
            }
          }}
          autoFocus
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportListDialog;
