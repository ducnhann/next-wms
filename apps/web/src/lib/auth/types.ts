import type { authClient } from "./client";

export type Session = typeof authClient.$Infer.Session;
export type ActiveOrganization = typeof authClient.$Infer.ActiveOrganization;
export type Invitation = typeof authClient.$Infer.Invitation;
export type Organization = typeof authClient.$Infer.Organization;
export type Member = typeof authClient.$Infer.Member;
