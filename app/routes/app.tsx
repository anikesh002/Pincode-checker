import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate, BASIC_PLAN, PRO_PLAN } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  // Check if merchant has an active billing plan
  const { appSubscriptions } = await billing.check({
    plans: [BASIC_PLAN, PRO_PLAN],
    isTest: true,
  });

  // If no active plan and not already on the billing page, redirect
  const url = new URL(request.url);
  if (appSubscriptions.length === 0 && !url.pathname.includes("/app/billing")) {
    throw redirect("/app/billing");
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    plan: appSubscriptions[0]?.name || null,
  };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/pincodes">Pincodes</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/import">Bulk Import</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
