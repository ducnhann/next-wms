# E2E Test Case Generation Instructions

You are tasked with writing Playwright E2E test cases for the **Next-WMS** (Warehouse Management System) project. This document contains all the context, conventions, test scenarios, and instructions you need.

---

## Project Context

### Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS 4, Radix UI, Shadcn/ui
- **Backend:** Convex (serverless real-time database + functions)
- **Auth:** Better Auth (email/password + OTP verification) with PostgreSQL (Neon)
- **State:** Zustand, TanStack React Query, Convex real-time subscriptions
- **Forms:** TanStack React Form + React Hook Form + Zod validation
- **UI Feedback:** Sonner (toast notifications)

### Route Map (Next.js App Router)
```
/auth/sign-in                          — Login page
/auth/sign-up                          — Register page
/auth/forgot-password                  — Forgot password page
/auth/verify-email                     — Email OTP verification
/auth/onboarding                       — Post-login org selection
/auth/accept-invitation/[id]           — Accept org invitation

/{orgSlug}/dashboard                   — Dashboard
/{orgSlug}/master-data/products        — Products list
/{orgSlug}/master-data/categories      — Categories list
/{orgSlug}/master-data/brands          — Brands list
/{orgSlug}/master-data/suppliers       — Suppliers list
/{orgSlug}/orders                      — Purchase Orders list
/{orgSlug}/inbound-orders              — (alias for orders)
/{orgSlug}/receiving-sessions          — Receive Sessions list
/{orgSlug}/return-requests             — Return Requests list
/{orgSlug}/inventory                   — Inventory list
/{orgSlug}/warehouses-ops              — Inventory adjustments
/{orgSlug}/picking-sessions            — Picking Sessions list
/{orgSlug}/reports                     — Reports dashboard
/{orgSlug}/notifications               — Notifications list
/{orgSlug}/settings/profile            — User profile
/{orgSlug}/settings/admin              — Org settings (name, members, roles)
```

### Key Source Files (for reference)
```
packages/backend/convex/
├── products.ts          — Product CRUD mutations/queries
├── categories.ts        — Category CRUD
├── brands.ts            — Brand CRUD
├── suppliers.ts         — Supplier CRUD
├── purchaseOrders.ts    — Purchase Order logic
├── receiveSessions.ts   — Receive Session logic
├── returnRequest.ts     — Return Request logic
├── outboundOrders.ts    — Outbound Order logic
├── pickingSessions.ts   — Picking Session logic
├── inventory.ts         — Inventory queries
├── reports.ts           — Report aggregations
├── notifications.ts     — Notification logic
├── schema.ts            — Full database schema
└── authSync.ts          — Auth ↔ Convex sync hooks

apps/web/src/
├── app/auth/            — Auth pages (sign-in, sign-up, etc.)
├── app/(protected)/[workspace]/(main)/   — Main app pages
├── app/(protected)/[workspace]/(settings)/ — Settings pages
├── components/          — UI components
├── lib/                 — Utilities, auth client, permissions
└── hooks/               — Custom React hooks
```

---

## Test Setup & Conventions

### File Structure
```
tests/e2e/
├── auth/
│   ├── login.spec.ts
│   ├── register.spec.ts
│   ├── forgot-password.spec.ts
│   └── org-login.spec.ts
├── organization/
│   ├── create-org.spec.ts
│   ├── edit-org.spec.ts
│   ├── invite-member.spec.ts
│   ├── roles.spec.ts
│   └── permissions.spec.ts
├── profile/
│   └── profile.spec.ts
├── master-data/
│   ├── products.spec.ts
│   ├── categories.spec.ts
│   ├── brands.spec.ts
│   └── suppliers.spec.ts
├── inbound/
│   ├── purchase-orders.spec.ts
│   ├── receive-sessions.spec.ts
│   └── return-requests.spec.ts
├── outbound/
│   ├── outbound-orders.spec.ts
│   └── picking-sessions.spec.ts
├── inventory/
│   ├── inventory-list.spec.ts
│   └── adjustments.spec.ts
├── reports/
│   └── reports.spec.ts
├── notifications/
│   └── notifications.spec.ts
└── helpers/
    ├── auth.helper.ts
    ├── seed.helper.ts
    └── constants.ts
```

### Playwright Config (`playwright.config.ts`)
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Naming Convention
- Each `test()` MUST include the BR code in its name: `[BR_CODE] description`
- Group tests with `test.describe("UC_XX: Use Case Name", ...)`
- Test IDs follow: `MODULE-NNN` (e.g., `AUTH-001`, `ORG-001`, `PROD-001`)

### Auth Helper (`tests/e2e/helpers/auth.helper.ts`)
```ts
import { type Page } from "@playwright/test";

export const TEST_USERS = {
  owner: { email: "owner@test.com", password: "Test1234!" },
  admin: { email: "admin@test.com", password: "Test1234!" },
  member: { email: "member@test.com", password: "Test1234!" },
};

export const TEST_ORG = {
  name: "Test Organization",
  slug: "test-org",
};

export async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /login|sign in/i }).click();
  await page.waitForURL("**/onboarding**", { timeout: 15_000 });
}

export async function loginAndSelectOrg(page: Page, user = TEST_USERS.owner) {
  await login(page, user.email, user.password);
  await page.getByText(TEST_ORG.name).click();
  await page.getByRole("button", { name: /open/i }).click();
  await page.waitForURL(`**/${TEST_ORG.slug}/dashboard**`, { timeout: 15_000 });
}
```

