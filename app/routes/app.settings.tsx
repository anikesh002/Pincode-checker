// app/routes/app.settings.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  BlockStack,
  Text,
  Banner,
  Box,
  Divider,
  InlineStack,
  Badge,
  RangeSlider,
  Toast,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  let settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop },
  });
  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: { shop: session.shop },
    });
  }
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const data = {
    widgetVariant: formData.get("widgetVariant") as string,
    primaryColor: formData.get("primaryColor") as string,
    accentColor: formData.get("accentColor") as string,
    buttonText: formData.get("buttonText") as string,
    placeholderText: formData.get("placeholderText") as string,
    showCodBadge: formData.get("showCodBadge") === "true",
    showCityName: formData.get("showCityName") === "true",
    borderRadius: Number(formData.get("borderRadius")),
    expressLabel: formData.get("expressLabel") as string,
    standardLabel: formData.get("standardLabel") as string,
    unavailableLabel: formData.get("unavailableLabel") as string,
    customCss: formData.get("customCss") as string,
    orderCutoffTime: formData.get("orderCutoffTime") as string,
  };

  await prisma.shopSettings.update({
    where: { shop: session.shop },
    data,
  });

  return json({ success: true });
};

const VARIANTS = [
  { value: "minimal", label: "Clean Minimal", desc: "Dawn/Debut theme style" },
  { value: "bold", label: "Dark Premium", desc: "Bold dark card with digit boxes" },
  { value: "inline", label: "Inline Strip", desc: "Flipkart compact layout" },
  { value: "pill", label: "Pill Floating", desc: "Modern D2C rounded style" },
  { value: "compact", label: "Compact Orange", desc: "Meesho/Amazon PDP style" },
  { value: "premium", label: "Progress Bar", desc: "Animated premium verify UX" },
];

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [variant, setVariant] = useState(settings.widgetVariant);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [buttonText, setButtonText] = useState(settings.buttonText);
  const [placeholder, setPlaceholder] = useState(settings.placeholderText);
  const [showCod, setShowCod] = useState(settings.showCodBadge);
  const [showCity, setShowCity] = useState(settings.showCityName);
  const [borderRadius, setBorderRadius] = useState(settings.borderRadius);
  const [expressLabel, setExpressLabel] = useState(settings.expressLabel);
  const [standardLabel, setStandardLabel] = useState(settings.standardLabel);
  const [unavailableLabel, setUnavailableLabel] = useState(settings.unavailableLabel);
  const [customCss, setCustomCss] = useState(settings.customCss);
  const [orderCutoffTime, setOrderCutoffTime] = useState((settings as any).orderCutoffTime || "14:00");
  const [showToast, setShowToast] = useState(false);

  const saving = navigation.state === "submitting";

  if (actionData?.success && !showToast) setShowToast(true);

  return (
    <Frame>
      {showToast && (
        <Toast
          content="Settings saved successfully!"
          onDismiss={() => setShowToast(false)}
        />
      )}

      <Page title="Widget Settings" subtitle="Customize how the delivery checker appears on your store">
        <Form method="post">
          <Layout>
            <Layout.Section variant="oneHalf">
              <BlockStack gap="500">
                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Widget Style</Text>
                      <Divider />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {VARIANTS.map((v: any) => (
                          <div
                            key={v.value}
                            onClick={() => setVariant(v.value)}
                            style={{
                              padding: "12px 14px",
                              border: `2px solid ${variant === v.value ? primaryColor : "#e5e7eb"}`,
                              borderRadius: 10,
                              cursor: "pointer",
                              background: variant === v.value ? "#f0f9ff" : "#fff",
                              transition: "all 0.15s",
                            }}
                          >
                            <InlineStack align="space-between" blockAlign="start">
                              <BlockStack gap="050">
                                <Text variant="bodyMd" fontWeight="semibold" as="span">
                                  {v.label}
                                </Text>
                                <Text variant="bodySm" tone="subdued" as="span">
                                  {v.desc}
                                </Text>
                              </BlockStack>
                              {variant === v.value && <Badge tone="success">Active</Badge>}
                            </InlineStack>
                          </div>
                        ))}
                      </div>
                      <input type="hidden" name="widgetVariant" value={variant} />
                    </BlockStack>
                  </Box>
                </Card>

                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Colors</Text>
                      <Divider />
                      <FormLayout>
                        <FormLayout.Group>
                          <TextField
                            label="Primary Color (button/border)"
                            name="primaryColor"
                            value={primaryColor}
                            onChange={setPrimaryColor}
                            prefix={
                              <div style={{ width: 16, height: 16, borderRadius: 4, background: primaryColor, border: "1px solid #e5e7eb" }} />
                            }
                            autoComplete="off"
                          />
                          <TextField
                            label="Accent Color (success/available)"
                            name="accentColor"
                            value={accentColor}
                            onChange={setAccentColor}
                            prefix={
                              <div style={{ width: 16, height: 16, borderRadius: 4, background: accentColor, border: "1px solid #e5e7eb" }} />
                            }
                            autoComplete="off"
                          />
                        </FormLayout.Group>
                      </FormLayout>
                    </BlockStack>
                  </Box>
                </Card>

                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Labels & Text</Text>
                      <Divider />
                      <FormLayout>
                        <FormLayout.Group>
                          <TextField
                            label="Button Text"
                            name="buttonText"
                            value={buttonText}
                            onChange={setButtonText}
                            autoComplete="off"
                          />
                          <TextField
                            label="Input Placeholder"
                            name="placeholderText"
                            value={placeholder}
                            onChange={setPlaceholder}
                            autoComplete="off"
                          />
                        </FormLayout.Group>
                        <TextField
                          label="Express Delivery Label"
                          name="expressLabel"
                          value={expressLabel}
                          onChange={setExpressLabel}
                          autoComplete="off"
                        />
                        <TextField
                          label="Standard Delivery Label"
                          name="standardLabel"
                          value={standardLabel}
                          onChange={setStandardLabel}
                          autoComplete="off"
                        />
                        <TextField
                          label="Unavailable Label"
                          name="unavailableLabel"
                          value={unavailableLabel}
                          onChange={setUnavailableLabel}
                          autoComplete="off"
                        />
                      </FormLayout>
                    </BlockStack>
                  </Box>
                </Card>

                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Display Options</Text>
                      <Divider />
                      <RangeSlider
                        label={`Border Radius: ${borderRadius}px`}
                        min={0}
                        max={24}
                        step={2}
                        value={borderRadius}
                        onChange={(val) => setBorderRadius(val as number)}
                        output
                      />
                      <input type="hidden" name="borderRadius" value={borderRadius} />
                      <Checkbox
                        label="Show city & state name"
                        name="showCityName"
                        value="true"
                        checked={showCity}
                        onChange={setShowCity}
                      />
                      <Checkbox
                        label="Show COD availability badge"
                        name="showCodBadge"
                        value="true"
                        checked={showCod}
                        onChange={setShowCod}
                      />
                      <input type="hidden" name="showCityName" value={showCity ? "true" : "false"} />
                      <input type="hidden" name="showCodBadge" value={showCod ? "true" : "false"} />
                    </BlockStack>
                  </Box>
                </Card>

                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Dispatch & Delivery</Text>
                      <Divider />
                      <TextField
                        label="Order Cut-off Time (24h format)"
                        name="orderCutoffTime"
                        type="time"
                        value={orderCutoffTime}
                        onChange={setOrderCutoffTime}
                        autoComplete="off"
                        helpText="Orders placed after this time will add 1 day to the transit calculation. Used for live countdown timers."
                      />
                    </BlockStack>
                  </Box>
                </Card>

                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h2">Custom CSS</Text>
                      <TextField
                        label=""
                        name="customCss"
                        value={customCss}
                        onChange={setCustomCss}
                        multiline={6}
                        placeholder=".pdc-widget { font-family: 'Outfit', sans-serif; }"
                        autoComplete="off"
                        helpText="Override widget styles. Target .pdc-widget and its children."
                        monospaced
                      />
                    </BlockStack>
                  </Box>
                </Card>

                <Button submit variant="primary" loading={saving} size="large">
                  Save Settings
                </Button>
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneHalf">
              <div style={{ position: "sticky", top: 20 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h2">Live Preview</Text>
                        <Badge tone="info">{variant}</Badge>
                      </InlineStack>
                      <Divider />
                      <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 20, border: "1px dashed #d1d5db" }}>
                        <Text variant="bodySm" tone="subdued" as="p">↓ Widget appears here on product page</Text>
                        <div style={{ marginTop: 12 }}>
                          <WidgetPreview
                            variant={variant}
                            primaryColor={primaryColor}
                            accentColor={accentColor}
                            buttonText={buttonText}
                            placeholder={placeholder}
                            borderRadius={borderRadius}
                            showCod={showCod}
                            showCity={showCity}
                            expressLabel={expressLabel}
                            standardLabel={standardLabel}
                          />
                        </div>
                      </div>
                      <Banner tone="info">
                        <p>After saving, go to Online Store → Themes → Customize and add the Pincode Delivery Checker block to your product page template.</p>
                      </Banner>
                    </BlockStack>
                  </Box>
                </Card>
              </div>
            </Layout.Section>
          </Layout>
        </Form>
      </Page>
    </Frame>
  );
}

