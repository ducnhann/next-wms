export function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Unknown Device";

  // Extract browser
  let browser = "Unknown Browser";
  if (userAgent.includes("Edg/")) {
    browser = "Edge";
  } else if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) {
    browser = "Chrome";
  } else if (userAgent.includes("Firefox/")) {
    browser = "Firefox";
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    browser = "Safari";
  } else if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) {
    browser = "Opera";
  }

  // Extract OS
  let os = "Unknown OS";
  if (userAgent.includes("Windows NT 10.0")) {
    os = "Windows 10/11";
  } else if (userAgent.includes("Windows NT 6.3")) {
    os = "Windows 8.1";
  } else if (userAgent.includes("Windows NT 6.2")) {
    os = "Windows 8";
  } else if (userAgent.includes("Windows NT 6.1")) {
    os = "Windows 7";
  } else if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS X")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (
    userAgent.includes("iOS") ||
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad")
  ) {
    os = "iOS";
  }

  return `${browser} on ${os}`;
}
