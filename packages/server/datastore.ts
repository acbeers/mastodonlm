import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { attribute, hashKey, table } from "@nova-odm/annotations";
import { DataMapper } from "@nova-odm/mapper";

// A class representing stored authentication information.
@table(process.env.TABLE_AUTH || "list-manager")
export class AuthTable {
  @hashKey()
  key: string;

  @attribute()
  token: string;

  @attribute()
  domain: string;

  @attribute()
  expires_at: string;
}

// A class representing stored authentication information.
@table(process.env.TABLE_HOSTCFG || "list-manager")
export class HostCfgTable {
  @hashKey()
  host: string;

  @attribute()
  client_id: string;

  @attribute()
  client_secret: string;
}

// Given a cookie, return stored login information
export async function getAuth(cookie: string): Promise<AuthTable> {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const mapper = new DataMapper({ client: client });

  const toFetch = new AuthTable();
  toFetch.key = cookie;
  return mapper.get({ item: toFetch }).then((ret) => {
    if ("item" in ret) return ret.item;
    return ret;
  });
}

// Given a host, return its host configuration
export async function getHostCfg(host: string): Promise<HostCfgTable> {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const mapper = new DataMapper({ client: client });

  const toFetch = new HostCfgTable();
  toFetch.host = host;
  return mapper.get({ item: toFetch }).then((ret) => {
    if ("item" in ret) return ret.item;
    return ret;
  });
}
export const Datastore = { getAuth, getHostCfg };
