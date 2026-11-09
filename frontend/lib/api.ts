export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new ApiError(
      method === "GET"
        ? "The backend may be starting or unavailable. Please try again."
        : "The request could not be confirmed. Check the current state before retrying.",
      0,
    );
  }
  const data = await response.json().catch(() => {
    throw new ApiError(
      "The backend returned an invalid response",
      response.status,
    );
  });
  if (!response.ok)
    throw new ApiError(data.message || "Request failed", response.status);
  return data as T;
}
