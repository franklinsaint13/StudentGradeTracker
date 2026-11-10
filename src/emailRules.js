// Only real Gmail addresses are accepted. Keep these rules in step with
// supabase/migration_gmail_only.sql (the database enforces them for real).
// Returns a message if the address is not acceptable, otherwise null.
export function gmailProblem(raw) {
  const email = String(raw ?? "").trim().toLowerCase();
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return "Enter a valid email address.";
  const [local, domain] = parts;

  if (domain !== "gmail.com" && domain !== "googlemail.com")
    return "Only Gmail addresses (ending in @gmail.com) are allowed.";
  if (local.includes("+")) return "Gmail addresses containing a + are not allowed.";
  if (!/^[a-z0-9]+(\.[a-z0-9]+)*$/.test(local))
    return "That doesn't look like a valid Gmail address.";
  const length = local.replace(/\./g, "").length;
  if (length < 6 || length > 30) return "A Gmail username has 6 to 30 characters.";
  return null;
}
