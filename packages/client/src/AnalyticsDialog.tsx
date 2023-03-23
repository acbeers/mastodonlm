import React, { useState, useEffect, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { Box } from "@mui/system";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

import { ListAnalytics, List } from "@mastodonlm/shared";

// For our API work
import type APIWorker from "./clientworker";
import * as Comlink from "comlink";

import "./AnalyticsDialog.css";

type AnalyticsDialogProps = {
  open: boolean;
  list: List | null;
  api: Promise<Comlink.Remote<APIWorker>>;
  handleClose: () => void;
};

function AnalyticsDialog({
  open,
  list,
  api,
  handleClose,
}: AnalyticsDialogProps) {
  const [analytics, setAnalytics] = useState<ListAnalytics | null>(null);
  const [error, setError] = useState("");

  // NOTE: Duplicated from Manager.tsx, since this dialog does its own
  // network calls.
  const telemetryCB = useCallback(
    async (data: Record<string, any>) => {
      const remote = await api;
      remote.telemetry(data);
    },
    [api]
  );

  const loadDataCB = useCallback(async () => {
    if (list) {
      const remote = await api;
      const startTime = new Date().getTime();
      remote
        .listAnalytics(list)
        .then((la: ListAnalytics) => {
          const endTime = new Date().getTime();
          setAnalytics(la);
          // Send telemetry
          const data = {
            action: "analytics",
            num_posts: la.num_posts,
            num_boosts: la.num_boosts,
            date_range:
              (la.latest_post.getTime() - la.earliest_post.getTime()) /
              1000 /
              60 /
              60 /
              24,
            elapsed_ms: (endTime - startTime) / 1000,
          };
          telemetryCB(data);
        })
        .catch(() => setError("Unable to load analytics"));
    }
  }, [api, list, telemetryCB]);

  useEffect(() => {
    loadDataCB();
  }, [loadDataCB, list]);

  const onClose = () => {
    console.log("CLOSING");
    setAnalytics(null);
    handleClose();
  };

  let content = (
    <DialogContent>
      <span>Loading posts...</span>
    </DialogContent>
  );
  if (error) {
    content = (
      <DialogContent>
        <span>{error}</span>
      </DialogContent>
    );
  }
  if (analytics) {
    const topusersrows = analytics.top_posters.map((x) => {
      const barwidth_orig = (x.count_orig / analytics.num_posts) * 200;
      const barwidth_boost = (x.count_boost / analytics.num_posts) * 200;
      const [user, domain] = x.acct.acct.split("@");
      const link = `https://${domain}/@${user}`;
      return (
        <TableRow>
          <TableCell
            sx={{ textAlign: "right", paddingRight: 1, fontSize: "12px" }}
          >
            <a target="_blank" href={link} rel="noreferrer">
              {x.acct.display_name}
            </a>
          </TableCell>
          <TableCell>
            <div
              style={{ width: barwidth_orig, verticalAlign: "middle" }}
              className="bar_orig"
            ></div>
            <div
              style={{ width: barwidth_boost, verticalAlign: "middle" }}
              className="bar_boost"
            ></div>
            <span className="bar_label">
              {x.count_orig} / {x.count_boost}
            </span>
          </TableCell>
        </TableRow>
      );
    });

    const topusers = (
      <Table size="small" padding="none" className="analytics">
        <TableBody>{topusersrows}</TableBody>
      </Table>
    );

    const topboostsrows = analytics.top_boosts.map((x) => {
      const barwidth = (x.count / analytics.num_boosts) * 200;
      const [user, domain] = x.acct.acct.split("@");
      const link = `https://${domain}/@${user}`;
      return (
        <TableRow>
          <TableCell
            sx={{ textAlign: "right", paddingRight: 1, fontSize: "12px" }}
          >
            <a target="_blank" href={link} rel="noreferrer">
              {x.acct.display_name}
            </a>
          </TableCell>
          <TableCell>
            <div
              style={{ width: barwidth, verticalAlign: "middle" }}
              className="bar_boost"
            ></div>
            <span className="bar_label">{x.count}</span>
          </TableCell>
        </TableRow>
      );
    });
    const topboosts = (
      <Table size="small" padding="none" className="analytics">
        <TableBody>{topboostsrows}</TableBody>
      </Table>
    );

    const diffDays = Math.ceil(
      (analytics.latest_post.getTime() - analytics.earliest_post.getTime()) /
        1000 /
        60 /
        60 /
        24
    );
    const postsPerDay = Math.ceil(analytics.num_posts / diffDays);

    content = (
      <DialogContent>
        <Box sx={{ marginBottom: 1 }}>
          <>Total posts:</>
        </Box>
        <Table
          size="small"
          padding="none"
          className="analytics"
          style={{ marginLeft: "3em" }}
        >
          <TableBody>
            <TableRow>
              <TableCell
                sx={{
                  borderBottom: 0,
                  textAlign: "right",
                  paddingRight: 1,
                  fontSize: "14px",
                }}
              >
                {analytics.num_orig_posts}
              </TableCell>
              <TableCell>
                <div className="orig_swatch"></div>original posts
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                sx={{ borderBottom: 0, textAlign: "right", paddingRight: 1 }}
              >
                {analytics.num_boosts}
              </TableCell>
              <TableCell>
                <div className="boost_swatch"></div>boosts
              </TableCell>
            </TableRow>
            <TableRow sx={{ borderBottom: 0 }}>
              <TableCell
                sx={{
                  borderBottom: 0,
                }}
              ></TableCell>
              <TableCell className="date">
                Since {analytics.earliest_post.toDateString()}
              </TableCell>
            </TableRow>
            <TableRow sx={{ borderBottom: 0 }}>
              <TableCell
                sx={{
                  borderBottom: 0,
                }}
              ></TableCell>
              <TableCell className="date">
                {postsPerDay} posts per day
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Box sx={{ marginTop: 1, marginBottom: 1 }}>
          <>Top posters:</>
        </Box>
        {topusers}
        <Box sx={{ marginTop: 1, marginBottom: 1 }}>
          <>Most boosted accounts:</>
        </Box>
        {topboosts}
      </DialogContent>
    );
  }

  const title = list ? (
    <span>Analytics for {list.title}</span>
  ) : (
    <span>Analytics</span>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="analytics-dialog-title">{title}</DialogTitle>
      {content}
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Great!
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AnalyticsDialog;
