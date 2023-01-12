// API methods for List Manager

// This fancy function prevents multiple fetches in useEffect
// in development mode.
const createFetch = () => {
  // Create a cache of fetches by URL
  const fetchMap = {};
  return (url, options) => {
    // Check to see if its not in the cache otherwise fetch it
    if (!fetchMap[url]) {
      fetchMap[url] = fetch(url, options).then((resp) => checkJSON(resp));
    }
    // Return the cached promise
    return fetchMap[url];
  };
};
const onlyOneFetch = createFetch();

// A version of fetch that passes our authentication
function authenticatedFetch(url, options) {
  return fetch(url, {
    credentials: "include",
    method: options.method || "GET",
    headers: {
      authorization: sessionStorage.getItem("list-manager-cookie"),
    },
  });
}

function authGET(url) {
  return authenticatedFetch(url, { method: "GET" });
}

function authPOST(url) {
  return authenticatedFetch(url, { method: "POST" });
}

// Our endpoints
const urlInfo = process.env.REACT_APP_BACKEND_URL + "/info";
const urlFollowing = process.env.REACT_APP_BACKEND_URL + "/following";
const urlMeta = process.env.REACT_APP_BACKEND_URL + "/meta";
const urlLists = process.env.REACT_APP_BACKEND_URL + "/lists";
const urlAdd = process.env.REACT_APP_BACKEND_URL + "/add";
const urlRemove = process.env.REACT_APP_BACKEND_URL + "/remove";
const urlCreate = process.env.REACT_APP_BACKEND_URL + "/create";
const urlDelete = process.env.REACT_APP_BACKEND_URL + "/delete";
const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";
const urlCallback = process.env.REACT_APP_BACKEND_URL + "/callback";
const urlLogout = process.env.REACT_APP_BACKEND_URL + "/logout";

// Error classes

export class TimeoutError extends Error {
  constructor(params) {
    super(params);
    this.name = "TimeoutError";
  }
}

export class AuthError extends Error {
  constructor(params) {
    super(params);
    this.name = "AuthError";
    this.message = "Not authenticated";
  }
}

// Given a fetch response, check it for errors and throw
// reasonable exceptions if so.  Otherwise, return the response
// converted to JSON.
const checkJSON = (resp) => {
  if (resp.status === 401 || resp.status === 403) throw new AuthError();
  if (!resp.ok) throw Error("An error occurred");

  return resp
    .json()
    .then((data) => {
      if (data.errorType === "LambdaTimeoutError")
        throw new TimeoutError("Backend timeout");
      if (data.message === "Service Unavailable")
        throw new TimeoutError("Backend timeout (likely)");
      return data;
    })
    .catch((err) => {
      throw new Error(`An error occurred: ${err}`);
    });
};

// An API class that enforces some consistency
class API {
  static getInfo() {
    return authGET(urlInfo);
  }

  static getNewInfo() {
    return authGET(urlMeta)
      .then((resp) => checkJSON(resp))
      .then((meta) => {
        // If this isn't the right kind nof response, just bail.
        // e.g. this may be a status: response that will kick off authentication.
        if (!meta.me) return meta;

        let following = [];
        let lists = meta.lists;

        // Get followers
        // Get lists
        // Build per-follower list membership

        return authGET(urlFollowing)
          .then((resp) => checkJSON(resp))
          .then((x) => (following = x))
          .then(() => authGET(urlLists))
          .then((resp) => checkJSON(resp))
          .then((listaccts) => {
            // Build up lists for each follower
            following.forEach((x) => (x.lists = []));
            // A map for easy lookup
            const followerMap = {};
            following.forEach((x) => (followerMap[x.id] = x));
            // And, for each list
            lists.forEach((list) => {
              const accts = listaccts[list.id];
              accts.forEach((acct) => {
                const fol = followerMap[acct];
                if (fol) fol.lists.push(list.id);
              });
            });
            return {
              followers: following,
              lists: lists,
              me: meta.me,
            };
          });
      });
  }

  static addToList(list_id, person_id) {
    return authPOST(
      `${urlAdd}?list_id=${list_id}&account_id=${person_id}`
    ).then((resp) => checkJSON(resp));
  }

  static removeFromList(list_id, person_id) {
    return authPOST(
      `${urlRemove}?list_id=${list_id}&account_id=${person_id}`
    ).then((resp) => checkJSON(resp));
  }

  static createList(list_name) {
    return authPOST(`${urlCreate}?list_name=${list_name}`).then((resp) =>
      checkJSON(resp)
    );
  }

  static deleteList(list_id) {
    return authPOST(`${urlDelete}?list_id=${list_id}`).then((resp) =>
      checkJSON(resp)
    );
  }

  static tryAuth() {
    return authGET(urlAuth);
  }

  static authCallback(code, domain) {
    return onlyOneFetch(`${urlCallback}?code=${code}&domain=${domain}`, {
      credentials: "include",
      method: "POST",
      data: { code: code, domain: domain },
    });
  }

  static logout() {
    return authPOST(urlLogout);
  }
}

export default API;