### General Rules for Writing Tests
1. Use `page.getByRole()`, `page.getByLabel()`, `page.getByText()`, `page.getByPlaceholder()` — prefer accessible locators over CSS selectors.
2. For toast notifications (Sonner), assert with: `await expect(page.locator('[data-sonner-toast]')).toContainText("...")`.
3. For dialogs (Radix AlertDialog/Dialog), look for `role="dialog"` or `role="alertdialog"`.
4. For select dropdowns (Radix Select), click the trigger first, then click the option.
5. For data tables (TanStack Table), rows are in `<tbody>` with standard `<tr>/<td>`.
6. Always `await page.waitForLoadState("networkidle")` after navigation when needed.
7. Use `test.beforeEach` to set up authenticated state where applicable.

---

## Test Scenarios by Module

### ═══════════════════════════════════════
### MODULE 1: AUTHENTICATION (Người A)
### UC01–UC03 | BR01–BR17
### Files: `tests/e2e/auth/login.spec.ts`, `register.spec.ts`, `forgot-password.spec.ts`
### ═══════════════════════════════════════

#### UC01: Login (`login.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| AUTH-001 | BR01 | Form displays required fields | Go to `/auth/sign-in` | Email input, password input, remember-me checkbox, Login button visible |
| AUTH-002 | BR02 | Empty email shows error | Clear email, click Login | Error message for email field (MSG13) |
| AUTH-003 | BR02 | Invalid email format shows error | Type "notanemail", click Login | Error message for email format (MSG13) |
| AUTH-004 | BR02 | Empty password shows error | Fill valid email, leave password empty, click Login | Error message for password (MSG14) |
| AUTH-005 | BR02 | Short password shows error | Fill password "123", click Login | Error for password min 8 chars (MSG14) |
| AUTH-006 | BR03 | Non-existent email shows error | Fill "ghost@fake.com" + valid password, Login | Error from Better Auth |
| AUTH-007 | BR03 | Wrong password shows error | Fill valid email + wrong password, Login | Error from Better Auth |
| AUTH-008 | BR04 | Successful login shows success toast | Fill correct credentials, Login | Toast MSG01 shown |
| AUTH-009 | BR05 | Successful login redirects to onboarding | Login successfully | URL contains `/auth/onboarding` |
| AUTH-010 | BR06 | Unverified email shows verify link | Login with unverified email | "Verify now" link visible, links to `/auth/verify-email` |

#### UC02: Register (`register.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| AUTH-011 | BR07 | Form displays all required fields | Go to `/auth/sign-up` | Name, email, password, confirm password fields visible |
| AUTH-012 | BR08 | Empty name shows error | Leave name empty, submit | MSG15 error |
| AUTH-013 | BR08 | Empty email shows error | Leave email empty, submit | MSG13 error |
| AUTH-014 | BR08 | Invalid email shows error | Type "bad", submit | MSG13 error |
| AUTH-015 | BR08 | Short password shows error | Type password "abc", submit | MSG14 error |
| AUTH-016 | BR08 | Empty confirm password shows error | Leave confirmPassword empty, submit | MSG16 error |
| AUTH-017 | BR08 | Mismatched passwords show error | password="Test1234!", confirm="Different1!", submit | MSG17 error |
| AUTH-018 | BR09 | Duplicate email shows error | Register with existing email | Error about email already exists |
| AUTH-019 | BR10 | Successful register redirects to verify-email | Fill valid new user data, submit | URL = `/auth/verify-email?email=...` |
| AUTH-020 | BR11 | Valid OTP verifies email | Enter correct 6-digit OTP | Verification success |
| AUTH-021 | BR11 | Invalid OTP shows error | Enter wrong OTP | Error message shown |

#### UC03: Forgot Password (`forgot-password.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| AUTH-022 | BR12 | Empty email shows error | Leave email empty, submit | MSG13 |
| AUTH-023 | BR12 | Invalid email shows error | Type "bad", submit | MSG13 |
| AUTH-024 | BR13 | Non-existent email shows error | Type unknown email, submit | "Email không hợp lệ" |
| AUTH-025 | BR14 | Valid email proceeds to OTP step | Type valid email, submit | OTP input form shown |
| AUTH-026 | BR15 | Wrong OTP shows error | Enter wrong OTP | Error shown |
| AUTH-027 | BR15 | Resend OTP with 60s countdown | Click resend | Countdown timer starts at 60s |
| AUTH-028 | BR16 | New password too short shows error | Enter password < 8 chars | Validation error |
| AUTH-029 | BR16 | Mismatched new passwords show error | password ≠ confirm | Validation error |
| AUTH-030 | BR17 | Successful reset redirects to sign-in | Complete all 3 steps | URL = `/auth/sign-in` |

