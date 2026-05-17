// app/routes/app.pincodes.new.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useActionData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  InlineStack,
  BlockStack,
  Text,
  Banner,
  Box,
  Divider,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const queryPincode = url.searchParams.get("pincode") || "";

  if (params.id) {
    const pincode = await prisma.pincode.findFirst({
      where: { id: params.id, shop: session.shop },
    });
    return json({ pincode, queryPincode: "" });
  }
  return json({ pincode: null, queryPincode });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const data = {
    shop: session.shop,
    pincode: (formData.get("pincode") as string).trim(),
    city: (formData.get("city") as string).trim(),
    state: (formData.get("state") as string).trim(),
    deliveryType: formData.get("deliveryType") as string,
    deliveryDays: (formData.get("deliveryDays") as string).trim(),
    codAvailable: formData.get("codAvailable") === "true",
    isActive: formData.get("isActive") === "true",
  };

  if (!/^\d{6}$/.test(data.pincode)) {
    return json({ error: "Pincode must be exactly 6 digits" });
  }
  if (!data.city || !data.state) {
    return json({ error: "City and State are required" });
  }

  try {
    if (params.id) {
      await prisma.pincode.update({
        where: { id: params.id, shop: session.shop },
        data,
      });
    } else {
      await prisma.pincode.upsert({
        where: { shop_pincode: { shop: session.shop, pincode: data.pincode } },
        update: data,
        create: data,
      });
    }
    return redirect("/app/pincodes");
  } catch (e: any) {
    if (e.code === "P2002") {
      return json({ error: `Pincode ${data.pincode} already exists` });
    }
    return json({ error: "Failed to save pincode" });
  }
};

export default function NewPincodePage() {
  const { pincode: existing, queryPincode } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const isEditing = !!existing;

  const [pin, setPin] = useState(existing?.pincode || queryPincode || "");
  const [city, setCity] = useState(existing?.city || "");
  const [state, setState] = useState(existing?.state || "");
  const [deliveryType, setDeliveryType] = useState(existing?.deliveryType || "standard");
  const [deliveryDays, setDeliveryDays] = useState(existing?.deliveryDays || "3-5");
  const [cod, setCod] = useState(existing?.codAvailable ?? true);
  const [active, setActive] = useState(existing?.isActive ?? true);

  const daysMap: Record<string, string> = {
    express: "1-2",
    standard: "3-5",
    unavailable: "",
  };

  const handleTypeChange = (val: string) => {
    setDeliveryType(val);
    setDeliveryDays(daysMap[val] || "3-5");
  };

  return (
    <Page
      title={isEditing ? `Edit Pincode ${existing?.pincode}` : "Add Pincode"}
      backAction={{ content: "Pincodes", url: "/app/pincodes" }}
    >
      <Layout>
        <Layout.Section>
          {actionData?.error && (
            <Banner tone="critical" title="Error">
              <p>{actionData.error}</p>
            </Banner>
          )}

          <Card>
            <Box padding="400">
              <Form method="post">
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="Pincode"
                      name="pincode"
                      value={pin}
                      onChange={setPin}
                      maxLength={6}
                      placeholder="e.g. 110001"
                      helpText="6-digit Indian postal code"
                      autoComplete="off"
                    />
                    <TextField
                      label="City"
                      name="city"
                      value={city}
                      onChange={setCity}
                      placeholder="e.g. New Delhi"
                      autoComplete="off"
                    />
                  </FormLayout.Group>

                  <FormLayout.Group>
                    <TextField
                      label="State"
                      name="state"
                      value={state}
                      onChange={setState}
                      placeholder="e.g. Delhi"
                      autoComplete="off"
                    />
                    <Select
                      label="Delivery Type"
                      name="deliveryType"
                      value={deliveryType}
                      onChange={handleTypeChange}
                      options={[
                        { label: "⚡ Express (1-2 days)", value: "express" },
                        { label: "📦 Standard (3-7 days)", value: "standard" },
                        { label: "✗ Not Serviceable", value: "unavailable" },
                      ]}
                    />
                  </FormLayout.Group>

                  {deliveryType !== "unavailable" && (
                    <TextField
                      label="Delivery Days"
                      name="deliveryDays"
                      value={deliveryDays}
                      onChange={setDeliveryDays}
                      placeholder="e.g. 3-5"
                      helpText='Format: "3-5" or "1-2" (shown to customers)'
                      autoComplete="off"
                    />
                  )}
                  {deliveryType === "unavailable" && (
                    <input type="hidden" name="deliveryDays" value="" />
                  )}

                  <Divider />

                  <FormLayout.Group>
                    <Checkbox
                      label="Cash on Delivery available"
                      name="codAvailable"
                      value="true"
                      checked={cod}
                      onChange={setCod}
                    />
                    <Checkbox
                      label="Pincode is active"
                      name="isActive"
                      value="true"
                      checked={active}
                      onChange={setActive}
                    />
                  </FormLayout.Group>

                  <input type="hidden" name="codAvailable" value={cod ? "true" : "false"} />
                  <input type="hidden" name="isActive" value={active ? "true" : "false"} />

                  <InlineStack gap="300">
                    <Button submit variant="primary">
                      {isEditing ? "Save Changes" : "Add Pincode"}
                    </Button>
                    <Button onClick={() => navigate("/app/pincodes")}>Cancel</Button>
                  </InlineStack>
                </FormLayout>
              </Form>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Preview</Text>
                <Divider />
                <div style={{ padding: "14px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#f9fafb" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>{city || "City"}, {state || "State"}</p>
                  {deliveryType === "express" && <p style={{ margin: 0, color: "#16a34a", fontWeight: 700, fontSize: 14 }}>⚡ Express Delivery in {deliveryDays} Days</p>}
                  {deliveryType === "standard" && <p style={{ margin: 0, color: "#ca8a04", fontWeight: 700, fontSize: 14 }}>📦 Standard Delivery in {deliveryDays} Days</p>}
                  {deliveryType === "unavailable" && <p style={{ margin: 0, color: "#ef4444", fontWeight: 700, fontSize: 14 }}>✗ Delivery not available</p>}
                  {cod && deliveryType !== "unavailable" && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>✓ Cash on Delivery available</p>}
                </div>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
