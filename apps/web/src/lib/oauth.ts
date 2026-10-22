const LOGIN_KEY = "oauthLoginRequest";
const MAX_AGE = 10 * 60 * 1000;

export function createOAuthLoginUrl(
  apiUrl: string,
  provider: "google" | "kakao",
) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  sessionStorage.setItem(
    LOGIN_KEY,
    JSON.stringify({ state, createdAt: Date.now() }),
  );
  return `${apiUrl}/auth/${provider}?state=${state}`;
}

export function consumeOAuthResult(hash: string): string | null {
  const saved = sessionStorage.getItem(LOGIN_KEY);
  sessionStorage.removeItem(LOGIN_KEY);
  if (!saved) return null;
  try {
    const request = JSON.parse(saved);
    const result = new URLSearchParams(hash.replace(/^#/, ""));
    const age = Date.now() - request.createdAt;
    if (
      !/^[a-f0-9]{64}$/.test(request.state) ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > MAX_AGE ||
      result.getAll("state").length !== 1 ||
      result.get("state") !== request.state ||
      result.getAll("token").length !== 1
    )
      return null;
    return result.get("token") || null;
  } catch {
    return null;
  }
}
