import {
  DriveSpreadsheetFile,
  SpreadsheetDetails,
  SheetTabInfo,
  SalesRecord,
  ActionItemInsight
} from '../types';
import { SAMPLE_SHEET_HEADERS, getSampleSheetRawRows } from './sampleData';

/**
 * Lists Google Sheets spreadsheets from user's Drive.
 */
export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to fetch Google Drive files (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Retrieves metadata for a spreadsheet, including list of tabs/sheets.
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetDetails> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to fetch spreadsheet details (${response.status})`);
  }

  const data = await response.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title || 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${cleanId}`,
    sheets,
  };
}

/**
 * Reads values from a specified sheet tab in a spreadsheet.
 */
export async function fetchSheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  range?: string
): Promise<{ headers: string[]; rawRows: any[][] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const targetRange = encodeURIComponent(range ? `${sheetTitle}!${range}` : sheetTitle);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${targetRange}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to read sheet data (${response.status})`);
  }

  const data = await response.json();
  const values: any[][] = data.values || [];

  if (values.length === 0) {
    return { headers: [], rawRows: [] };
  }

  const headers = values[0].map((h: any) => String(h || '').trim());
  const rawRows = values.slice(1);

  return { headers, rawRows };
}

/**
 * Intelligent parser that maps arbitrary spreadsheet headers to SalesRecord fields.
 */
export function parseRowsToSalesRecords(headers: string[], rows: any[][]): SalesRecord[] {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));

  // Find index helper
  const findIdx = (keywords: string[]): number => {
    return normalizedHeaders.findIndex((h) => keywords.some((kw) => h.includes(kw)));
  };

  const dateIdx = findIdx(['date', 'time', 'day', 'timestamp']);
  const orderIdx = findIdx(['orderid', 'order', 'invoiceno', 'invoice', 'transid']);
  const skuIdx = findIdx(['sku', 'productid', 'itemcode', 'itemid', 'code', 'part']);
  const nameIdx = findIdx(['productname', 'product', 'itemname', 'item', 'title', 'description']);
  const catIdx = findIdx(['category', 'dept', 'department', 'type', 'group']);
  const unitsIdx = findIdx(['unitssold', 'units', 'qty', 'quantity', 'count', 'amountsold']);
  const priceIdx = findIdx(['unitprice', 'price', 'rate', 'retail', 'salesprice']);
  const revIdx = findIdx(['revenue', 'totalsales', 'total', 'sales', 'grosssales', 'netsales']);
  const costIdx = findIdx(['unitcost', 'cost', 'cogs', 'buyprice', 'purchaseprice']);
  const profitIdx = findIdx(['profit', 'grossprofit', 'margin', 'netprofit']);
  const stockIdx = findIdx(['currentstock', 'stock', 'inventory', 'onhand', 'quantityonhand', 'available']);
  const reorderIdx = findIdx(['reorderpoint', 'reorder', 'safetystock', 'threshold', 'minstock', 'safetystockthreshold']);
  const leadIdx = findIdx(['leadtimedays', 'leadtime', 'lead', 'deliverydays', 'restockdays']);
  const supplierIdx = findIdx(['supplier', 'vendor', 'manufacturer', 'source']);

  return rows
    .map((row, index) => {
      const getVal = (idx: number, fallback = '') => (idx >= 0 && row[idx] !== undefined ? row[idx] : fallback);
      const getNum = (idx: number, fallback = 0) => {
        if (idx < 0 || row[idx] === undefined || row[idx] === null || row[idx] === '') return fallback;
        const cleaned = String(row[idx]).replace(/[$,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? fallback : parsed;
      };

      const dateVal = String(getVal(dateIdx, `2026-09-${String(index + 1).padStart(2, '0')}`));
      const orderIdVal = String(getVal(orderIdx, `ORD-${1000 + index}`));
      const skuVal = String(getVal(skuIdx, `SKU-${100 + index}`));
      const productNameVal = String(getVal(nameIdx, skuVal || `Product ${index + 1}`));
      const categoryVal = String(getVal(catIdx, 'General'));

      const unitsSold = Math.max(0, getNum(unitsIdx, 1));
      let unitPrice = getNum(priceIdx, 0);
      let revenue = getNum(revIdx, 0);

      if (revenue === 0 && unitPrice > 0 && unitsSold > 0) {
        revenue = +(unitPrice * unitsSold).toFixed(2);
      } else if (unitPrice === 0 && revenue > 0 && unitsSold > 0) {
        unitPrice = +(revenue / unitsSold).toFixed(2);
      }

      const unitCost = getNum(costIdx, +(unitPrice * 0.45).toFixed(2));
      let profit = getNum(profitIdx, 0);
      if (profit === 0 && revenue > 0) {
        profit = +(revenue - unitCost * unitsSold).toFixed(2);
      }

      const profitMarginPercent = revenue > 0 ? +((profit / revenue) * 100).toFixed(1) : 0;
      const currentStock = Math.max(0, getNum(stockIdx, 25));
      const reorderPoint = Math.max(0, getNum(reorderIdx, 20));
      const leadTimeDays = Math.max(1, getNum(leadIdx, 14));
      const supplier = String(getVal(supplierIdx, 'Primary Supplier'));

      return {
        id: `row-${index}`,
        date: dateVal,
        orderId: orderIdVal,
        sku: skuVal,
        productName: productNameVal,
        category: categoryVal,
        unitsSold,
        unitPrice,
        revenue,
        unitCost,
        profit,
        profitMarginPercent,
        currentStock,
        reorderPoint,
        leadTimeDays,
        supplier,
        rawRowIndex: index + 2, // 1-based, accounts for header
      };
    })
    .filter((r) => r.sku && r.revenue >= 0);
}

/**
 * Creates a demo sales and inventory spreadsheet in the user's Google Drive.
 */
export async function createDemoSalesSpreadsheet(
  accessToken: string
): Promise<{ spreadsheetId: string; url: string; title: string }> {
  const title = `Kenyan Pub Sales & Inventory Tracking (${new Date().toISOString().split('T')[0]})`;
  const rawRows = getSampleSheetRawRows();

  // Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Sales_Data',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create Google Spreadsheet');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;

  // Insert sample rows
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sales_Data!A1:N${rawRows.length}?valueInputOption=USER_ENTERED`;
  const putRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rawRows,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to write initial records to created spreadsheet');
  }

  return {
    spreadsheetId,
    url: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title,
  };
}

