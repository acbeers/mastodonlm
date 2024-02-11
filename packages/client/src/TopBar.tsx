import React, { MouseEvent } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

type TopBarProps = {
  acct: string;
  handleMenuNewList: () => void;
  handleMenuExportList: () => void;
  handleMenuImportList: () => void;
  handleMenuAbout: () => void;
  handleMenuLogout: () => void;
};

export default function TopBar({
  acct,
  handleMenuNewList,
  handleMenuExportList,
  handleMenuImportList,
  handleMenuAbout,
  handleMenuLogout,
}: TopBarProps) {
  // Menu anchor and handlers
  const [anchorMenuEl, setAnchorMenuEl] = React.useState<HTMLElement | null>(
    null
  );
  const handleMenuClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorMenuEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorMenuEl(null);
  };

  const clickMenuNewList = () => {
    handleMenuClose();
    handleMenuNewList();
  };
  const clickMenuExportList = () => {
    handleMenuClose();
    handleMenuExportList();
  };
  const clickMenuImportList = () => {
    handleMenuClose();
    handleMenuImportList();
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
            <MenuItem onClick={clickMenuExportList}>Export List</MenuItem>
            <MenuItem onClick={clickMenuImportList}>Import List</MenuItem>
            <MenuItem onClick={clickMenuNewAbout}>About</MenuItem>
            <MenuItem onClick={clickMenuLogout}>Logout</MenuItem>
          </Menu>{" "}
          <Typography>Fedi List Manager</Typography>&nbsp;
          <Typography>(@{acct})</Typography>
          <div style={{ flexGrow: "100", textAlign: "right" }}>
            <a
              href="https://ko-fi.com/M4M5IFTCP"
              target="_blank"
              rel="noreferrer"
            >
              <img
                height="36"
                style={{ border: "0px", height: "36px" }}
                src="https://storage.ko-fi.com/cdn/kofi2.png?v=3"
                alt="Buy Me a Coffee at ko-fi.com"
              />
            </a>{" "}
          </div>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
