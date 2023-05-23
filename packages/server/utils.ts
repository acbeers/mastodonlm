export function ok_response(msg: string) {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ status: msg }),
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