/**
 * Appends a new sheet tab in the active spreadsheet containing an automated report.
 */
export async function exportReportToNewTab(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  markdownReport: string
): Promise<string> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const safeTabName = tabTitle.slice(0, 50).replace(/[\\/?*[\]:]/g, '_');

  // 1. Add new sheet tab via batchUpdate
  const batchAddUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`;
  const addSheetRes = await fetch(batchAddUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: safeTabName,
            },
          },
        },
      ],
    }),
  });

  if (!addSheetRes.ok) {
    const err = await addSheetRes.json().catch(() => ({}));
    // If tab already exists, we will overwrite or append
    console.warn('Batch add sheet notice:', err?.error?.message);
  }

  // 2. Convert markdown lines to spreadsheet rows
  const lines = markdownReport.split('\n').map((l) => [l]);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
    safeTabName
  )}'!A1:A${lines.length}?valueInputOption=USER_ENTERED`;

  const writeRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: lines,
    }),
  });

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to write report rows to Google Sheet');
  }

  return safeTabName;
}

/**
 * Exports prioritized restock and inventory action plan as a structured table in the spreadsheet.
 */
export async function exportRestockPlanToSheet(
  accessToken: string,
  spreadsheetId: string,
  actionItems: ActionItemInsight[]
): Promise<string> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const tabName = `Restock_Plan_${new Date().toISOString().slice(5, 10).replace('-', '')}`;

  // 1. Add Sheet
  const batchAddUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`;
  await fetch(batchAddUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
      ],
    }),
  }).catch(() => {});

  // 2. Write table rows
  const headers = [
    'SKU',
    'Product Name',
    'Category',
    'Urgency Level',
    'Current Stock',
    'Daily Velocity (Units/Day)',
    'Days Stock Remaining',
    'Recommended Reorder Qty',
    'Estimated Replenishment Cost',
    'Identified Risk / Issue',
    'Recommended Action'
  ];

  const rows = actionItems.map((item) => [
    item.sku,
    item.productName,
    item.category,
    item.urgency.toUpperCase(),
    item.currentStock,
    item.dailyRunRate,
    item.daysRemaining,
    item.suggestedOrderQty,
    `KSh ${item.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    item.issue,
    item.recommendation
  ]);

  const allRows = [headers, ...rows];

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
    tabName
  )}'!A1:K${allRows.length}?valueInputOption=USER_ENTERED`;

  const writeRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: allRows,
    }),
  });

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to export restock plan to Google Sheets');
  }

  return tabName;
}

/**
 * Extracts pure spreadsheet ID from URL or raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
