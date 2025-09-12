import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Check } from "lucide-react";
import { useTopBar } from "@/contexts/TopBarContext";

function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const { setConfig } = useTopBar();

  useEffect(() => {
    setConfig({});
  }, [setConfig]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      setError("Please accept the terms of service");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement actual sign up
      console.log("Signing up with:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, just simulate verification step
      setVerifying(true);
    } catch (err) {
      setError("Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement actual verification
      console.log("Verifying with code:", code);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setError("Verification not implemented yet");
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement Google OAuth
      console.log("Google sign up attempted");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setError("Google sign up not implemented yet");
    } catch (err) {
      setError("Google sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(formData.password),
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(formData.password),
    },
    { label: "Contains number", met: /\d/.test(formData.password) },
  ];

  if (verifying) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-4">
          <div className="w-full max-w-md my-auto">
            <div className="text-center mb-8">
              <Link to="/" className="flex items-center justify-center">
                <img src="/logo.png" alt="Sunless" className="w-12 h-12" />
              </Link>
              <h1 className="text-2xl font-bold mt-4">Verify your email</h1>
              <p className="text-muted-foreground mt-2">
                We sent a verification code to {formData.email}
              </p>
            </div>

            <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Email Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      disabled={isLoading}
                      maxLength={6}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || code.length !== 6}
                  >
                    {isLoading ? "Verifying..." : "Verify Email"}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Didn't receive the code?{" "}
                  </span>
                  <button
                    onClick={() => console.log("Resend verification code")}
                    className="hover:underline"
                    style={{ color: "#8f87a6" }}
                    disabled={isLoading}
                  >
                    Resend
                  </button>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-md my-auto">
          <div className="text-center mb-8">
            <Link to="/" className="flex items-center justify-center">
              <img src="/logo.png" alt="Sunless" className="w-12 h-12" />
            </Link>
            <h1 className="text-2xl font-bold mt-4">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              Get started with Sunless today
            </p>
          </div>

          <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Sign up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                <img src="/google.svg" alt="Google" width={20} height={20} />
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {formData.password && (
                    <div className="space-y-1 mt-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center text-xs">
                          <Check
                            className={`w-3 h-3 mr-2 ${
                              req.met ? "text-green-500" : "text-gray-300"
                            }`}
                          />
                          <span
                            className={
                              req.met ? "text-green-700" : "text-gray-500"
                            }
                          >
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {formData.confirmPassword && (
                    <div className="flex items-center text-xs mt-1">
                      <Check
                        className={`w-3 h-3 mr-2 ${
                          formData.password === formData.confirmPassword
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      />
                      <span
                        className={
                          formData.password === formData.confirmPassword
                            ? "text-green-700"
                            : "text-red-500"
                        }
                      >
                        {formData.password === formData.confirmPassword
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm leading-5">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="hover:underline"
                      style={{ color: "#8f87a6" }}
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="hover:underline"
                      style={{ color: "#8f87a6" }}
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: "#8f87a6" }}
                  onMouseEnter={(e) =>
                    !isLoading &&
                    (e.currentTarget.style.backgroundColor = "#746c89")
                  }
                  onMouseLeave={(e) =>
                    !isLoading &&
                    (e.currentTarget.style.backgroundColor = "#8f87a6")
                  }
                  disabled={
                    isLoading ||
                    !acceptTerms ||
                    formData.password !== formData.confirmPassword
                  }
                >
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                </span>
                <Link
                  to="/signin"
                  className="hover:underline"
                  style={{ color: "#8f87a6" }}
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
