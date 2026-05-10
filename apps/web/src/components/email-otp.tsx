import { revalidateLogic, useForm } from "@tanstack/react-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { motion } from "motion/react";
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

import { authClient } from "@/lib/auth/client";

import { easeInOutTransition } from "./easing";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { Spinner } from "./ui/spinner";

const EMAIL_SCHEMA = z.email().min(1, "Email is required");
const INITIAL_COUNTDOWN = 60;

type Step = "email" | "otp";

interface EmailVerificationStatus {
  valid: boolean;
  verified?: boolean;
  message?: string;
}

export default function EmailOTP() {
  const router = useRouter();

  // State
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);
  const [loading, startTransition] = useTransition();

  // Refs
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const sendOtp = useCallback(
    async (showToast = true): Promise<boolean> => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) {
        if (showToast) {
          toast.error(error.message || "Failed to send verification code");
        }
        return false;
      }

      if (showToast) {
        toast.success("Verification code sent to your email");
      }
      return true;
    },
    [email],
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

    // Fetch email status directly to get fresh data
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

      if (status.verified) {
        return {
          fields: {
            email: { message: "Email already verified" },
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

  const handleEmailSubmit = useCallback(async () => {
    startTransition(async () => {
      const success = await sendOtp(true);
      if (success) {
        setCurrentStep("otp");
        setCountdown(INITIAL_COUNTDOWN);
      }
    });
  }, [sendOtp]);

  const handleOtpComplete = useCallback(
    async (completedValue: string) => {
      startTransition(async () => {
        const { error } = await authClient.emailOtp.verifyEmail({
          email,
          otp: completedValue,
        });

        if (error) {
          toast.error(error.message || "Verification failed");
          setOtpValue("");
        } else {
          toast.success("Email verified");
          router.replace("/auth/sign-in");
        }
      });
    },
    [email, router],
  );

  const handleOtpResend = useCallback(() => {
    startTransition(async () => {
      await sendOtp(true);
      setCountdown(INITIAL_COUNTDOWN);
    });
  }, [sendOtp]);

  // Form
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
    onSubmit: handleEmailSubmit,
  });

  // Effects
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
    <Card>
      <CardHeader>
        <motion.div
          key={`${currentStep}-header`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: easeInOutTransition }}
        >
          {currentStep === "email" ? (
            <>
              <CardTitle>Email Verification</CardTitle>
              <CardDescription>
                We will send a 6-digit verification code to your email.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Enter verification code</CardTitle>
              <CardDescription>
                We sent a 6-digit code to your email.
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
          {currentStep === "email" ? (
            <form
              noValidate
              id="email-form"
              onSubmit={(e) => {
                e.preventDefault();
                setEmail(emailForm.getFieldValue("email"));
                emailForm.handleSubmit(e);
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
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </emailForm.Field>
            </form>
          ) : (
            <OTPInput
              ref={otpInputRef}
              value={otpValue}
              onChange={setOtpValue}
              onComplete={handleOtpComplete}
              disabled={loading}
            />
          )}
        </motion.div>
      </CardContent>

      <CardFooter>
        <motion.div
          key={`${currentStep}-footer`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: easeInOutTransition }}
          className={currentStep === "email" ? "flex flex-1" : undefined}
        >
          {currentStep === "email" ? (
            <Button
              className="w-full"
              type="submit"
              form="email-form"
              disabled={loading}
            >
              {loading ? <Spinner /> : "Submit"}
            </Button>
          ) : (
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
        </motion.div>
      </CardFooter>
    </Card>
  );
}

// Sub-component for OTP Input
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
        <FieldLabel htmlFor="otp">Verification code</FieldLabel>
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