### ═══════════════════════════════════════
### MODULE 2: ORGANIZATION (Người A)
### UC04–UC10 | BR18–BR45
### Files: `tests/e2e/auth/org-login.spec.ts`, `tests/e2e/organization/*.spec.ts`
### ═══════════════════════════════════════

#### UC04: Login to Organization (`org-login.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ORG-001 | BR18 | Loads user's organizations list | Login, go to onboarding | List of organizations shown |
| ORG-002 | BR19 | Each org shows avatar, name, Open button | Observe org list | Avatar, name, "Open" button for each org |
| ORG-003 | BR20 | Clicking Open sets active org | Click "Open" on an org | Active org set, localStorage `wms:selected-branch` cleared |
| ORG-004 | BR21 | Redirects to org dashboard | Click Open | URL = `/{orgSlug}/dashboard` |
| ORG-005 | BR22 | No orgs shows empty state | Login as user with no orgs | "Chưa có tổ chức nào" message + "Create New Organization" button |

#### UC06: Create Organization (`create-org.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ORG-006 | BR26 | Form shows name, slug, logo fields | Open create org form | All 3 fields visible (name required, slug required, logo optional) |
| ORG-007 | BR27 | Empty name shows error | Leave name empty, submit | MSG26 |
| ORG-008 | BR27 | Invalid name chars show error | Type special chars in name | MSG27 |
| ORG-009 | BR27 | Empty slug shows error | Leave slug empty, submit | MSG28 |
| ORG-010 | BR27 | Invalid slug format shows error | Type "UPPER CASE!!!" in slug | MSG29 |
| ORG-011 | BR28 | Duplicate slug shows error | Use existing slug | MSG30 |
| ORG-012 | BR30 | Successful org creation | Fill valid name + slug, submit | Org created, user is owner |
| ORG-013 | BR31 | Redirects to new org dashboard | After creation | URL = `/{newSlug}/dashboard` |
| ORG-014 | BR32 | Success toast shown | After creation | MSG18 toast |

#### UC07: Invite Member (`invite-member.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ORG-015 | BR33 | Form shows email and role fields | Open invite dialog | Email input + role selector (owner/admin/member) |
| ORG-016 | BR34 | Empty email shows error | Leave email empty, submit | MSG13 |
| ORG-017 | BR34 | Invalid email shows error | Type "bad", submit | MSG13 |
| ORG-018 | BR36 | Successful invitation shows toast | Fill valid email + role, submit | MSG162 toast |

#### UC08: Edit Organization (`edit-org.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ORG-019 | BR37 | Empty name shows error | Clear org name, save | MSG23 |
| ORG-020 | BR37 | Invalid name chars show error | Type special chars, save | MSG27 |
| ORG-021 | BR38 | Successful update syncs to backend | Change name, save | Name updated |
| ORG-022 | BR39 | Success toast shown | After update | MSG24 toast |

#### UC09: Manage Roles (`roles.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ORG-023 | BR40 | Shows member info and current role | Open roles management | Member info + role (owner/admin/member) displayed |
| ORG-024 | BR41 | Cannot change last owner's role | Try to change the only owner's role | Error: must have at least 1 owner |
| ORG-025 | BR41 | Same role change rejected | Set same role, save | Error: role must differ |
| ORG-026 | BR42 | Successful role change shows toast | Change member→admin, save | MSG143 toast |

#### UC10: Edit Role Permissions (`permissions.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ORG-027 | BR43 | Default roles not editable | View owner/admin/member permissions | MSG142 — cannot edit default roles |
| ORG-028 | BR44 | Custom role permissions editable | Edit custom role permissions | Permissions updated |
| ORG-029 | BR45 | Success toast on update | Update permissions | MSG143 toast |
| ORG-030 | BR45 | Failure shows error toast | Trigger error | MSG144 toast |

### ═══════════════════════════════════════
### MODULE 3: USER PROFILE (Người A)
### UC05 | BR23–BR25
### File: `tests/e2e/profile/profile.spec.ts`
### ═══════════════════════════════════════

#### UC05: Manage User Profile

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PROF-001 | BR23 | Displays user info (name, email, avatar) | Go to settings/profile | Name, email (readonly), avatar shown |
| PROF-002 | BR24 | Empty name shows error | Clear name, save | MSG03 |
| PROF-003 | BR24 | No changes shows info message | Click save without changes | MSG04 |
| PROF-004 | BR24 | Invalid image file shows error | Upload non-image file | MSG08 |
| PROF-005 | BR25 | Name update shows success toast | Change name, save | MSG05 |
| PROF-006 | BR25 | Avatar update shows success toast | Upload valid image, save | MSG06 |
| PROF-007 | BR23 | Email field is not editable | Try to edit email | Email field is disabled/readonly |

### ═══════════════════════════════════════
### MODULE 4: MASTER DATA (Người A)
### UC11–UC26 | BR46–BR94
### Files: `tests/e2e/master-data/products.spec.ts`, `categories.spec.ts`, `brands.spec.ts`, `suppliers.spec.ts`
### ═══════════════════════════════════════

