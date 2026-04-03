import { prisma } from "../lib/prisma";

async function checkPricingPlans() {
  try {
    const plans = await prisma.pricingPlan.findMany();
    console.log("Current Pricing Plans in Database:");
    console.table(
      plans.map((p) => ({
        Name: p.name,
        Plan: p.plan,
        Price: p.price,
        StripePriceId: p.stripePriceId || "MISSING",
      })),
    );
  } catch (error) {
    console.error("Error fetching pricing plans:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPricingPlans();
