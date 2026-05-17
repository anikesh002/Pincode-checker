import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response("Unauthorized", { status: 401 });
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await Promise.all([
          db.session.deleteMany({ where: { shop } }),
          db.shopSettings.deleteMany({ where: { shop } }),
        ]);
      }
      break;

    case "SHOP_REDACT":
      // GDPR: Delete all shop data
      await Promise.all([
        db.session.deleteMany({ where: { shop } }),
        db.shopSettings.deleteMany({ where: { shop } }),
        db.pincode.deleteMany({ where: { shop } }),
        db.pincodeCheck.deleteMany({ where: { shop } }),
        db.importJob.deleteMany({ where: { shop } }),
      ]);
      break;

    case "CUSTOMERS_REDACT":
    case "CUSTOMERS_DATA_REQUEST":
      // We don't store customer PII
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response();
};
