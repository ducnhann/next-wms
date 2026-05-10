"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { easeInOutTransition } from "./easing";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { Spinner } from "./ui/spinner";

const EMAIL_SCHEMA = z
  .email("Invalid email address")
  .min(1, "Email is required");
const INITIAL_COUNTDOWN = 60;

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirmation: z
      .string()
      .min(8, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

type Step = "email" | "otp" | "password";

interface EmailVerificationStatus {
  valid: boolean;
  verified?: boolean;
  message?: string;
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);
  const [loading, startTransition] = useTransition();
  const otpInputRef = useRef<HTMLInputElement>(null);

  const requestOtp = useCallback(
    async (targetEmail: string, showToast = true): Promise<boolean> => {
      const { error } = await authClient.forgetPassword.emailOtp({
        email: targetEmail,
      });

      if (error) {
        if (showToast) {
          toast.error(error.message || "Failed to send reset code");
        }
        return false;
      }

      if (showToast) {
        toast.success("Password reset code sent to your email");
      }
      return true;
    },
    [],
  );

  const validateEmail = useCallback(async (value: string) => {
    const parseResult = EMAIL_SCHEMA.safeParse(value);
    if (!parseResult.success) {
      return {
        fields: {
          email: { message: parseResult.error.issues.at(-1)?.message },
        },
      };
    }

    try {
      const res = await fetch(
        `/api/auth/email-status?email=${encodeURIComponent(value)}`,
      );
      const status: EmailVerificationStatus = await res.json();

      if (!status.valid) {
        return {
          fields: {
            email: { message: "Account doesn't exist" },
          },
        };
      }

      return null;
    } catch {
      return {
        fields: {
          email: { message: "Failed to validate email" },
        },
      };
    }
  }, []);

  const emailForm = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        return new Promise((resolve) => {
          startTransition(async () => {
            const result = await validateEmail(value.email);
            resolve(result);
          });
        });
      },
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "blur",
    }),
    onSubmit: async ({ value }) => {
      const normalizedEmail = value.email.toLowerCase();
      startTransition(async () => {
        const success = await requestOtp(normalizedEmail, true);
        if (success) {
          setEmail(normalizedEmail);
          setOtpValue("");
          setCurrentStep("otp");
          setCountdown(INITIAL_COUNTDOWN);
        }
      });
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      password: "",
      passwordConfirmation: "",
    },
    validators: {
      onSubmit: ResetPasswordSchema,
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "blur",
    }),
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const { error } = await authClient.emailOtp.resetPassword({
          email,
          otp: otpValue,
          password: value.password,
        });

        if (error) {
          toast.error(error.message || "Failed to reset password");
          return;
        }

        toast.success("Password reset successfully");
        router.replace("/auth/sign-in");
      });
    },
  });

  const handleOtpComplete = useCallback(
    async (completedValue: string) => {
      startTransition(async () => {
        const { error } = await authClient.emailOtp.checkVerificationOtp({
          email,
          otp: completedValue,
          type: "forget-password",
        });

        if (error) {
          toast.error(error.message || "Invalid reset code");
          setOtpValue("");
          return;
        }

        setOtpValue(completedValue);
        setCurrentStep("password");
        toast.success("Reset code verified");
      });
    },
    [email],
  );

  const handleOtpResend = useCallback(() => {
    startTransition(async () => {
      const success = await requestOtp(email, true);
      if (success) {
        setOtpValue("");
        setCountdown(INITIAL_COUNTDOWN);
      }
    });
  }, [email, requestOtp]);

  useEffect(() => {
    if (!loading && otpValue === "" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [loading, otpValue]);

  useEffect(() => {
    if (countdown > 0 && !loading && currentStep === "otp") {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, loading, currentStep]);

  return (
    <Card className="w-full sm:w-[400px]">
      <CardHeader>
        <motion.div
          key={`${currentStep}-header`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: easeInOutTransition }}
        >
          {currentStep === "email" && (
            <>
              <CardTitle className="text-lg md:text-xl">
                Forgot Password
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Enter your account email and we will send a 6-digit reset code.
              </CardDescription>
            </>
          )}
          {currentStep === "otp" && (
            <>
              <CardTitle className="text-lg md:text-xl">
                Enter reset code
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                We sent a 6-digit code to {email}.
              </CardDescription>
            </>
          )}
          {currentStep === "password" && (
            <>
              <CardTitle className="text-lg md:text-xl">
                Set new password
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Choose a new password for {email}.
              </CardDescription>
            </>
          )}
        </motion.div>
      </CardHeader>

      <CardContent>
        <motion.div
          key={`${currentStep}-content`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: easeInOutTransition }}
        >
          {currentStep === "email" && (
            <form
              noValidate
              id="forgot-password-email-form"
              onSubmit={(e) => {
                e.preventDefault();
                emailForm.handleSubmit();
              }}
            >
              <emailForm.Field name="email">
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
                        disabled={loading}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </emailForm.Field>
            </form>
          )}
          {currentStep === "otp" && (
            <OTPInput
              ref={otpInputRef}
              value={otpValue}
              onChange={setOtpValue}
              onComplete={handleOtpComplete}
              disabled={loading}
            />
          )}
          {currentStep === "password" && (
            <form
              noValidate
              id="forgot-password-reset-form"
              onSubmit={(e) => {
                e.preventDefault();
                passwordForm.handleSubmit();
              }}
            >
              <FieldGroup className="gap-4">
                <passwordForm.Field name="password">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field data-invalid={isInvalid} className="gap-2">
                        <FieldLabel htmlFor={field.name}>
                          New password
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
                          autoComplete="new-password"
                          disabled={loading}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </passwordForm.Field>

                <passwordForm.Field name="passwordConfirmation">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field data-invalid={isInvalid} className="gap-2">
                        <FieldLabel htmlFor={field.name}>
                          Confirm new password
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
                          autoComplete="new-password"
                          disabled={loading}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </passwordForm.Field>
              </FieldGroup>
            </form>
          )}
        </motion.div>
      </CardContent>

      <CardFooter className="flex-col gap-4 pt-4">
        <motion.div
          key={`${currentStep}-footer`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: easeInOutTransition }}
          className="w-full"
        >
          {currentStep === "email" && (
            <Button
              className="w-full"
              type="submit"
              form="forgot-password-email-form"
              disabled={loading}
            >
              {loading ? <Spinner /> : "Send reset code"}
            </Button>
          )}
          {currentStep === "otp" && (
            <FieldDescription className="text-center">
              Didn&apos;t receive the code?{" "}
              <Button
                onClick={handleOtpResend}
                className="p-0 text-muted-foreground"
                variant="link"
                disabled={loading || countdown > 0}
              >
                {countdown > 0 && !loading
                  ? `Resend (${countdown}s)`
                  : "Resend"}
              </Button>
            </FieldDescription>
          )}
          {currentStep === "password" && (
            <Button
              className="w-full"
              type="submit"
              form="forgot-password-reset-form"
              disabled={loading}
            >
              {loading ? <Spinner /> : "Reset password"}
            </Button>
          )}
        </motion.div>

        <FieldDescription className="text-center">
          Remember your password?{" "}
          <Link className="underline" href="/auth/sign-in">
            Sign in
          </Link>
        </FieldDescription>
      </CardFooter>
    </Card>
  );
}

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled: boolean;
}

const OTPInput = forwardRef<HTMLInputElement, OTPInputProps>(
  ({ value, onChange, onComplete, disabled }, ref) => {
    return (
      <Field>
        <FieldLabel htmlFor="otp">Reset code</FieldLabel>
        <InputOTP
          ref={ref}
          pattern={REGEXP_ONLY_DIGITS}
          value={value}
          onChange={onChange}
          onComplete={onComplete}
          maxLength={6}
          disabled={disabled}
          autoFocus
        >
          <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </Field>
    );
  },
);

OTPInput.displayName = "OTPInput";
