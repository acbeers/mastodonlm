// API methods for List Manager

// This fancy function prevents multiple fetches in useEffect
// in development mode.
const createFetch = () => {
  // Create a cache of fetches by URL
  const fetchMap = {};
  return (url, options) => {
    // Check to see if its not in the cache otherwise fetch it
    if (!fetchMap[url]) {
      fetchMap[url] = fetch(url, options).then((res) => res.json());
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
const urlAdd = process.env.REACT_APP_BACKEND_URL + "/add";
const urlRemove = process.env.REACT_APP_BACKEND_URL + "/remove";
const urlCreate = process.env.REACT_APP_BACKEND_URL + "/create";
const urlDelete = process.env.REACT_APP_BACKEND_URL + "/delete";
const urlAuth = process.env.REACT_APP_BACKEND_URL + "/auth";
const urlCallback = process.env.REACT_APP_BACKEND_URL + "/callback";

// An API class that enforces some consistency
class API {
  static getInfo() {
    return authGET(urlInfo);
  }

  static addToList(list_id, person_id) {
    return authPOST(`${urlAdd}?list_id=${list_id}&account_id=${person_id}`);
  }

  static removeFromList(list_id, person_id) {
    return authPOST(`${urlRemove}?list_id=${list_id}&account_id=${person_id}`);
  }

  static createList(list_name) {
    return authPOST(`${urlCreate}?list_name=${list_name}`);
  }

  static deleteList(list_id) {
    return authPOST(`${urlDelete}?list_id=${list_id}`);
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
}

export default API;
