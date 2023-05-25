export function ok_response(obj: object) {
  const body = { ...obj, status: "OK" };
  const response = {
    statusCode: 200,
    body: JSON.stringify(body),
  };

  return response;
}

export function err_response(msg: string) {
  const response = {
    statusCode: 500,
    body: JSON.stringify({ status: msg }),
  };

  return response;
}

export function auth_response() {
  return { statusCode: 401, body: "" };
}
