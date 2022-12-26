import { useState } from "preact/hooks";
import "./app.css";

export function App() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("http://localhost:8000");
  const [authHeader, setAuthHeader] = useState("");
  const [response, setRequestResult] = useState("");
  const [error, setRequestError] = useState("");

  function sendRequest(e) {
    e.preventDefault();
    e.stopPropagation();
    setRequestResult("");
    setRequestError("");

    const options = {
      method,
    };

    if (authHeader) {
      options.headers = {
        Authorization: authHeader,
      };
    }

    console.log(`Sending request to ${method} ${url} with:`, options);
    fetch(url, options).then(
      async (result) => {
        try {
          const body = await result.json();
          setRequestResult(body);
        } catch (error) {
          setRequestResult(error);
        }
      },
      (error) => {
        setRequestError({ error: error.message });
      }
    );
  }

  return (
    <>
      <h1>CDK API Gateway Tester</h1>
      <div class="card">
        <form onSubmit={sendRequest}>
          <div className="form-group">
            <label htmlFor="requestMethod">Method</label>
            <input
              type="text"
              name="method"
              id="requestMethod"
              value={method}
              onChange={({ target: { value } }) => setMethod(value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="requestUrl">Url</label>
            <input
              type="text"
              name="url"
              id="requestUrl"
              value={url}
              onChange={({ target: { value } }) => setUrl(value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="requestAuthHeader">Authorization Header</label>
            <input
              type="text"
              name="authHeader"
              id="requestAuthHeader"
              value={authHeader}
              onChange={({ target: { value } }) => setAuthHeader(value)}
            />
          </div>
          <button type="submit">Send</button>
        </form>

        <div className="request-response">
          <h2>Response:</h2>
          {response ? <pre>{JSON.stringify(response)}</pre> : <em>None</em>}

          <h2>Response error:</h2>
          {error ? <pre>{JSON.stringify(error)}</pre> : <em>None</em>}
        </div>
      </div>
    </>
  );
}