function WidgetPreview({ variant, primaryColor, accentColor, buttonText, placeholder, borderRadius, showCod, showCity, expressLabel, standardLabel }: any) {
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<null | "success" | "error" | "loading">(null);

  const handleDemo = () => {
    if (pin.length !== 6) return;
    setResult("loading");
    setTimeout(() => {
      setResult(Number(pin) % 2 === 0 ? "success" : "error");
    }, 800);
  };

  const widgetStyles = `
    .pdc-widget { font-family: inherit; margin: 12px 0; }
    .pdc-input-row { display: flex; gap: 8px; align-items: center; }
    .pdc-input { flex:1; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:var(--pdc-radius); font-size:15px; letter-spacing:2px; outline:none !important; box-shadow:none !important; font-family:inherit; background:#fff; color:#111; transition:border-color .2s; min-width:0; box-sizing:border-box; }
    .pdc-input:focus { border-color: var(--pdc-primary); outline:none !important; box-shadow:none !important; }
    .pdc-button { padding:10px 20px; background:var(--pdc-primary); color:#fff; border:none; border-radius:var(--pdc-radius); font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; display:flex; align-items:center; gap:6px; transition:opacity .2s; }
    .pdc-button:hover { opacity:.9; }
    .pdc-button:disabled { opacity:.5; cursor:not-allowed; }
    @keyframes pdc-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
    .pdc-button-loading svg { animation: pdc-spin .7s linear infinite; }
    .pdc-result { margin-top:10px; padding:10px 14px; border-radius:var(--pdc-radius); font-size:13px; }
    .pdc-result.pdc-found { background:#f0fdf4; border:1px solid #bbf7d0; }
    .pdc-result.pdc-not-found { background:#fef2f2; border:1px solid #fecaca; }
    .pdc-city { font-size:11px; color:#6b7280; margin:0 0 3px; }
    .pdc-delivery-label { font-weight:700; margin:0; }
    .pdc-cod { font-size:11px; color:#6b7280; margin:3px 0 0; }
    .pdc-error { color:#dc2626; font-weight:600; margin:0; }
    .pdc-header { margin:0 0 8px; font-size:12px; font-weight:600; color:#374151; letter-spacing:.3px; text-transform:uppercase; display:flex; align-items:center; gap:6px; }

    /* ── Variant: Minimal ──────────────────────────────────── */
    .pdc-variant--minimal .pdc-inner { border:1.5px solid #e5e7eb; border-radius:12px; padding:20px 24px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.06); }

    /* ── Variant: Bold / Dark ──────────────────────────────── */
    .pdc-variant--bold .pdc-inner { background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:16px; padding:24px; color:#fff; position:relative; overflow:hidden; }
    .pdc-variant--bold .pdc-bold-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
    .pdc-variant--bold .pdc-bold-icon { font-size:20px; }
    .pdc-variant--bold .pdc-bold-title { margin:0; font-size:15px; font-weight:700; color:#fff; }
    .pdc-variant--bold .pdc-bold-subtitle { margin:0; font-size:11px; color:#94a3b8; }
    .pdc-variant--bold .pdc-bold-circle { position:absolute; border-radius:50%; pointer-events:none; }
    .pdc-variant--bold .pdc-bold-circle--top { top:-40px; right:-40px; width:120px; height:120px; background:rgba(99,102,241,.15); }
    .pdc-variant--bold .pdc-bold-circle--bottom { bottom:-20px; left:-20px; width:80px; height:80px; background:rgba(16,185,129,.1); }
    .pdc-variant--bold .pdc-digit-boxes { display:flex; gap:6px; margin-bottom:14px; }
    .pdc-variant--bold .pdc-digit-box { flex:1; height:44px; background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.12); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#475569; transition:all .15s; }
    .pdc-variant--bold .pdc-digit-box.pdc-digit--filled { background:rgba(99,102,241,.3); border-color:#818cf8; color:#e0e7ff; }
    .pdc-variant--bold .pdc-input { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.15); color:#fff; }
    .pdc-variant--bold .pdc-button { background:linear-gradient(135deg,#6366f1,#8b5cf6); }
    .pdc-variant--bold .pdc-button:disabled { background:rgba(255,255,255,.1); }
    .pdc-variant--bold .pdc-result.pdc-found { background:rgba(16,185,129,.15); border-color:rgba(16,185,129,.3); }
    .pdc-variant--bold .pdc-result.pdc-not-found { background:rgba(239,68,68,.15); border-color:rgba(239,68,68,.3); }
    .pdc-variant--bold .pdc-city { color:#94a3b8; }
    .pdc-variant--bold .pdc-error { color:#fca5a5; }

    /* ── Variant: Inline ───────────────────────────────────── */
    .pdc-variant--inline .pdc-inner { background:#fff; border:1px solid #e0e0e0; border-radius:4px; padding:14px 16px; }
    .pdc-variant--inline .pdc-input-row { flex-wrap:wrap; }
    .pdc-variant--inline .pdc-inline-label { font-size:13px; color:#212121; font-weight:500; }
    .pdc-variant--inline .pdc-inline-group { display:flex; align-items:center; gap:0; flex:1; min-width:200px; }
    .pdc-variant--inline .pdc-input { border:1.5px solid #2874f0; border-right:none; border-radius:4px 0 0 4px; width:110px; flex:none; padding:6px 10px; font-size:14px; }
    .pdc-variant--inline .pdc-button { background:#2874f0; border:1.5px solid #2874f0; border-radius:0 4px 4px 0; padding:6px 12px; }
    .pdc-variant--inline .pdc-inline-result-text { font-size:13px; font-weight:600; }

    /* ── Variant: Pill ─────────────────────────────────────── */
    .pdc-variant--pill .pdc-inner { padding:0; }
    .pdc-variant--pill .pdc-pill-row { display:flex; align-items:center; gap:0; background:#f8fafc; border:2px solid #e2e8f0; border-radius:50px; padding:6px 6px 6px 18px; transition:border-color .2s, box-shadow .2s; }
    .pdc-variant--pill .pdc-pill-row:focus-within { border-color:#0ea5e9; box-shadow:0 0 0 4px rgba(14,165,233,.1); }
    .pdc-variant--pill .pdc-pill-icon { font-size:16px; margin-right:8px; }
    .pdc-variant--pill .pdc-input { border:none; background:transparent; letter-spacing:2px; padding:8px 4px; }
    .pdc-variant--pill .pdc-button { background:#0ea5e9; border-radius:50px; padding:8px 20px; }
    .pdc-variant--pill .pdc-button:disabled { background:#cbd5e1; }
    .pdc-variant--pill .pdc-result { border-radius:12px; border-left:3px solid #22c55e; display:flex; align-items:center; gap:10px; }
    .pdc-variant--pill .pdc-result.pdc-not-found { border-left-color:#ef4444; }
    .pdc-variant--pill .pdc-result-icon { font-size:20px; flex-shrink:0; }

    /* ── Variant: Compact ──────────────────────────────────── */
    .pdc-variant--compact .pdc-inner { border:1px solid #ddd; border-radius:8px; overflow:hidden; }
    .pdc-variant--compact .pdc-compact-header { background:#fff8ed; padding:8px 14px; border-bottom:1px solid #ffe4b5; }
    .pdc-variant--compact .pdc-compact-label { font-size:12px; font-weight:700; color:#92400e; letter-spacing:.5px; }
    .pdc-variant--compact .pdc-compact-body { padding:14px; }
    .pdc-variant--compact .pdc-button { background:#f97316; }

    /* ── Variant: Premium ──────────────────────────────────── */
    .pdc-variant--premium .pdc-inner { background:#fafafa; border:1.5px solid #e4e4e7; border-radius:14px; padding:22px; }
    .pdc-variant--premium .pdc-premium-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
    .pdc-variant--premium .pdc-premium-title { margin:0; font-size:15px; font-weight:800; color:#18181b; }
    .pdc-variant--premium .pdc-premium-subtitle { margin:2px 0 0; font-size:12px; color:#71717a; }
    .pdc-variant--premium .pdc-premium-badge { padding:3px 10px; background:#dcfce7; color:#15803d; border-radius:20px; font-size:11px; font-weight:700; }
    .pdc-variant--premium .pdc-premium-input-wrap { position:relative; margin-bottom:14px; }
    .pdc-variant--premium .pdc-input { width:100%; padding-right:100px; border-color:#e4e4e7; border-radius:10px; background:#fff; }
    .pdc-variant--premium .pdc-button { position:absolute; right:6px; top:50%; transform:translateY(-50%); padding:7px 16px; font-size:12px; border-radius:8px; background:#18181b; }
    .pdc-variant--premium .pdc-button:disabled { background:#e4e4e7; color:#a1a1aa; }
    .pdc-variant--premium .pdc-progress-track { height:3px; background:#f4f4f5; border-radius:10px; margin-bottom:12px; overflow:hidden; }
    .pdc-variant--premium .pdc-progress-bar { height:100%; width:0; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:10px; transition:width .15s ease; }
    .pdc-variant--premium .pdc-result { border-radius:10px; display:flex; align-items:center; gap:12px; }
    .pdc-variant--premium .pdc-result-icon { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
    .pdc-variant--premium .pdc-result-icon.pdc-result-icon--ok { background:#dcfce7; }
    .pdc-variant--premium .pdc-result-icon.pdc-result-icon--fail { background:#fee2e2; }
  `;

  const LoaderIcon = () => (
    <span className="pdc-button-loading" aria-hidden="true" style={{ display: result === "loading" ? "flex" : "none" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
    </span>
  );

  const renderResultBox = () => {
    if (!result || result === "loading") return null;
    const isPillOrPremium = variant === "pill" || variant === "premium";

    if (result === "success") {
      return (
        <div className="pdc-result pdc-found">
          {isPillOrPremium && <span className="pdc-result-icon pdc-result-icon--ok">⚡</span>}
          <div>
            {showCity && <p className="pdc-city">Mumbai, Maharashtra</p>}
            <p className="pdc-delivery-label" style={{ color: "#16a34a" }}>⚡ {expressLabel} in 1-2 Days</p>
            {showCod && <p className="pdc-cod">✓ COD available</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="pdc-result pdc-not-found">
        {isPillOrPremium && <span className="pdc-result-icon pdc-result-icon--fail">❌</span>}
        <div><p className="pdc-error">✗ Delivery not available</p></div>
      </div>
    );
  };

  const renderVariant = () => {
    switch (variant) {
      case "bold":
        return (
          <div className="pdc-inner">
            <div className="pdc-bold-header">
              <span className="pdc-bold-icon">📍</span>
              <div>
                <p className="pdc-bold-title">Check Delivery Availability</p>
                <p className="pdc-bold-subtitle">Enter 6-digit pincode to check</p>
              </div>
            </div>
            <div className="pdc-bold-circle pdc-bold-circle--top"></div>
            <div className="pdc-bold-circle pdc-bold-circle--bottom"></div>
            <div className="pdc-digit-boxes">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`pdc-digit-box ${pin[i] ? 'pdc-digit--filled' : ''}`}>{pin[i] || '–'}</span>
              ))}
            </div>
            <div className="pdc-input-row">
              <input className="pdc-input" placeholder={placeholder} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
              <button className="pdc-button" disabled={pin.length !== 6} onClick={handleDemo}>
                <span className="pdc-button-text" style={{ display: result === "loading" ? "none" : "block" }}>GO</span>
                <LoaderIcon />
              </button>
            </div>
            {renderResultBox()}
          </div>
        );

      case "inline":
        return (
          <div className="pdc-inner">
            <div className="pdc-input-row">
              <span className="pdc-inline-label">Delivery to</span>
              <div className="pdc-inline-group">
                <input className="pdc-input" placeholder={placeholder} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
                <button className="pdc-button" disabled={pin.length !== 6} onClick={handleDemo}>
                  <span className="pdc-button-text" style={{ display: result === "loading" ? "none" : "block" }}>{buttonText}</span>
                  <LoaderIcon />
                </button>
              </div>
            </div>
            {renderResultBox()}
          </div>
        );

      case "pill":
        return (
          <div className="pdc-inner">
            <div className="pdc-pill-row">
              <span className="pdc-pill-icon">📦</span>
              <input className="pdc-input" placeholder={placeholder} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
              <button className="pdc-button" disabled={pin.length !== 6} onClick={handleDemo}>
                <span className="pdc-button-text" style={{ display: result === "loading" ? "none" : "block" }}>Check →</span>
                <LoaderIcon />
              </button>
            </div>
            {renderResultBox()}
          </div>
        );

      case "compact":
        return (
          <div className="pdc-inner">
            <div className="pdc-compact-header">
              <span className="pdc-compact-label">📍 DELIVERY CHECKER</span>
            </div>
            <div className="pdc-compact-body">
              <div className="pdc-input-row">
                <input className="pdc-input" placeholder={placeholder} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
                <button className="pdc-button" disabled={pin.length !== 6} onClick={handleDemo}>
                  <span className="pdc-button-text" style={{ display: result === "loading" ? "none" : "block" }}>{buttonText}</span>
                  <LoaderIcon />
                </button>
              </div>
              {renderResultBox()}
            </div>
          </div>
        );

      case "premium":
        return (
          <div className="pdc-inner">
            <div className="pdc-premium-header">
              <div>
                <h4 className="pdc-premium-title">Delivery Check</h4>
                <p className="pdc-premium-subtitle">Ships from our Warehouse</p>
              </div>
              <span className="pdc-premium-badge">PAN India</span>
            </div>
            <div className="pdc-premium-input-wrap">
              <input className="pdc-input" placeholder={placeholder} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
              <button className="pdc-button" disabled={pin.length !== 6} onClick={handleDemo}>
                <span className="pdc-button-text" style={{ display: result === "loading" ? "none" : "block" }}>Verify</span>
                <LoaderIcon />
              </button>
            </div>
            {result === "loading" && (
              <div className="pdc-progress-track">
                <div className="pdc-progress-bar" style={{ width: "100%", transition: "width 0.8s" }}></div>
              </div>
            )}
            {renderResultBox()}
          </div>
        );

      default: // minimal
        return (
          <div className="pdc-inner">
            <p className="pdc-header"><span className="pdc-icon">🚚</span> Check Delivery Availability</p>
            <div className="pdc-input-row">
              <input className="pdc-input" placeholder={placeholder} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
              <button className="pdc-button" disabled={pin.length !== 6} onClick={handleDemo}>
                <span className="pdc-button-text" style={{ display: result === "loading" ? "none" : "block" }}>{buttonText}</span>
                <LoaderIcon />
              </button>
            </div>
            {renderResultBox()}
          </div>
        );
    }
  };

  return (
    <>
      <style>{widgetStyles}</style>
      <div
        className={`pdc-widget pdc-variant--${variant}`}
        style={{
          "--pdc-primary": primaryColor,
          "--pdc-accent": accentColor,
          "--pdc-radius": `${borderRadius}px`
        } as React.CSSProperties}
      >
        {renderVariant()}
      </div>
    </>
  );
}
