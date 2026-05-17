// app/routes/api.check-pincode.tsx
// Public endpoint — called by storefront theme extension widget
// CORS-enabled, no auth required, rate-limited by shop

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

// ─── Rate Limiter with auto-cleanup ──────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 60; // requests per minute per shop+IP
const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000; // clean stale entries every 5 min

// Prevent memory leaks by cleaning up expired entries periodically
let lastCleanup = Date.now();
function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.reset) rateLimitMap.delete(key);
  }
}

function isRateLimited(key: string): boolean {
  cleanupRateLimitMap();
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ─── CORS headers ────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const pincode = url.searchParams.get("pincode")?.trim();
  const shop = url.searchParams.get("shop")?.trim();
  const productId = url.searchParams.get("product_id") || undefined;

  if (!pincode || !shop) {
    return json(
      { error: "Missing pincode or shop parameter" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate pincode format
  if (!/^\d{6}$/.test(pincode)) {
    return json(
      { error: "Invalid pincode format" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Validate shop format (must be a *.myshopify.com domain)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return json(
      { error: "Invalid shop parameter" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Rate limit by shop+IP
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateLimitKey = `${shop}:${ip}`;
  if (isRateLimited(rateLimitKey)) {
    return json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  // Verify shop exists in our database (has installed the app)
  const shopSession = await prisma.session.findFirst({
    where: { shop },
    select: { shop: true },
  });
  if (!shopSession) {
    return json(
      { error: "Shop not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  // Look up pincode in DB
  const record = await prisma.pincode.findFirst({
    where: { shop, pincode, isActive: true },
    select: {
      pincode: true,
      city: true,
      state: true,
      deliveryType: true,
      deliveryDays: true,
      codAvailable: true,
    },
  });

  // Get shop settings for labels
  const settings = await prisma.shopSettings.findUnique({
    where: { shop },
    select: {
      widgetVariant: true,
      expressLabel: true,
      standardLabel: true,
      unavailableLabel: true,
      showCodBadge: true,
      showCityName: true,
      primaryColor: true,
      accentColor: true,
      borderRadius: true,
      customCss: true,
      orderCutoffTime: true,
    },
  });

  // Log this check for analytics (fire-and-forget)
  prisma.pincodeCheck
    .create({
      data: {
        shop,
        pincode,
        found: !!record && record.deliveryType !== "unavailable",
        productId: productId || null,
        pageUrl: request.headers.get("referer") || null,
      },
    })
    .catch(() => {}); // don't block response

  if (!record) {
    return json(
      {
        found: false,
        pincode,
        message: settings?.unavailableLabel || "Delivery not available for this pincode",
        settings: settings || null,
      },
      { headers: corsHeaders }
    );
  }

  // --- Date Math Engine ---
  function getISTDate() {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  }

  function addWorkingDays(startDate: Date, days: number): Date {
    const d = new Date(startDate.getTime());
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) added++; // Skip Sundays
    }
    return d;
  }

  function formatDate(d: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }

  const nowIST = getISTDate();
  const [cutoffHour, cutoffMin] = (settings?.orderCutoffTime || "14:00").split(':').map(Number);
  
  let isPastCutoff = false;
  if (nowIST.getHours() > cutoffHour || (nowIST.getHours() === cutoffHour && nowIST.getMinutes() >= cutoffMin)) {
    isPastCutoff = true;
  }

  const dispatchDate = new Date(nowIST.getTime());
  if (isPastCutoff) dispatchDate.setDate(dispatchDate.getDate() + 1);
  if (dispatchDate.getDay() === 0) dispatchDate.setDate(dispatchDate.getDate() + 1); // Skip Sunday dispatch

  const daysStr = record.deliveryDays || "3-5";
  const parts = daysStr.split('-').map((s: string) => parseInt(s.trim(), 10));
  const minDays = parts[0] || 3;
  const maxDays = parts.length > 1 ? parts[1] : minDays;

  const minDate = addWorkingDays(dispatchDate, minDays);
  const maxDate = addWorkingDays(dispatchDate, maxDays);

  const exactDatesText = minDate.getTime() === maxDate.getTime() 
    ? formatDate(minDate) 
    : `${formatDate(minDate)} - ${formatDate(maxDate)}`;

  let cutOffTimestamp = null;
  if (!isPastCutoff && nowIST.getDay() !== 0) {
    const cutoffIST = new Date(nowIST.getTime());
    cutoffIST.setHours(cutoffHour, cutoffMin, 0, 0);
    cutOffTimestamp = cutoffIST.getTime() - (3600000 * 5.5); // Convert IST back to UTC epoch ms
  }
  // ------------------------

  return json(
    {
      found: true,
      pincode: record.pincode,
      city: record.city,
      state: record.state,
      deliveryType: record.deliveryType,
      deliveryDays: record.deliveryDays,
      exactDatesText,
      cutOffTimestamp,
      codAvailable: record.codAvailable,
      label:
        record.deliveryType === "express"
          ? settings?.expressLabel || "Express Delivery"
          : record.deliveryType === "unavailable"
          ? settings?.unavailableLabel || "Delivery not available"
          : settings?.standardLabel || "Standard Delivery",
      settings: settings || null,
    },
    { headers: corsHeaders }
  );
};
