const whitelistEmails = (process.env.WHITELISTED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const allowedEmails = whitelistEmails;

export function isWhitelistedEmail(email?: string): boolean {
  return typeof email === "string" && whitelistEmails.includes(email.toLowerCase());
}
