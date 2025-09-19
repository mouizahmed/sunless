"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useState } from "react";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for trying out Sunless",
      features: [
        "30 minutes of transcription",
        "Basic accuracy",
        "Standard support",
        "Export to TXT, DOCX",
      ],
      buttonText: "Get started",
      buttonVariant: "outline" as const,
      popular: false,
    },
    {
      name: "Professional",
      monthlyPrice: 12,
      annualPrice: 9.6, // 20% discount
      description: "For content creators and professionals",
      features: [
        "10 hours of transcription",
        "99.9% accuracy",
        "Speaker identification",
        "Priority support",
        "Export to all formats",
        "Custom vocabulary",
      ],
      buttonText: "Start free trial",
      buttonVariant: "default" as const,
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="relative py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-zinc-900 mb-4 md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-zinc-600 mb-8 md:text-xl">
            Choose the plan that&apos;s right for you. Upgrade or downgrade at
            any time.
          </p>

          {/* Pricing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span
              className={`mr-3 ${
                !isAnnual ? "text-zinc-900 font-medium" : "text-zinc-500"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                isAnnual ? "bg-brand" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`ml-3 ${
                isAnnual ? "text-zinc-900 font-medium" : "text-zinc-500"
              }`}
            >
              Annual
            </span>
            <Badge className="ml-2 bg-zinc-100 text-zinc-800 hover:bg-zinc-100">
              Save 20%
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative hover:shadow-lg transition-shadow bg-white border-zinc-200 flex flex-col rounded-2xl ${
                plan.popular ? "ring-2 ring-brand" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-brand text-white">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center p-8">
                <CardTitle className="text-2xl font-semibold text-zinc-900">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  {plan.name === "Starter" ? (
                    <span className="text-4xl font-bold text-zinc-900">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-zinc-900">
                        ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-zinc-600">
                        /{isAnnual ? "month" : "month"}
                      </span>
                      {isAnnual && (
                        <div className="mt-1">
                          <span className="text-sm text-zinc-500 line-through">
                            ${plan.monthlyPrice}/month
                          </span>
                          <span className="ml-2 text-sm text-green-600 font-medium">
                            20% off
                          </span>
                        </div>
                      )}
                      {isAnnual && plan.annualPrice !== undefined && (
                        <div className="text-xs text-zinc-500 mt-1">
                          Billed annually (${(plan.annualPrice * 12).toFixed(0)}
                          /year)
                        </div>
                      )}
                    </>
                  )}
                </div>
                <CardDescription className="mt-2 text-zinc-600">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow p-8 pt-0">
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-zinc-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.buttonVariant}
                  className={`w-full mt-auto rounded-full ${
                    plan.buttonVariant === "default"
                      ? "bg-brand hover:bg-brand-light text-white"
                      : "border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                  }`}
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-zinc-600 mb-4">
            All plans include a 14-day free trial.
          </p>
          {/* <p className="text-sm text-zinc-500">
            Looking for enterprise solutions? <a href="#" className="text-brand hover:underline">Contact our sales team</a>
          </p> */}
        </div>
      </div>
    </section>
  );
}
