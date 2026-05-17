// app/routes/app.pincodes.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useNavigate,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  Filters,
  InlineStack,
  BlockStack,
  EmptyState,
  Pagination,
  Box,
  Modal,
  Toast,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const PAGE_SIZE = 20;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || "";
  const filterType = url.searchParams.get("type") || "";

  const where = {
    shop: session.shop,
    ...(search ? { pincode: { contains: search } } : {}),
    ...(filterType ? { deliveryType: filterType } : {}),
  };

  const [pincodes, total] = await Promise.all([
    prisma.pincode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.pincode.count({ where }),
  ]);

  return json({ pincodes, total, page, search, filterType });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await prisma.pincode.delete({ where: { id, shop: session.shop } });
    return json({ success: true, message: "Pincode deleted" });
  }

  if (intent === "delete-bulk") {
    const ids = JSON.parse(formData.get("ids") as string) as string[];
    await prisma.pincode.deleteMany({
      where: { id: { in: ids }, shop: session.shop },
    });
    return json({ success: true, message: `${ids.length} pincodes deleted` });
  }

  if (intent === "toggle") {
    const id = formData.get("id") as string;
    const current = await prisma.pincode.findUnique({ where: { id } });
    if (current && current.shop === session.shop) {
      await prisma.pincode.update({
        where: { id },
        data: { isActive: !current.isActive },
      });
    }
    return json({ success: true });
  }

  return json({ success: false });
};

export default function PincodesPage() {
  const { pincodes, total, page, search, filterType } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [queryValue, setQueryValue] = useState(search);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deliveryBadge = (type: string) => {
    const map: Record<string, { tone: "success" | "warning" | "critical"; label: string }> = {
      express: { tone: "success", label: "⚡ Express" },
      standard: { tone: "warning", label: "📦 Standard" },
      unavailable: { tone: "critical", label: "✗ Unavailable" },
    };
    return map[type] || map.standard;
  };

  const handleSearch = useCallback(
    (value: string) => {
      setQueryValue(value);
      navigate(`/app/pincodes?search=${value}&page=1`);
    },
    [navigate]
  );

  const handleBulkDelete = () => {
    const formData = new FormData();
    formData.set("intent", "delete-bulk");
    formData.set("ids", JSON.stringify(selectedItems));
    submit(formData, { method: "post" });
    setSelectedItems([]);
    setToastMsg(`${selectedItems.length} pincodes deleted`);
  };

  const promotedBulkActions = [
    { content: "Delete selected", onAction: handleBulkDelete, tone: "destructive" as const },
  ];

  return (
    <Frame>
      {toastMsg && (
        <Toast content={toastMsg} onDismiss={() => setToastMsg(null)} />
      )}

      <Page
        title="Pincodes"
        subtitle={`${total} total pincodes`}
        primaryAction={{
          content: "Add Pincode",
          onAction: () => navigate("/app/pincodes/new"),
        }}
        secondaryActions={[
          { content: "Bulk Import CSV", onAction: () => navigate("/app/import") },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <ResourceList
                resourceName={{ singular: "pincode", plural: "pincodes" }}
                items={pincodes}
                selectedItems={selectedItems}
                onSelectionChange={(sel) => setSelectedItems(sel as string[])}
                promotedBulkActions={promotedBulkActions}
                loading={navigation.state === "loading"}
                filterControl={
                  <Filters
                    queryValue={queryValue}
                    filters={[
                      {
                        key: "type",
                        label: "Delivery Type",
                        filter: (
                          <div style={{ padding: 12 }}>
                            {["express", "standard", "unavailable"].map((t) => (
                              <Button
                                key={t}
                                size="slim"
                                pressed={filterType === t}
                                onClick={() =>
                                  navigate(
                                    `/app/pincodes?type=${t === filterType ? "" : t}`
                                  )
                                }
                              >
                                {t}
                              </Button>
                            ))}
                          </div>
                        ),
                      },
                    ]}
                    onQueryChange={handleSearch}
                    onQueryClear={() => handleSearch("")}
                    onClearAll={() => navigate("/app/pincodes")}
                  />
                }
                emptyState={
                  <EmptyState
                    heading="No pincodes added yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    action={{
                      content: "Add Pincode",
                      onAction: () => navigate("/app/pincodes/new"),
                    }}
                    secondaryAction={{
                      content: "Bulk Import",
                      onAction: () => navigate("/app/import"),
                    }}
                  >
                    <p>Add serviceable pincodes to show delivery info on your product pages.</p>
                  </EmptyState>
                }
                renderItem={(item) => {
                  const badge = deliveryBadge(item.deliveryType);
                  return (
                    <ResourceItem
                      id={item.id}
                      url={`/app/pincodes/${item.id}/edit`}
                      accessibilityLabel={`Pincode ${item.pincode}`}
                      shortcutActions={[
                        {
                          content: item.isActive ? "Deactivate" : "Activate",
                          onAction: () => {
                            const fd = new FormData();
                            fd.set("intent", "toggle");
                            fd.set("id", item.id);
                            submit(fd, { method: "post" });
                          },
                        },
                        {
                          content: "Delete",
                          destructive: true,
                          onAction: () => setDeleteModal(item.id),
                        } as any,
                      ]}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <InlineStack gap="300" blockAlign="center">
                            <Text variant="bodyMd" fontWeight="semibold" as="span">
                              {item.pincode}
                            </Text>
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                            {!item.isActive && (
                              <Badge tone="critical">Inactive</Badge>
                            )}
                            {item.codAvailable && (
                              <Badge>COD</Badge>
                            )}
                          </InlineStack>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {item.city}, {item.state} · {item.deliveryDays} days
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </Card>

            {totalPages > 1 && (
              <Box paddingBlockStart="400">
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => navigate(`/app/pincodes?page=${page - 1}`)}
                    hasNext={page < totalPages}
                    onNext={() => navigate(`/app/pincodes?page=${page + 1}`)}
                    label={`Page ${page} of ${totalPages}`}
                  />
                </InlineStack>
              </Box>
            )}
          </Layout.Section>
        </Layout>

        <Modal
          open={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Delete pincode?"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: () => {
              const fd = new FormData();
              fd.set("intent", "delete");
              fd.set("id", deleteModal!);
              submit(fd, { method: "post" });
              setDeleteModal(null);
              setToastMsg("Pincode deleted");
            },
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setDeleteModal(null) },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              This will permanently remove this pincode. Customers in this area
              will no longer see delivery info.
            </Text>
          </Modal.Section>
        </Modal>
      </Page>
    </Frame>
  );
}
