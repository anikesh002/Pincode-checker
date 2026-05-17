import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    // Clean up ALL shop data on uninstall
    await Promise.all([
      db.session.deleteMany({ where: { shop } }),
      db.shopSettings.deleteMany({ where: { shop } }),
      db.pincode.deleteMany({ where: { shop } }),
      db.pincodeCheck.deleteMany({ where: { shop } }),
      db.importJob.deleteMany({ where: { shop } }),
    ]);
  }

  return new Response();
};
