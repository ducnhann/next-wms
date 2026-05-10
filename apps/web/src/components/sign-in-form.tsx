"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/client";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Spinner } from "./ui/spinner";

const SignInFormSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});

export default function SignInForm() {
  const router = useRouter();
  const [loading, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    validators: {
      onSubmit: SignInFormSchema,
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "blur",
    }),

    onSubmit: async ({ value }) => {
      startTransition(async () => {
        await signIn.email(
          {
            email: value.email,
            password: value.password,
            rememberMe: value.rememberMe,
            callbackURL: "/auth/onboarding",
          },
          {
            onError: (context) => {
              toast.error(
                context.error?.message,
                context.error?.message &&
                  context.error?.code === "EMAIL_NOT_VERIFIED"
                  ? {
                      action: {
                        label: "Verify now",
                        onClick: async () => {
                          // Redirect to verify-email page with email parameter
                          router.push(
                            `/auth/verify-email?email=${encodeURIComponent(value.email)}`,
                          );
                        },
                      },
                    }
                  : {},
              );
            },
            onSuccess: () => {
              toast.success("Successfully signed in");
            },
          },
        );
      });
    },
  });

  return (
    <Card className="w-full sm:w-[400px]">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          with your account to access WMS or{" "}
          <Link
            className="underline"
            href={{
              pathname: "sign-up",
            }}
          >
            create a new one.
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          id="sign-in-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4">
            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid} className="gap-2">
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="email"
                      aria-invalid={isInvalid}
                      placeholder="m@example.com"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field
                    data-invalid={isInvalid}
                    className="grid grid-cols-[1fr_auto] gap-2"
                  >
                    <FieldLabel
                      htmlFor={field.name}
                      className="col-start-1 row-start-1"
                    >
                      Password
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="password"
                      aria-invalid={isInvalid}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="col-span-2 row-start-2"
                    />
                    <Link
                      href={{
                        pathname: "forgot-password",
                      }}
                      className="col-start-2 row-start-1 ml-auto inline-block text-sm underline"
                    >
                      Forgot your password?
                    </Link>
                    {isInvalid && (
                      <FieldError
                        errors={field.state.meta.errors}
                        className="col-span-2 row-start-3"
                      />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="rememberMe">
              {(field) => {
                return (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={(checked) =>
                        field.handleChange(!!checked)
                      }
                    />
                    <Label htmlFor={field.name}>Remember me</Label>
                  </div>
                );
              }}
            </form.Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="mt-4">
        <Button
          type="submit"
          form="sign-in-form"
          className="w-full"
          disabled={loading}
        >
          {loading ?? <Spinner />}
          <Label>Login</Label>
        </Button>
      </CardFooter>
    </Card>
  );
}
