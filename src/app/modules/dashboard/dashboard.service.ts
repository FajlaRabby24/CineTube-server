import { SubscriptionPlan } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

const getUserDashboardStats = async (userId: string) => {
  // ── 1. Core counts (parallel) ──────────────────────────────────
  const [
    totalReviews,
    totalVotes,
    totalComments,
    watchlistCount,
    subscription,
  ] = await Promise.all([
    prisma.review.count({ where: { userId } }),
    prisma.mediaVote.count({ where: { userId } }),
    prisma.comment.count({ where: { userId, isDeleted: false } }),
    prisma.watchlist.count({ where: { userId } }),
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
      },
    }),
  ]);

  const totalInteractions = totalReviews + totalVotes + totalComments;

  // ── 2. Subscription days left ──────────────────────────────────
  let premiumDaysLeft = 0;
  let planName: SubscriptionPlan = SubscriptionPlan.FREE;

  if (subscription && subscription.plan !== SubscriptionPlan.FREE) {
    planName = subscription.plan;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    const diff = end.getTime() - now.getTime();
    premiumDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // ── 3. Activity timeline (last 7 days) ─────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [recentReviews, recentVotes, recentComments] = await Promise.all([
    prisma.review.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.mediaVote.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.comment.findMany({
      where: { userId, isDeleted: false, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activityTimeline = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return { day: dayNames[d.getDay()], count: 0, date: d };
  });

  const allInteractions = [
    ...recentReviews,
    ...recentVotes,
    ...recentComments,
  ];

  allInteractions.forEach((item) => {
    const itemDate = new Date(item.createdAt);
    itemDate.setHours(0, 0, 0, 0);
    const entry = activityTimeline.find(
      (t) => t.date.getTime() === itemDate.getTime(),
    );
    if (entry) entry.count++;
  });

  // Strip internal date from response
  const activityData = activityTimeline.map(({ day, count }) => ({
    day,
    count,
  }));

  // ── 4. Genre analysis from watchlist + reviewed media ──────────
  const [watchlistMedia, reviewedMedia] = await Promise.all([
    prisma.watchlist.findMany({
      where: { userId },
      select: {
        media: { select: { genres: { select: { genre: true } } } },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      select: {
        media: { select: { genres: { select: { genre: true } } } },
      },
    }),
  ]);

  const genreMap: Record<string, number> = {};
  const allMedia = [...watchlistMedia, ...reviewedMedia];

  allMedia.forEach((entry) => {
    entry.media.genres.forEach((g) => {
      genreMap[g.genre] = (genreMap[g.genre] || 0) + 1;
    });
  });

  const genreData = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── 5. Recent activity (last 5 interactions) ───────────────────
  const [latestWatchlist, latestReviews, latestVotes] = await Promise.all([
    prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        createdAt: true,
        media: { select: { title: true, type: true } },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        createdAt: true,
        media: { select: { title: true, type: true } },
      },
    }),
    prisma.mediaVote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        type: true,
        createdAt: true,
        media: { select: { title: true, type: true } },
      },
    }),
  ]);

  const recentActivity = [
    ...latestWatchlist.map((w) => ({
      title: w.media.title,
      type: w.media.type,
      date: w.createdAt,
      action: "Added to Watchlist" as const,
    })),
    ...latestReviews.map((r) => ({
      title: r.media.title,
      type: r.media.type,
      date: r.createdAt,
      action: "Reviewed" as const,
    })),
    ...latestVotes.map((v) => ({
      title: v.media.title,
      type: v.media.type,
      date: v.createdAt,
      action: v.type === "LIKE" ? ("Liked" as const) : ("Disliked" as const),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    stats: {
      totalInteractions,
      reviewedTitles: totalReviews,
      watchlistCount,
      premiumDaysLeft,
      planName,
    },
    activityData,
    genreData,
    recentActivity,
  };
};

export const DashboardService = {
  getUserDashboardStats,
};
