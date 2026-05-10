import { Heading, Link, Text } from "@react-email/components";
import { BaseEmail, styles } from "./components/base-email";

interface OrganizationInviteProps {
  /** The invite URL to accept the invitation */
  url: string;
  /** The name of the organization the user is being invited to */
  organizationName: string;
  /** The name of the person who sent the invitation */
  inviterName?: string;
  /** The role the user will have in the organization */
  role?: string;
  /** Brand name for the email footer */
  brandName?: string;
  /** Brand tagline for the email footer */
  brandTagline?: string;
  /** Brand logo URL for the email */
  brandLogoUrl?: string;
}

export default function OrganizationInvite({
  url,
  organizationName,
  inviterName,
  role,
  brandName,
  brandTagline,
  brandLogoUrl,
}: OrganizationInviteProps) {
  const roleDisplay = role ? formatRoleName(role) : "member";
  const inviterDisplay = inviterName || "A team member";

  return (
    <BaseEmail
      previewText={`You've been invited to join ${organizationName}`}
      brandName={brandName}
      brandTagline={brandTagline}
      brandLogoUrl={brandLogoUrl}
    >
      <Heading style={styles.h1}>You&apos;re invited!</Heading>
      <Text style={styles.text}>
        {inviterDisplay} has invited you to join{" "}
        <strong>{organizationName}</strong> as a <strong>{roleDisplay}</strong>.
      </Text>
      <Link
        href={url}
        target="_blank"
        style={{
          ...styles.link,
          display: "block",
          marginBottom: "16px",
        }}
      >
        Click here to accept the invitation
      </Link>
      <Text
        style={{
          ...styles.text,
          color: "#ababab",
          marginTop: "14px",
          marginBottom: "16px",
        }}
      >
        If you didn&apos;t expect this invitation, you can safely ignore this
        email. This invitation link will expire in 7 days.
      </Text>
    </BaseEmail>
  );
}

/**
 * Format role name for display.
 */
function formatRoleName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}
