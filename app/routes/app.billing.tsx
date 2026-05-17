// app/routes/app.billing.tsx
// Plan selection page — shown when merchant has no active subscription
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Box,
  Divider,
  List,
  Banner,
} from "@shopify/polaris";
import { authenticate, BASIC_PLAN, PRO_PLAN } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  // Check if they already have a plan
  const { appSubscriptions } = await billing.check({
    plans: [BASIC_PLAN, PRO_PLAN],
    isTest: true,
  });

  if (appSubscriptions.length > 0) {
    return redirect("/app");
  }

  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan") as string;

  const selectedPlan = plan === "pro" ? PRO_PLAN : BASIC_PLAN;

  await billing.request({
    plan: selectedPlan,
    isTest: true,
  });

  // billing.request will redirect to Shopify's confirmation page
  // This return is a fallback — it shouldn't be reached
  return json({});
};

const plans = [
  {
    name: "Basic",
    value: "basic",
    price: "$4.99",
    period: "/month",
    badge: null,
    features: [
      "Up to 5,000 pincodes",
      "6 widget variants",
      "Delivery date estimates",
      "COD availability badge",
      "Basic analytics",
      "CSV bulk import",
    ],
    cta: "Start Basic",
  },
  {
    name: "Pro",
    value: "pro",
    price: "$9.99",
    period: "/month",
    badge: "Most Popular",
    features: [
      "Unlimited pincodes",
      "6 widget variants",
      "Live countdown timer",
      "Auto-detect geolocation",
      "Advanced analytics & insights",
      "Missed opportunity reports",
      "Custom CSS injection",
      "Priority support",
    ],
    cta: "Start Pro",
  },
];

export default function BillingPage() {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <Page title="Choose Your Plan" subtitle="Select the plan that fits your business">
      <BlockStack gap="500">
        <Banner tone="info">
          <p>
            Start with a <strong>3-day free trial</strong> on any plan. Cancel anytime from your Shopify admin.
          </p>
        </Banner>

        <Layout>
          {plans.map((plan) => (
            <Layout.Section key={plan.value} variant="oneHalf">
              <Card>
                <Box padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingLg" as="h2">
                        {plan.name}
                      </Text>
                      {plan.badge && <Badge tone="success">{plan.badge}</Badge>}
                    </InlineStack>

                    <InlineStack blockAlign="baseline" gap="100">
                      <Text variant="heading2xl" as="p" fontWeight="bold">
                        {plan.price}
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="span">
                        {plan.period}
                      </Text>
                    </InlineStack>

                    <Divider />

                    <List type="bullet">
                      {plan.features.map((f) => (
                        <List.Item key={f}>{f}</List.Item>
                      ))}
                    </List>

                    <Form method="post">
                      <input type="hidden" name="plan" value={plan.value} />
                      <Button
                        submit
                        variant={plan.value === "pro" ? "primary" : "secondary"}
                        size="large"
                        fullWidth
                        loading={submitting}
                      >
                        {plan.cta}
                      </Button>
                    </Form>
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </BlockStack>
    </Page>
  );
}
