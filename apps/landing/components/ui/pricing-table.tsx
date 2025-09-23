"use client";

import React from "react";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Badge } from "./badge";
import { Check, Sparkles, Zap, Crown, Star } from "lucide-react";

interface PricingTableProps {
  className?: string;
  showUpgradeCTA?: boolean;
  onTierSelect?: (tier: string) => void;
}

export function PricingTable({
  className = "",
  showUpgradeCTA = true,
  onTierSelect,
}: PricingTableProps) {
  // Static pricing data for landing page
  const pricing = {
    tiers: [
      {
        tier: "basic",
        price: "0",
        currency: "USD",
        interval: "month",
        productName: "GovernsAI Basic",
        productDescription: "Perfect for getting started",
        features: [
          "AI usage monitoring and tracking",
          "Budget enforcement and alerts",
          "Policy management and compliance",
          "Usage analytics and insights",
          "Up to 1,000 API calls per month",
          "Basic usage tracking",
          "2 budget alerts per month",
          "Standard policy templates",
          "Basic analytics dashboard",
          "Email support",
          "1 organization",
          "Basic compliance reporting",
        ],
      },
      {
        tier: "pro",
        price: "19.99",
        currency: "USD",
        interval: "month",
        productName: "GovernsAI Pro",
        productDescription: "Perfect for professionals",
        features: [
          "AI usage monitoring and tracking",
          "Budget enforcement and alerts",
          "Policy management and compliance",
          "Usage analytics and insights",
          "Unlimited API calls",
          "Advanced usage tracking",
          "Real-time budget monitoring",
          "Custom policy creation",
          "Advanced analytics dashboard",
          "Priority support",
          "Multiple organizations",
          "Advanced compliance reporting",
          "Custom integrations",
          "API access",
          "White-label options",
        ],
      },
    ],
    currency: "USD",
    interval: "month",
  };

  const handleTierSelect = async (tier: string) => {
    if (onTierSelect) {
      onTierSelect(tier);
      return;
    }

    // For landing page, redirect to auth app for checkout
    if (tier === "pro") {
      // Redirect to auth app pricing page
      window.location.href =
        process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001/pricing";
    } else {
      // Redirect to auth app signup
      window.location.href =
        process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001/signup";
    }
  };

  return (
    <div
      className={`grid gap-6 lg:grid-cols-${pricing.tiers.length} ${className}`}
    >
      {pricing.tiers.map((tier) => (
        <Card
          key={tier.tier}
          className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 ${
            tier.tier === "pro"
              ? "ring-2 ring-purple-500/50 shadow-2xl shadow-purple-500/25 scale-105"
              : "shadow-xl"
          }`}
        >
          {tier.tier === "pro" && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-b-lg border-0">
                <Crown className="w-4 h-4 mr-2" />
                Most Popular
              </Badge>
            </div>
          )}

          <CardHeader className="text-center pt-8">
            <CardTitle className="text-2xl font-bold text-white">
              {tier.productName}
            </CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold text-white">
                ${tier.price}
              </span>
              <span className="text-gray-300 ml-2">/{tier.interval}</span>
            </div>
            <CardDescription className="text-gray-400 mt-2">
              {tier.productDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-200">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleTierSelect(tier.tier)}
              className={`w-full ${
                tier.tier === "pro"
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
              size="lg"
            >
              {tier.tier === "pro" && <Crown className="w-4 h-4 mr-2" />}
              {tier.tier === "pro" ? "Upgrade Now" : "Get Started"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Compact variant for smaller spaces
export function CompactPricingTable({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${className}`}>
      <Card className="min-w-[280px] flex-shrink-0 bg-white/5 backdrop-blur-xl border border-white/10">
        <CardHeader className="text-center pb-3">
          <h3 className="text-lg font-semibold capitalize text-white">Basic</h3>
          <div className="text-2xl font-bold text-white">
            $0
            <span className="text-sm text-gray-300 font-normal">/month</span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ul className="space-y-2 mb-4">
            {[
              "2 interviews per week",
              "10 video minutes per week",
              "2 resume exports per month",
              "Basic features",
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-gray-200">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
            variant="outline"
            onClick={() =>
              (window.location.href = "http://localhost:3001/signup")
            }
          >
            Start Free
          </Button>
        </CardContent>
      </Card>

      <Card className="min-w-[280px] flex-shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 ring-2 ring-purple-500/50 shadow-2xl shadow-purple-500/25">
        <CardHeader className="text-center pb-3">
          <h3 className="text-lg font-semibold capitalize text-white">Pro</h3>
          <div className="text-2xl font-bold text-white">
            $19.99
            <span className="text-sm text-gray-300 font-normal">/month</span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ul className="space-y-2 mb-4">
            {[
              "Unlimited interviews",
              "240 video minutes per week",
              "20 resume exports per month",
              "Advanced features",
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-gray-200">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300"
            onClick={() =>
              (window.location.href = "http://localhost:3001/pricing")
            }
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