> **Precondition for all Master Data tests:** User must be logged in and have selected an organization. Use `loginAndSelectOrg()` helper in `beforeEach`.

#### UC11: Add Product (`products.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PROD-001 | BR46 | Form displays all required fields | Open create product dialog | name, categoryId, brandId, storageRequirement, trackingMethod, variant fields visible |
| PROD-002 | BR47 | Empty product name shows error | Leave name empty, save | MSG34 |
| PROD-003 | BR47 | No category selected shows error | Skip category, save | MSG35 |
| PROD-004 | BR47 | No brand selected shows error | Skip brand, save | MSG36 |
| PROD-005 | BR47 | No storage requirement shows error | Skip storageRequirement, save | MSG37 |
| PROD-006 | BR47 | No tracking method shows error | Skip trackingMethod, save | MSG38 |
| PROD-007 | BR47 | No UOM selected shows error | Skip unitOfMeasure, save | MSG39 |
| PROD-008 | BR47 | Empty SKU code shows error | Leave skuCode empty, save | MSG40 |
| PROD-009 | BR48 | Duplicate product name in same org rejected | Create product with existing name | Backend error shown |
| PROD-010 | BR48 | Duplicate SKU code in same org rejected | Create variant with existing skuCode | Backend error shown |
| PROD-011 | BR49 | Successful product creation | Fill all valid fields, save | Product created, appears in list |
| PROD-012 | BR50 | Success toast shown | After creation | MSG31 toast |
| PROD-013 | BR51 | Import Excel with valid file | Upload valid .xlsx, import | MSG124 shown |
| PROD-014 | BR51 | Import Excel with wrong format rejected | Upload non-.xlsx file | Error message |
| PROD-015 | BR51 | Import Excel with duplicates shows error | Upload file with duplicate entries | MSG118 |

#### UC12: Edit Product

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PROD-016 | BR52 | Edit form validates same rules as create | Edit product, clear required fields, save | Same validation errors as BR47 |
| PROD-017 | BR53 | Duplicate name (excluding self) rejected | Rename to another product's name, save | Backend error |
| PROD-018 | BR54 | Successful update shows toast | Edit and save valid changes | MSG32 toast |

#### UC13: Delete Product

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PROD-019 | BR55 | Delete confirmation dialog appears | Click delete on product | Confirmation dialog visible |
| PROD-020 | BR55 | Cancel delete keeps product | Click cancel in dialog | Product still exists |
| PROD-021 | BR56 | Soft delete sets isDeleted flag | Confirm delete | Product removed from list (soft deleted) |
| PROD-022 | BR56 | Variants also soft deleted | Delete product with variants | All variants also removed from list |

#### UC14: List & Search Products

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PROD-023 | BR57 | Product list loads with details | Navigate to products page | List shows category name, brand name, variants |
| PROD-024 | BR58 | Search by product name | Type product name in search | Filtered results shown |
| PROD-025 | BR58 | Search by SKU code | Type SKU in search | Product with matching SKU shown |
| PROD-026 | BR58 | Search is case-insensitive | Type lowercase of uppercase name | Results found |

#### UC15: Add Category (`categories.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| CAT-001 | BR59 | Form shows name and parent path | Open create category dialog | name (required) + parentPath (optional tree selector) |
| CAT-002 | BR60 | Duplicate path in same org rejected | Create category with existing path | Backend error |
| CAT-003 | BR60 | Invalid parent path rejected | Select non-existent parent | Backend error |
| CAT-004 | BR61 | Success toast shown | Create valid category | MSG41 toast |

#### UC16: Edit Category

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| CAT-005 | BR62 | Empty name shows error | Clear name, save | Validation error |
| CAT-006 | BR63 | Successful rename | Change name, save | Name updated in list |
| CAT-007 | BR64 | Success toast shown | After rename | MSG44 toast |

#### UC17: Delete Category

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| CAT-008 | BR65 | Delete confirmation dialog appears | Click delete | Confirmation dialog |
| CAT-009 | BR66 | Category with products cannot be deleted | Delete category that has products | Error: "Không thể xóa danh mục đang có sản phẩm" |
| CAT-010 | BR67 | Empty category soft deleted | Delete category with no products | Category removed (soft delete) |
| CAT-011 | BR68 | Success toast shown | After delete | MSG45 toast |

#### UC18: List & Search Categories

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| CAT-012 | BR69 | Category list loads (paginated or tree) | Navigate to categories page | Categories displayed |
| CAT-013 | BR70 | Search by category name (case-insensitive) | Type name in search | Filtered results |

#### UC19: Add Brand (`brands.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| BRAND-001 | BR71 | Form shows name and isActive | Open create brand dialog | name (required), isActive defaults true |
| BRAND-002 | BR72 | Duplicate brand name rejected | Create brand with existing name | "Tên hãng đã tồn tại" error |
| BRAND-003 | BR73 | Success toast shown | Create valid brand | MSG46 toast |
| BRAND-004 | BR74 | Import Excel — duplicates in file | Upload file with duplicate brands | MSG118 |
| BRAND-005 | BR74 | Import Excel — brand exists in system | Upload file with existing brand | MSG119 |
| BRAND-006 | BR74 | Import Excel — success | Upload valid file | MSG121 |

