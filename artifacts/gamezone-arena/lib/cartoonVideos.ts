const rawDomain = process.env.EXPO_PUBLIC_DOMAIN;
const apiOrigin = rawDomain
  ? `https://${rawDomain.replace(/^https?:\/\//, "")}`
  : "";

export function resolveCartoonMediaUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
}