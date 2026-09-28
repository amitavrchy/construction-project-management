export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Server could not be reached" }));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data as T;
}