#### UC20: Edit Brand

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| BRAND-007 | BR75 | Empty name shows error | Clear name, save | Validation error |
| BRAND-008 | BR76 | Duplicate name (excluding self) rejected | Rename to existing name | Backend error |
| BRAND-009 | BR77 | Success toast shown | Rename valid, save | MSG47 toast |

#### UC21: Delete Brand

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| BRAND-010 | BR78 | Delete confirmation dialog appears | Click delete | Confirmation dialog |
| BRAND-011 | BR79 | Brand with products cannot be deleted | Delete brand that has products | "Không thể xóa hãng đang có sản phẩm" |
| BRAND-012 | BR80 | Brand without products is hard deleted | Delete brand with no products | Brand permanently removed |
| BRAND-013 | BR81 | Deactivate brand alternative | Deactivate brand | brand.isActive = false, MSG48 toast |

#### UC22: List & Search Brands

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| BRAND-014 | BR82 | Brand list shows product count | Navigate to brands page | Each brand shows linked product count |
| BRAND-015 | BR83 | Search by brand name (case-insensitive) | Type name in search | Filtered results |

#### UC23: Add Supplier (`suppliers.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| SUP-001 | BR84 | Form shows all fields | Open create supplier dialog | brandId, name, contactPerson, email, phone, defaultLeadTimeDays visible |
| SUP-002 | BR85 | Invalid email format rejected | Type bad email, save | MSG13 |
| SUP-003 | BR85 | Duplicate supplier name rejected | Use existing name | Backend error |
| SUP-004 | BR85 | Duplicate supplier email rejected | Use existing email | Backend error |
| SUP-005 | BR85 | Negative lead time rejected | Enter -1 for leadTimeDays | Backend error |
| SUP-006 | BR86 | Success toast shown | Create valid supplier | MSG51 toast |

#### UC24: Edit Supplier

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| SUP-007 | BR87 | Same validation rules apply (excluding self) | Edit supplier, use duplicate name/email | Backend error |
| SUP-008 | BR88 | Success toast shown | Valid edit, save | MSG52 toast |

#### UC25: Delete Supplier

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| SUP-009 | BR89 | Delete confirmation dialog appears | Click delete | Confirmation dialog |
| SUP-010 | BR90 | Supplier with active POs cannot be deleted | Delete supplier with active POs | "Không thể xóa nhà cung cấp đang có đơn hàng hoạt động" |
| SUP-011 | BR91 | Soft delete supplier without active POs | Confirm delete (no active POs) | Supplier removed (soft delete) |
| SUP-012 | BR92 | Success toast shown | After delete | MSG53 toast |

#### UC26: List & Search Suppliers

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| SUP-013 | BR93 | Supplier list loads with brand info | Navigate to suppliers page | List with brand names shown |
| SUP-014 | BR94 | Search by name, email, or contactPerson | Type in search | Filtered results |

### ═══════════════════════════════════════
### MODULE 5: INBOUND — Purchase Orders & Receive Sessions (Người B)
### UC27–UC35 | BR95–BR127
### Files: `tests/e2e/inbound/purchase-orders.spec.ts`, `receive-sessions.spec.ts`
### ═══════════════════════════════════════

> **Precondition:** User logged in + org selected. Master data (suppliers, products, variants, branches, zones) must exist.

#### UC27: Create Purchase Order (`purchase-orders.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PO-001 | BR95 | Form shows branch, supplier, line items | Open create PO form | branchId, supplierId selectors + line items table |
| PO-002 | BR96 | Selecting supplier loads its SKUs | Select a supplier | SKU dropdown populated with supplier's variants |
| PO-003 | BR97 | Line item requires SKU, quantity > 0, zone | Add line item with missing fields | Validation errors |
| PO-004 | BR97 | Quantity must be > 0 | Enter quantity = 0 | Error shown |
| PO-005 | BR98 | Invalid branch ID rejected by backend | Submit with invalid branch | Backend error |
| PO-006 | BR99 | Auto-generated PO code format PO-YYYY-MM-XXX | Create PO successfully | PO code matches `PO-YYYY-MM-XXX` format |
| PO-007 | BR100 | Expected delivery date calculated | Create PO with supplier having leadTimeDays=7 | expectedDate = createdDate + 7 days |
| PO-008 | BR101 | Successful PO creation | Fill all fields, submit | PO created, appears in list |
| PO-009 | BR102 | Import Excel — unknown SKU shows error | Import with non-existent SKU | MSG116 |
| PO-010 | BR102 | Import Excel — unknown branch shows error | Import with bad branch | MSG114 |
| PO-011 | BR102 | Import Excel — unknown supplier shows error | Import with bad supplier | MSG115 |

#### UC28: View PO Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PO-012 | BR103 | Detail dialog shows all PO info | Click on a PO row | PO code, dates, status, supplier info, line items, totals visible |

