// app/routes/app.analytics.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  IndexTable,
  Badge,
  EmptyState,
  Box,
  Button,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // 1. Recent Activity
  const recentChecks = await prisma.pincodeCheck.findMany({
    where: { shop: session.shop },
    orderBy: { checkedAt: "desc" },
    take: 20,
  });

  // 2. High-level Stats
  const totalChecks = await prisma.pincodeCheck.count({ where: { shop: session.shop } });
  const totalFound = await prisma.pincodeCheck.count({ where: { shop: session.shop, found: true } });

  // 3. Missed Opportunities (Top 10 unserviceable pincodes)
  const missedOpportunities = await prisma.pincodeCheck.groupBy({
    by: ["pincode"],
    where: { shop: session.shop, found: false },
    _count: { pincode: true },
    orderBy: { _count: { pincode: "desc" } },
    take: 10,
  });

  return json({ recentChecks, totalChecks, totalFound, missedOpportunities });
};

export default function AnalyticsPage() {
  const { recentChecks, totalChecks, totalFound, missedOpportunities } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const successRate = totalChecks > 0 ? Math.round((totalFound / totalChecks) * 100) : 0;
  const missedCount = totalChecks - totalFound;

  return (
    <Page title="Analytics" subtitle="Delivery availability insights">
      <BlockStack gap="500">

        {/* Top Stats Row */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm" tone="subdued">Total Searches</Text>
                <Text as="p" variant="headingXl">{totalChecks}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm" tone="subdued">Serviceability Rate</Text>
                <Text as="p" variant="headingXl" tone={successRate > 50 ? "success" : "critical"}>
                  {successRate}%
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm" tone="subdued">Missed Sales</Text>
                <Text as="p" variant="headingXl" tone="critical">{missedCount}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Dashboard Columns */}
        <Layout>

          {/* Left Column: Missed Opportunities Leaderboard */}
          <Layout.Section variant="oneHalf">
            <Card padding="0">
              <Box padding="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">Missed Opportunities</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Top 10 unserviceable pincodes with the highest customer demand.
                  </Text>
                </BlockStack>
              </Box>
              <Divider />

              {missedOpportunities.length === 0 ? (
                <Box padding="400">
                  <EmptyState
                    heading="No missed opportunities"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>All customers are searching for serviceable areas so far!</p>
                  </EmptyState>
                </Box>
              ) : (
                <IndexTable
                  resourceName={{ singular: "pincode", plural: "pincodes" }}
                  itemCount={missedOpportunities.length}
                  headings={[
                    { title: "Pincode" },
                    { title: "Lost Searches", alignment: "end" },
                    { title: "Action", alignment: "end" },
                  ]}
                  selectable={false}
                >
                  {missedOpportunities.map((item: any, index: number) => (
                    <IndexTable.Row id={item.pincode} key={item.pincode} position={index}>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                          {item.pincode}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" alignment="end" as="span" tone="critical">
                          {item._count.pincode}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <div style={{ textAlign: 'right' }}>
                          <Button size="slim" onClick={() => navigate(`/app/pincodes/new?pincode=${item.pincode}`)}>
                            Add to Serviceable
                          </Button>
                        </div>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>

          {/* Right Column: Recent Activity Feed */}
          <Layout.Section variant="oneHalf">
            <Card padding="0">
              <Box padding="400">
                <Text as="h2" variant="headingMd">Recent Activity</Text>
              </Box>
              <Divider />

              {recentChecks.length === 0 ? (
                <Box padding="400">
                  <EmptyState
                    heading="No checks yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  />
                </Box>
              ) : (
                <IndexTable
                  resourceName={{ singular: "check", plural: "checks" }}
                  itemCount={recentChecks.length}
                  headings={[
                    { title: "Pincode" },
                    { title: "Status" },
                    { title: "Time", alignment: "end" },
                  ]}
                  selectable={false}
                >
                  {recentChecks.map((check: any, index: number) => (
                    <IndexTable.Row id={check.id} key={check.id} position={index}>
                      <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                          {check.pincode}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={check.found ? "success" : "critical"}>
                          {check.found ? "Found" : "Not Found"}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text variant="bodySm" alignment="end" tone="subdued" as="span">
                          {new Date(check.checkedAt).toLocaleDateString()}
                        </Text>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>

        </Layout>
      </BlockStack>
    </Page>
  );
}
