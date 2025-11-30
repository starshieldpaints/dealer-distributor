const API_BASE_URL =
  process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ddms.io';
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? 'Admin@12345!';

const callFetch = (...args: any[]) =>
  (globalThis as any).fetch(...args);

const webhooks = [
  {
    connector: 'sap-erp',
    eventType: 'order.shipped',
    targetUrl: process.env.SAP_ORDER_WEBHOOK ??
      'https://sap.alpha.com/hooks/shipments'
  },
  {
    connector: 'sap-erp',
    eventType: 'stock.updated',
    targetUrl:
      process.env.SAP_STOCK_WEBHOOK ??
      'https://sap.alpha.com/hooks/stock-updates'
  },
  {
    connector: 'salesforce-crm',
    eventType: 'payment.collected',
    targetUrl:
      process.env.SF_PAYMENT_WEBHOOK ??
      'https://crm.alpha.com/hooks/payments'
  }
];

const authenticate = async (): Promise<string> => {
  const response = await callFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  if (!response.ok) {
    throw new Error(
      `Unable to authenticate admin user (${response.status}): ${await response.text()}`
    );
  }
  const payload = (await response.json()) as {
    data: { token: string };
  };
  return payload.data.token;
};

const registerWebhook = async (token: string, body: Record<string, string>) => {
  const response = await callFetch(`${API_BASE_URL}/integrations/webhooks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    console.error(
      `Failed to register webhook ${body.eventType} at ${body.targetUrl}`,
      await response.text()
    );
  } else {
    const result = await response.json();
    console.log('Webhook registered', result.data.integrationId ?? result.data);
  }
};

const run = async () => {
  try {
    const token = await authenticate();
    for (const webhook of webhooks) {
      await registerWebhook(token, webhook);
    }
    console.log('Webhook bootstrap complete');
  } catch (error) {
    console.error('Failed to bootstrap webhooks', error);
    process.exitCode = 1;
  }
};

run();