#### UC29: List & Search Purchase Orders

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PO-013 | BR104 | PO list loads with supplier and status | Navigate to orders page | List with supplier name + status |
| PO-014 | BR105 | Filter by status | Select status filter | Only matching POs shown |
| PO-015 | BR105 | Search POs | Type in search box | Filtered results |

#### UC30: Lookup Purchase Order

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PO-016 | BR106 | Search integrated into list page | Use search on PO list | Client-side search works |
| PO-017 | BR107 | Empty results show message | Search for non-existent PO | "Không tìm thấy đơn hàng" message |

#### UC31: Create Receive Session (`receive-sessions.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RS-001 | BR108 | Only PENDING POs without sessions shown | Open create receive session form | Only eligible POs listed |
| RS-002 | BR109 | Assign worker sends notification | Select worker, create session | MSG168 notification sent |
| RS-003 | BR110 | Non-PENDING PO rejected by backend | Try to create session for non-PENDING PO | Backend error |
| RS-004 | BR111 | Auto-generated code RS-YYYY-MM-XXX | Create session | Code matches `RS-YYYY-MM-XXX` |
| RS-005 | BR112 | Session details auto-created from PO items | Create session | Each PO item has corresponding session detail |
| RS-006 | BR113 | Work session auto-created | Create session | Work session exists |
| RS-007 | BR114 | PO status updated to PARTIAL | Create session | PO status = PARTIAL |
| RS-008 | BR115 | Success toast shown | After creation | MSG61 toast |

#### UC32: Perform Receiving

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RS-009 | BR116 | Each item shows expected/received/remaining | Open receive session | SKU, expected, received, remaining quantities visible |
| RS-010 | BR117 | Quantity must be ≥ 0 | Enter negative quantity | Error |
| RS-011 | BR117 | Quantity cannot exceed remaining | Enter quantity > remaining | Error |
| RS-012 | BR118 | Receiving creates inventory batch | Enter valid quantity, save | Inventory batch created |
| RS-013 | BR119 | Successful update shows toast | Update quantities | MSG62 toast |
| RS-014 | BR119 | Unknown SKU shows error | SKU not found scenario | MSG63 |
| RS-015 | BR120 | Complete updates all statuses | Click Complete | Session→COMPLETED, work session updated, PO status updated |
| RS-016 | BR121 | Completion toast shown | After complete | MSG65 toast |

#### UC34: View Receive Session Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RS-017 | BR125 | Detail shows full session info | Click on session row | RS code, PO code, supplier, worker, status, items with expected/received/zone |

#### UC35: List & Search Receive Sessions

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RS-018 | BR126 | List loads with PO, supplier, status, progress | Navigate to receiving-sessions | All columns visible with progress % |
| RS-019 | BR127 | Filter by status | Select status filter | Filtered results |

### ═══════════════════════════════════════
### MODULE 6: RETURN REQUESTS (Người B)
### UC33, UC49–UC51 | BR122–BR124, BR168–BR174
### File: `tests/e2e/inbound/return-requests.spec.ts`
### ═══════════════════════════════════════

#### UC33: Create Return Request

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RET-001 | BR122 | Form shows SKU, quantity, reason, notes | Open create return request form | variantId, quantity, reason (required), notes (optional) |
| RET-002 | BR122 | Quantity must be > 0 | Enter quantity = 0 | Error |
| RET-003 | BR123 | Successful creation linked to PO | Fill valid data, submit | Return request created, linked to PO |
| RET-004 | BR124 | Success toast shown | After creation | MSG64 toast |

#### UC49: View Return Request Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RET-005 | BR168 | Detail shows full request info | Click on return request | Request code, date, status, supplier, creator, items (SKU, qty, reason, notes), totals |

#### UC50: List & Search Return Requests

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RET-006 | BR169 | List loads with supplier, creator, status | Navigate to return-requests | All columns visible |
| RET-007 | BR170 | Filter by status | Select status filter | Filtered results |
| RET-008 | BR170 | Client-side search works | Type in search | Filtered results |

#### UC51: Complete Return Request

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RET-009 | BR171 | Approve and Reject buttons available | Open pending return request | Both action buttons visible |
| RET-010 | BR172 | Approve sets status APPROVED | Click Approve | Status → APPROVED, receive session items → RETURNED |
| RET-011 | BR173 | Reject sets status REJECTED + creates inventory batch | Click Reject | Status → REJECTED, inventory batch created for rejected items |
| RET-012 | BR174 | Approve success toast | After approve | MSG109 |
| RET-013 | BR174 | Reject success toast | After reject | MSG111 |

### ═══════════════════════════════════════
### MODULE 7: OUTBOUND (Người B)
### UC36–UC42 | BR128–BR153
### Files: `tests/e2e/outbound/outbound-orders.spec.ts`, `picking-sessions.spec.ts`
### ═══════════════════════════════════════

> **Precondition:** User logged in + org selected. Inventory with available stock must exist.

