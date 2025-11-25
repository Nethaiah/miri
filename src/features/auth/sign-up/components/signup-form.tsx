"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { signupSchema, SignupFormData } from "@/features/auth/sign-up/schema/sign-up-schema"
import { client } from "@/lib/api-client"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSocialLoading, setIsSocialLoading] = React.useState<string | null>(null)
  
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    
    try {
      const response = await (client as any).auth["sign-up"].$post({
        json: {
          name: data.name,
          email: data.email,
          password: data.password,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData?.error || "Failed to create account"
        throw new Error(errorMessage)
      }

      toast.success("Account created successfully!", {
        description: "You can now sign in to continue.",
        position: "bottom-right",
      })
      
      router.push("/sign-in")
    } catch (error) {
      toast.error("Signup failed", {
        description: error instanceof Error 
          ? error.message 
          : "Failed to create account",
        position: "bottom-right",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: "google" | "github") => {
    setIsSocialLoading(provider)
    
    try {
      const response = await (client as any).auth["social"].$post({
        json: {
          provider,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData?.error || `Failed to login with ${provider}`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // The auth API should handle the redirect automatically
      // If it returns a redirect URL, we can use it
      if (result.data?.url) {
        window.location.href = result.data.url
      }
    } catch (error) {
      toast.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login failed`, {
        description: error instanceof Error 
          ? error.message 
          : `Failed to login with ${provider}`,
        position: "bottom-right",
      })
      setIsSocialLoading(null)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Start your note-taking journey today
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form id="signup-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Name */}
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input
                      {...field}
                      id="name"
                      placeholder="John Doe"
                      aria-invalid={fieldState.invalid}
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Email */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      aria-invalid={fieldState.invalid}
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Password */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      disabled={isLoading}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field>
                <Button 
                  type="submit" 
                  form="signup-form" 
                  className="cursor-pointer"
                  disabled={isLoading || isSocialLoading !== null}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>

              <Field className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="cursor-pointer"
                  onClick={() => handleSocialLogin("google")}
                  disabled={isLoading || isSocialLoading !== null}
                >
                  {isSocialLoading === "google" ? "Loading..." : "Google"}
                </Button>
                <Button 
                  variant="outline" 
                  type="button" 
                  className="cursor-pointer"
                  onClick={() => handleSocialLogin("github")}
                  disabled={isLoading || isSocialLoading !== null}
                >
                  {isSocialLoading === "github" ? "Loading..." : "Github"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Already have an account? <Link href="/sign-in">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <Link href="#">Terms of Service</Link> and{" "}
        <Link href="#">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}