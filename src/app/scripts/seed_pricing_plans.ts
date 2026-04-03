import { prisma } from "../lib/prisma";
import { SubscriptionPlan } from "../../../generated/prisma/client";

async function seedPricingPlans() {
  const plans = [
    {
      name: "Free",
      plan: SubscriptionPlan.FREE,
      price: 0.0,
      currency: "usd",
      features: ["Limited Content", "Ad-supported", "No Offline Access"],
      isActive: true,
      isPopular: false,
      stripePriceId: null, // Free plan doesnt need Stripe Price ID
    },
    {
      name: "Monthly",
      plan: SubscriptionPlan.MONTHLY,
      price: 9.99,
      currency: "usd",
      features: ["All Content Access", "Ad-free Experience", "High Definition"],
      isActive: true,
      isPopular: true,
      stripePriceId: "price_YOUR_MONTHLY_ID", // আপনার স্ট্রাইপ থেকে কপি করুন
    },
    {
      name: "Yearly",
      plan: SubscriptionPlan.YEARLY,
      price: 99.99,
      currency: "usd",
      features: ["All Content Access", "Ad-free Experience", "Ultra HD", "Save 20% Yearly"],
      isActive: true,
      isPopular: false,
      stripePriceId: "price_YOUR_YEARLY_ID", // আপনার স্ট্রাইপ থেকে কপি করুন
    },
  ];

  try {
    for (const planData of plans) {
      await prisma.pricingPlan.upsert({
        where: { plan: planData.plan },
        update: planData,
        create: planData,
      });
    }
    console.log("Pricing plans seeded successfully!");
  } catch (error) {
    console.error("Error seeding pricing plans:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPricingPlans();
