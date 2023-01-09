import React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";

export default function Controls({
  groupBy,
  handleGroupByChange,
  search,
  handleSearchChange,
}) {
  return (
    <div>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel id="demo-simple-select-label">Group By</InputLabel>
        <Select
          labelid="demo-simple-select-label"
          id="demo-simple-select"
          value={groupBy}
          label="Group By"
          onChange={(event) => handleGroupByChange(event.target.value)}
        >
          <MenuItem value={"none"}>Nothing</MenuItem>
          <MenuItem value={"name"}>Name (first letter)</MenuItem>
          <MenuItem value={"domain"}>Account domain</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 400, marginBottom: "12px" }}>
        <TextField
          labelid="demo-simple-search-label"
          label="Search"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </FormControl>
    </div>
  );
}
