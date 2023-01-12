import React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";

export default function Controls({
  groupBy,
  handleGroupByChange,
  lists,
  filter,
  handleFilterChange,
  search,
  handleSearchChange,
}) {
  const notOnfilterItems = (lists || []).map((list) => (
    <MenuItem key={list.id} value={"not:" + list.id}>
      Not on {list.title}
    </MenuItem>
  ));
  const onfilterItems = (lists || []).map((list) => (
    <MenuItem key={list.id} value={"on:" + list.id}>
      On {list.title}
    </MenuItem>
  ));
  return (
    <div>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel
          htmlFor="controls-groupby-select"
          id="controls-groupby-label"
        >
          Group By
        </InputLabel>
        <Select
          key="groupby"
          labelid="demo-simple-select-label"
          id="controls-groupby-select"
          name="controls-groupby-select"
          data-testid="controls-groupby-select"
          inputProps={{ "data-testid": "controls-groupby-input" }}
          value={groupBy || "none"}
          label="Group By"
          onChange={(event) => handleGroupByChange(event.target.value)}
        >
          <MenuItem value={"none"}>Nothing</MenuItem>
          <MenuItem value={"name"}>Name (first letter)</MenuItem>
          <MenuItem value={"domain"}>Account domain</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel htmlFor="controls-filter-select" id="controls-select-label">
          Filter to
        </InputLabel>
        <Select
          key="filter"
          labelid="controls-groupby-label"
          id="controls-filter-select"
          name="controls-filter-select"
          data-testid="controls-filter-select"
          inputProps={{ "data-testid": "controls-filter-input" }}
          value={filter || "everything"}
          label="Filter to"
          onChange={(event) => handleFilterChange(event.target.value)}
        >
          <MenuItem value={"everything"}>Everything</MenuItem>
          <MenuItem value={"nolists"}>Not on any list</MenuItem>
          {notOnfilterItems}
          {onfilterItems}
        </Select>
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 400, marginBottom: "12px" }}>
        <TextField
          labelid="controls-search-label"
          label="Search"
          data-testid="controls-search-textfield"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </FormControl>
    </div>
  );
}
