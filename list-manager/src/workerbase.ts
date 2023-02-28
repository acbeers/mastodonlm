// Baseclass for client and server workers

import { User } from "./types";
import { v4 as uuidv4 } from "uuid";

// Endpoints
const urlTelemetry = process.env.REACT_APP_BACKEND_URL + "/telemetry";
const urlError = process.env.REACT_APP_BACKEND_URL + "/error";

export class WorkerBase {
  protected me: User | null = null;
  protected session: string = "";

  constructor() {
    this.session = uuidv4();
  }

  // Logs a telemetry event
  async telemetry(info: Record<string, any>): Promise<void> {
    const data = { ...info };
    if (this.me) data.acct = this.me.acct;
    data.session = this.session;

    return fetch(urlTelemetry, {
      credentials: "include",
      method: "POST",
      body: JSON.stringify(data),
    }).then(() => {
      return;
    });
  }

  // Logs an error event
  async error(info: Record<string, any>): Promise<void> {
    const data = { ...info };
    if (this.me) data.acct = this.me.acct;
    data.session = this.session;

    return fetch(urlError, {
      credentials: "include",
      method: "POST",
      body: JSON.stringify(data),
    }).then(() => {
      return;
    });
  }
}