#### UC36: Create Outbound Order (`outbound-orders.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| OUT-001 | BR128 | Only SKUs with available stock shown | Open create form | SKU list only shows items with quantity > 0 |
| OUT-002 | BR128 | Quantity must be > 0 and ≤ available | Enter invalid quantity | Error |
| OUT-003 | BR129 | Requested ship date can be set | Set ship date | Date saved |
| OUT-004 | BR130 | Assign worker sends notification | Select worker, create | MSG169 notification |
| OUT-005 | BR131 | Backend validates SKU and stock | Submit with invalid data | Backend error |
| OUT-006 | BR132 | Auto-generated code OUT-YYYY-XXXX | Create order | Code matches format |
| OUT-007 | BR133 | Successful creation | Fill valid data, submit | Order created, appears in list |

#### UC37: View Outbound Order Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| OUT-008 | BR134 | Detail shows full order info | Click on order row | OUT code, date, status, items (SKU, requested/picked/packed qty), totals |

#### UC38: List & Search Outbound Orders

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| OUT-009 | BR135 | List loads with status and creator | Navigate to outbound page | All columns visible |
| OUT-010 | BR136 | Filter by status | Select status filter | Filtered results |
| OUT-011 | BR136 | Client-side search | Type in search | Filtered results |

#### UC39: Create Picking Session (`picking-sessions.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PICK-001 | BR137 | Only Processing orders without sessions shown | Open create form | Only eligible orders listed |
| PICK-002 | BR138 | Backend validates outbound order | Submit invalid order | Backend error |
| PICK-003 | BR139 | Auto-generated code PS-YYYYMMDD-XXXX | Create session | Code matches format |
| PICK-004 | BR140 | Details auto-created from outbound items | Create session | Each outbound item has picking detail |
| PICK-005 | BR141 | FIFO batch selection | Create session | Oldest batches selected first |
| PICK-006 | BR142 | Outbound order status → PICKING | Create session | Order status updated |
| PICK-007 | BR143 | Idempotent — existing session returned | Try to create duplicate | MSG68, existing session returned |
| PICK-008 | BR144 | Success toast shown | After creation | MSG67 toast |
| PICK-009 | BR144 | Failure toast shown | On error | MSG69 toast |

#### UC40: Perform Picking

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PICK-010 | BR145 | Start Picking updates status to IN_PROGRESS | Click Start Picking | Session status = IN_PROGRESS |
| PICK-011 | BR146 | Items show zone/batch location, required, picked | View picking items | Location, required qty, picked qty visible |
| PICK-012 | BR147 | Picked quantity must be ≥ 0 | Enter negative | Error |
| PICK-013 | BR147 | Picking reduces inventory batch quantity | Pick items | Inventory batch reduced |
| PICK-014 | BR148 | Pick success toast | After picking | MSG77 |
| PICK-015 | BR148 | Pick failure toast | On error | MSG78 |
| PICK-016 | BR149 | Complete checks all items picked | Click Complete with unpicked items | MSG82 warning |
| PICK-017 | BR149 | Complete updates outbound status PICKED/LOADING | Complete all items | Status updated accordingly |
| PICK-018 | BR150 | Completion success toast | After complete | MSG81 |

#### UC41: List & Search Picking Sessions

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PICK-019 | BR151 | List loads with status, outbound code, worker, progress | Navigate to picking-sessions | All columns visible |
| PICK-020 | BR152 | Filter by status | Select filter | Filtered results |

#### UC42: View Picking Session Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| PICK-021 | BR153 | Detail shows full session info | Click on session | PS code, date, status, outbound code, worker, items with required/picked/location |

### ═══════════════════════════════════════
### MODULE 8: INVENTORY (Người B)
### UC43–UC48 | BR154–BR167
### Files: `tests/e2e/inventory/inventory-list.spec.ts`, `adjustments.spec.ts`
### ═══════════════════════════════════════

#### UC43: List & Search Inventory Products (`inventory-list.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| INV-001 | BR154 | Inventory list loads with batch and stock info | Navigate to inventory page | Products with batch info, stock levels |
| INV-002 | BR155 | Client-side search works | Type in search | Filtered results |

#### UC44: View Inventory Product Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| INV-003 | BR156 | Detail shows batches, stock, zones | Click on inventory item | Product info, inventory batches, current stock, zone locations |

#### UC45: Create Adjustment Request (`adjustments.spec.ts`)

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ADJ-001 | BR157 | Two adjustment types available | Open adjustment dialog | Quantity adjustment + Location transfer options |
| ADJ-002 | BR158 | Quantity adjustment form shows required fields | Select quantity type | variantId, zoneId, reason, oldValue (auto), newValue fields |
| ADJ-003 | BR158 | Missing zone shows error | Skip zone, submit | MSG88 |
| ADJ-004 | BR158 | Missing reason shows error | Skip reason, submit | MSG87 |
| ADJ-005 | BR159 | Same old/new value rejected | Set newValue = oldValue | Error: "Không được giữ nguyên thông tin" |
| ADJ-006 | BR159 | Missing required fields rejected | Submit incomplete form | MSG86 |
| ADJ-007 | BR160 | Single quantity adjustment success toast | Create single adjustment | MSG84 |
| ADJ-008 | BR160 | Multi quantity adjustment success toast | Create batch adjustment | MSG91 |
| ADJ-009 | BR160 | Location transfer success toast | Create location transfer | MSG96 |
| ADJ-010 | BR160 | Failure toast shown | On error | MSG85 |

