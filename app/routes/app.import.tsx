// app/routes/app.import.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  json,
} from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  DropZone,
  Button,
  BlockStack,
  Text,
  Banner,
  DataTable,
  Badge,
  Box,
  Divider,
  InlineStack,
  List,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const recentJobs = await prisma.importJob.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return json({ recentJobs });
};

function parseCSV(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["CSV is empty or has no data rows"] };

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
  const required = ["pincode", "city", "state"];
  const missing = required.filter((r) => !headers.includes(r));
  if (missing.length) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(", ")}`] };
  }

  const rows: any[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

    if (!/^\d{6}$/.test(row.pincode)) {
      errors.push(`Row ${i + 1}: Invalid pincode "${row.pincode}"`);
      continue;
    }
    if (!row.city || !row.state) {
      errors.push(`Row ${i + 1}: Missing city or state`);
      continue;
    }

    rows.push({
      pincode: row.pincode,
      city: row.city,
      state: row.state,
      deliveryType: row.delivery_type || row.deliverytype || "standard",
      deliveryDays: row.delivery_days || row.deliverydays || "3-5",
      codAvailable: (row.cod || "true").toLowerCase() !== "false",
      isActive: (row.active || "true").toLowerCase() !== "false",
    });
  }

  return { rows, errors };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const uploadHandler = unstable_createMemoryUploadHandler({ maxPartSize: 5 * 1024 * 1024 });
  const formData = await unstable_parseMultipartFormData(request, uploadHandler);

  const file = formData.get("csv") as File | null;
  if (!file) return json({ error: "No file uploaded" });

  const text = await file.text();
  const { rows, errors } = parseCSV(text);

  const job = await prisma.importJob.create({
    data: {
      shop,
      status: "processing",
      totalRows: rows.length,
      fileName: file.name,
    },
  });

  let imported = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await prisma.pincode.upsert({
        where: { shop_pincode: { shop, pincode: row.pincode } },
        update: { ...row, shop },
        create: { ...row, shop },
      });
      imported++;
    } catch {
      failed++;
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: "done",
      importedRows: imported,
      errorRows: failed + errors.length,
      errorLog: errors.length ? errors.join("\n") : null,
    },
  });

  return json({
    success: true,
    imported,
    failed: failed + errors.length,
    errors: errors.slice(0, 10),
    jobId: job.id,
  });
};

export default function ImportPage() {
  const { recentJobs } = useLoaderData<typeof loader>();
  const actionData = useActionData<any>();
  const navigation = useNavigation();

  const [file, setFile] = useState<File | null>(null);
  const uploading = navigation.state === "submitting";

  const TEMPLATE = `pincode,city,state,delivery_type,delivery_days,cod,active
110001,New Delhi,Delhi,express,1-2,true,true
400001,Mumbai,Maharashtra,express,1-2,true,true
560001,Bengaluru,Karnataka,standard,3-5,true,true
800001,Patna,Bihar,standard,4-6,true,true
999999,Remote,Himachal Pradesh,unavailable,,false,true`;

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pincode_import_template.csv";
    a.click();
  };

  return (
    <Page
      title="Bulk Import Pincodes"
      subtitle="Upload a CSV file to add thousands of pincodes at once"
      backAction={{ content: "Pincodes", url: "/app/pincodes" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.success && (
              <Banner
                title={`Import complete! ${actionData.imported} pincodes imported`}
                tone={actionData.failed > 0 ? "warning" : "success"}
              >
                {actionData.failed > 0 && (
                  <List>
                    {actionData.errors?.map((e: string, i: number) => <List.Item key={i}>{e}</List.Item>)}
                    {actionData.failed > (actionData.errors?.length || 0) && (
                      <List.Item>...and {actionData.failed - (actionData.errors?.length || 0)} more errors</List.Item>
                    )}
                  </List>
                )}
              </Banner>
            )}

            {actionData?.error && (
              <Banner tone="critical" title={actionData.error} />
            )}

            <Card>
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">Upload CSV File</Text>
                    <Button onClick={downloadTemplate} variant="plain">
                      ↓ Download Template
                    </Button>
                  </InlineStack>
                  <Divider />

                  <Banner tone="info">
                    <p>
                      Required columns: <strong>pincode, city, state</strong><br />
                      Optional: <strong>delivery_type</strong> (express/standard/unavailable), <strong>delivery_days</strong> (e.g. "3-5"), <strong>cod</strong> (true/false), <strong>active</strong> (true/false)
                    </p>
                  </Banner>

                  <Form method="post" encType="multipart/form-data">
                    <BlockStack gap="400">
                      <DropZone
                        accept=".csv"
                        type="file"
                        label="Drop CSV file here or click to upload"
                        onDrop={(files) => setFile(files[0] || null)}
                      >
                        <input type="file" name="csv" accept=".csv" style={{ display: "none" }} />
                        {file ? (
                          <Box padding="400">
                            <BlockStack gap="200" align="center">
                              <Text variant="bodyMd" fontWeight="semibold" as="p">
                                📄 {file.name}
                              </Text>
                              <Text variant="bodySm" tone="subdued" as="p">
                                {(file.size / 1024).toFixed(1)} KB
                              </Text>
                            </BlockStack>
                          </Box>
                        ) : (
                          <DropZone.FileUpload actionTitle="Select CSV" actionHint="or drag and drop" />
                        )}
                      </DropZone>

                      <Button
                        submit
                        variant="primary"
                        loading={uploading}
                        disabled={!file}
                        size="large"
                      >
                        {uploading ? "Importing..." : "Import Pincodes"}
                      </Button>
                    </BlockStack>
                  </Form>
                </BlockStack>
              </Box>
            </Card>

            {recentJobs.length > 0 && (
              <Card>
                <Box padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h2">Recent Imports</Text>
                    <Divider />
                    <DataTable
                      columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "text"]}
                      headings={["File", "Status", "Total", "Imported", "Errors", "Date"]}
                      rows={recentJobs.map((j: any) => [
                        j.fileName || "—",
                        <Badge
                          tone={j.status === "done" ? (j.errorRows > 0 ? "warning" : "success") : j.status === "failed" ? "critical" : "attention"}
                        >
                          {j.status}
                        </Badge>,
                        j.totalRows,
                        j.importedRows,
                        j.errorRows,
                        new Date(j.createdAt).toLocaleDateString("en-IN"),
                      ])}
                    />
                  </BlockStack>
                </Box>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">💡 Tips</Text>
                <Divider />
                <List type="bullet">
                  <List.Item>Max 50,000 pincodes per import</List.Item>
                  <List.Item>Duplicate pincodes will be updated (upsert)</List.Item>
                  <List.Item>CSV must use UTF-8 encoding</List.Item>
                  <List.Item>Use "unavailable" delivery_type to block specific pincodes</List.Item>
                  <List.Item>Download the template for the correct format</List.Item>
                </List>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
