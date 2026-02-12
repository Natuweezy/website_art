export function jsonResponse(status, body, setCookies = []) {
  const headers = {
    "Content-Type": "application/json"
  };
  const response = {
    statusCode: status,
    headers,
    body: JSON.stringify(body)
  };
  if (setCookies && setCookies.length) {
    response.multiValueHeaders = {
      "Set-Cookie": setCookies
    };
  }
  return response;
}
