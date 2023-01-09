import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

export default function TopBar({
  acct,
  handleMenuNewList,
  handleMenuAbout,
  handleMenuLogout,
}) {
  // Menu anchor and handlers
  const [anchorMenuEl, setAnchorMenuEl] = React.useState(null);
  const handleMenuClick = (event) => {
    setAnchorMenuEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorMenuEl(null);
  };

  const clickMenuNewList = () => {
    handleMenuClose();
    handleMenuNewList();
  };
  const clickMenuNewAbout = () => {
    handleMenuClose();
    handleMenuAbout();
  };
  const clickMenuLogout = () => {
    handleMenuClose();
    handleMenuLogout();
  };

  const menuOpen = Boolean(anchorMenuEl);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            data-testid="topbar-menu"
            sx={{ mr: 2 }}
            onClick={handleMenuClick}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="basic-menu"
            anchorEl={anchorMenuEl}
            open={menuOpen}
            onClose={handleMenuClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            <MenuItem onClick={clickMenuNewList}>New List</MenuItem>
            <MenuItem onClick={clickMenuNewAbout}>About</MenuItem>
            <MenuItem onClick={clickMenuLogout}>Logout</MenuItem>
          </Menu>{" "}
          <Typography>Mastodon List Manager</Typography>&nbsp;
          <Typography align="right">(@{acct})</Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
