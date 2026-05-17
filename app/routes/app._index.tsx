// app/routes/app._index.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Box,
  Icon,
  Divider,
  Banner,
  Grid,
} from "@shopify/polaris";
import {
  LocationIcon,
  ChartLineIcon,
  SettingsIcon,
  ImportIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [totalPincodes, activePincodes, todayChecks, weekChecks, settings] =
    await Promise.all([
      prisma.pincode.count({ where: { shop } }),
      prisma.pincode.count({ where: { shop, isActive: true } }),
      prisma.pincodeCheck.count({
        where: {
          shop,
          checkedAt: { gte: new Date(Date.now() - 86400000) },
        },
      }),
      prisma.pincodeCheck.count({
        where: {
          shop,
          checkedAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
      prisma.shopSettings.findUnique({ where: { shop } }),
    ]);

  const topPincodes = await prisma.pincodeCheck.groupBy({
    by: ["pincode"],
    where: { shop },
    _count: { pincode: true },
    orderBy: { _count: { pincode: "desc" } },
    take: 5,
  });

  return json({
    shop,
    totalPincodes,
    activePincodes,
    todayChecks,
    weekChecks,
    settings,
    topPincodes,
    isConfigured: totalPincodes > 0,
  });
};

export default function Dashboard() {
  const {
    shop,
    totalPincodes,
    activePincodes,
    todayChecks,
    weekChecks,
    settings,
    topPincodes,
    isConfigured,
  } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  const stats = [
    {
      label: "Total Pincodes",
      value: totalPincodes.toLocaleString(),
      icon: LocationIcon,
      color: "#3b82f6",
      bg: "#eff6ff",
    },
    {
      label: "Active Pincodes",
      value: activePincodes.toLocaleString(),
      icon: CheckCircleIcon,
      color: "#22c55e",
      bg: "#f0fdf4",
    },
    {
      label: "Checks Today",
      value: todayChecks.toLocaleString(),
      icon: ChartLineIcon,
      color: "#f59e0b",
      bg: "#fffbeb",
    },
    {
      label: "Checks This Week",
      value: weekChecks.toLocaleString(),
      icon: ChartLineIcon,
      color: "#8b5cf6",
      bg: "#f5f3ff",
    },
  ];

  return (
    <Page
      title="Pincode Delivery Checker"
      subtitle={`Managing ${shop}`}
      primaryAction={{
        content: "Add Pincodes",
        icon: LocationIcon,
        onAction: () => navigate("/app/pincodes/new"),
      }}
      secondaryActions={[
        {
          content: "Bulk Import",
          icon: ImportIcon,
          onAction: () => navigate("/app/import"),
        },
      ]}
    >
      <BlockStack gap="500">
        {!isConfigured && (
          <Banner
            title="Get started — add your first pincodes"
            tone="info"
            action={{
              content: "Add Pincodes",
              onAction: () => navigate("/app/pincodes/new"),
            }}
            secondaryAction={{
              content: "Bulk Import CSV",
              onAction: () => navigate("/app/import"),
            }}
          >
            <p>
              Add serviceable pincodes so customers can check delivery
              availability directly on your product pages.
            </p>
          </Banner>
        )}

        <Grid>
          {stats.map((stat) => (
            <Grid.Cell key={stat.label} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Box padding="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="headingXl" as="p" fontWeight="bold">
                        {stat.value}
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {stat.label}
                      </Text>
                    </BlockStack>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: stat.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon source={stat.icon} tone="base" />
                    </div>
                  </InlineStack>
                </Box>
              </Card>
            </Grid.Cell>
          ))}
        </Grid>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Quick Actions
                  </Text>
                  <Divider />
                  <BlockStack gap="300">
                    {[
                      {
                        label: "Manage Pincodes",
                        icon: LocationIcon,
                        path: "/app/pincodes",
                        badge: `${activePincodes} active`,
                      },
                      {
                        label: "Widget Settings",
                        icon: SettingsIcon,
                        path: "/app/settings",
                        badge: settings?.widgetVariant || "minimal",
                      },
                      {
                        label: "Analytics",
                        icon: ChartLineIcon,
                        path: "/app/analytics",
                        badge: `${weekChecks} this week`,
                      },
                      {
                        label: "Bulk Import CSV",
                        icon: ImportIcon,
                        path: "/app/import",
                        badge: "CSV/Excel",
                      },
                    ].map((item) => (
                      <div
                        key={item.path}
                        style={{
                          padding: "12px 14px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "background 0.15s",
                        }}
                        onClick={() => navigate(item.path)}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <Icon source={item.icon} />
                          <Text variant="bodyMd" as="span" fontWeight="medium">
                            {item.label}
                          </Text>
                        </InlineStack>
                        <Badge>{item.badge}</Badge>
                      </div>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Top Searched Pincodes
                    </Text>
                    <Button
                      variant="plain"
                      onClick={() => navigate("/app/analytics")}
                    >
                      View all →
                    </Button>
                  </InlineStack>
                  <Divider />
                  {topPincodes.length === 0 ? (
                    <Box padding="600">
                      <BlockStack gap="200" align="center">
                        <Text tone="subdued" as="p" alignment="center">
                          No searches yet. Customers will start checking once
                          you add the widget.
                        </Text>
                      </BlockStack>
                    </Box>
                  ) : (
                    <BlockStack gap="300">
                      {topPincodes.map((p: any, i: number) => (
                        <div key={p.pincode}>
                          <InlineStack
                            align="space-between"
                            blockAlign="center"
                          >
                            <InlineStack gap="300" blockAlign="center">
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background:
                                    i === 0 ? "#fbbf24" : "#e5e7eb",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: i === 0 ? "#fff" : "#6b7280",
                                }}
                              >
                                {i + 1}
                              </div>
                              <Text variant="bodyMd" as="span" fontWeight="semibold">
                                {p.pincode}
                              </Text>
                            </InlineStack>
                            <InlineStack gap="300" blockAlign="center">
                              <div
                                style={{
                                  width: 120,
                                  height: 6,
                                  background: "#f3f4f6",
                                  borderRadius: 10,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (p._count.pincode /
                                        (topPincodes[0]?._count.pincode || 1)) *
                                        100
                                    )}%`,
                                    height: "100%",
                                    background:
                                      i === 0 ? "#3b82f6" : "#93c5fd",
                                    borderRadius: 10,
                                  }}
                                />
                              </div>
                              <Text
                                variant="bodySm"
                                as="span"
                                tone="subdued"
                              >
                                {p._count.pincode} checks
                              </Text>
                            </InlineStack>
                          </InlineStack>
                        </div>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <Box padding="400">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">
                    Widget Style:{" "}
                    <Badge tone="success">
                      {settings?.widgetVariant || "minimal"}
                    </Badge>
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Currently active on your storefront product pages
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button onClick={() => navigate("/app/settings")}>
                    Change Style
                  </Button>
                  <Button
                    variant="primary"
                    url={`https://${shop}/admin/themes/current/editor?context=apps`}
                    target="_blank"
                  >
                    Add Widget to Theme →
                  </Button>
                </InlineStack>
              </InlineStack>
              <Divider />
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">
                  📋 Setup Instructions
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  1. Click <strong>"Add Widget to Theme"</strong> above to open the Theme Editor{"\n"}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  2. Navigate to your <strong>Product page</strong> template
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  3. Click <strong>"Add block"</strong> → Find <strong>"Pincode Delivery Checker"</strong> under Apps
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  4. In the block settings, paste your <strong>App API URL</strong> (shown in your terminal when running the app)
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  5. Click <strong>Save</strong> — the widget is now live on your product pages!
                </Text>
              </BlockStack>
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}