#### UC46: List & Search Adjustments

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ADJ-011 | BR161 | Adjustment list loads | Navigate to warehouses-ops | List of adjustments visible |
| ADJ-012 | BR162 | Filter by type (Quantity/Location) | Select type filter | Filtered results |
| ADJ-013 | BR162 | Client-side search | Type in search | Filtered results |

#### UC47: View Adjustment Detail

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ADJ-014 | BR163 | Detail shows old/new values, status, requester, reason | Click on adjustment | All fields visible (Pending/Approved/Rejected status) |

#### UC48: Complete Adjustment Request

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| ADJ-015 | BR164 | Approve and Reject buttons available | Open pending adjustment | Both buttons visible |
| ADJ-016 | BR165 | Approve applies inventory changes | Click Approve | Status→APPROVED, inventory batch qty updated |
| ADJ-017 | BR165 | Approve location transfer moves stock | Approve location transfer | Stock moved to new zone |
| ADJ-018 | BR166 | Reject does not change inventory | Click Reject | Status→REJECTED, inventory unchanged |
| ADJ-019 | BR167 | Approve success toast | After approve | MSG92 |
| ADJ-020 | BR167 | Approve failure toast | On error | MSG93 |
| ADJ-021 | BR167 | Reject success toast | After reject | MSG94 |

### ═══════════════════════════════════════
### MODULE 9: REPORTS (Người B)
### UC52–UC54 | BR175–BR186
### File: `tests/e2e/reports/reports.spec.ts`
### ═══════════════════════════════════════

#### UC52: Inbound Report

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RPT-001 | BR175 | Inbound report loads KPIs | Navigate to reports, select Inbound | Total sessions, items received, accuracy rate visible |
| RPT-002 | BR176 | Detail table loads session data | Scroll to detail table | Session details visible |
| RPT-003 | BR177 | Dashboard shows KPI cards + charts | View dashboard | KPI cards, charts, detail table |
| RPT-004 | BR178 | Time range filter reloads data | Change date range | Data updated |

#### UC53: Inventory Report

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RPT-005 | BR179 | Inventory report loads KPIs | Select Inventory report | Total SKUs, quantities, value, expiring, expired, low stock |
| RPT-006 | BR180 | Detail table loads product data | Scroll to detail table | Product details visible |
| RPT-007 | BR181 | Dashboard shows alerts for expiring/low stock | View dashboard | Expiry + low stock warnings visible |
| RPT-008 | BR182 | Time range filter reloads data | Change date range | Data updated |

#### UC54: Outbound Report

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| RPT-009 | BR183 | Outbound report loads KPIs | Select Outbound report | Total orders, items shipped, completion rate, avg pick time |
| RPT-010 | BR184 | Detail table loads order data | Scroll to detail table | Order details visible |
| RPT-011 | BR185 | Dashboard shows picking performance charts | View dashboard | Performance charts + top products |
| RPT-012 | BR186 | Time range filter reloads data | Change date range | Data updated |

### ═══════════════════════════════════════
### MODULE 10: NOTIFICATIONS (Người A)
### UC55–UC56 | BR187–BR191
### File: `tests/e2e/notifications/notifications.spec.ts`
### ═══════════════════════════════════════

#### UC55: View Notifications

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| NOTIF-001 | BR187 | Notification list loads (max 10) | Navigate to notifications | Up to 10 notifications shown |
| NOTIF-002 | BR188 | Each notification shows content, category, priority, read status | View list | All fields visible, unread items bold |
| NOTIF-003 | BR189 | Clicking notification shows inline detail | Click a notification | Detail expands inline (no page navigation) |
| NOTIF-004 | BR189 | Clicking auto-marks as read | Click unread notification | notification.readAt set, bold removed |

#### UC56: Mark Notification as Read

| TC | BR | Test Name | Steps | Expected |
|---|---|---|---|---|
| NOTIF-005 | BR190 | Single notification marked as read | Click unread notification | readAt updated |
| NOTIF-006 | BR191 | Bold removed after read | Mark as read | Bold formatting removed |
| NOTIF-007 | BR191 | Unread count decremented | Mark as read | Bell icon badge count decreases |

---

## Summary

| Module | Owner | TC Count | BRs Covered |
|---|---|---|---|
| 1. Authentication | Người A | 30 | BR01–BR17 |
| 2. Organization | Người A | 18 | BR18–BR45 |
| 3. User Profile | Người A | 7 | BR23–BR25 |
| 4. Master Data | Người A | 55 | BR46–BR94 |
| 5. Inbound (PO + Receive) | Người B | 30 | BR95–BR127 |
| 6. Return Requests | Người B | 13 | BR122–BR124, BR168–BR174 |
| 7. Outbound | Người B | 21 | BR128–BR153 |
| 8. Inventory | Người B | 21 | BR154–BR167 |
| 9. Reports | Người B | 12 | BR175–BR186 |
| 10. Notifications | Người A | 7 | BR187–BR191 |
| **TOTAL** | | **214** | **BR01–BR191** |

