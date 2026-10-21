import path from 'path';
import { Browser, BrowserContext, Locator, Page, test } from '@playwright/test';
import { Portal, RoleKey, SmokeError, portalUrl } from '../helpers/env';
import { signIn, waitForShell } from '../helpers/session';

const RECORD = path.join(__dirname, 'fixtures', 'p1-record.png');

function fail(message: string): never {
  throw new SmokeError('application', message);
}

function stamp(): string {
  return Date.now().toString().slice(-6);
}

function tomorrow(): Date {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  day.setHours(0, 0, 0, 0);
  return day;
}

function futureDateText(): string {
  const day = tomorrow();
  return `${day.getMonth() + 1}/${day.getDate()}/${day.getFullYear()}`;
}

async function gotoApp(page: Page, portal: Portal, route: string): Promise<void> {
  await page.goto(`${portalUrl(portal)}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForShell(page);
}

async function signedPage(browser: Browser, portal: Portal, role: RoleKey): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, portal, role);
  return { context, page };
}

async function chooseFutureDueDate(page: Page, dialog: Locator): Promise<void> {
  const due = dialog.getByRole('textbox', { name: 'Due Date' });
  if (!(await due.isVisible().catch(() => false))) return;
  const day = tomorrow();
  const month = day.toLocaleString('en-US', { month: 'long' });
  const dayNumber = day.getDate();
  const ordinal = dayNumber % 10 === 1 && dayNumber !== 11 ? 'st' : dayNumber % 10 === 2 && dayNumber !== 12 ? 'nd' : dayNumber % 10 === 3 && dayNumber !== 13 ? 'rd' : 'th';
  const futureDay = new RegExp(`Choose .+, ${month} ${dayNumber}${ordinal}, ${day.getFullYear()}`);
  await due.click();
  let cell = page.getByRole('gridcell', { name: futureDay }).first();
  if (!(await cell.isVisible().catch(() => false))) {
    const nextMonth = page.getByRole('button', { name: 'Next month' });
    if (await nextMonth.isVisible().catch(() => false)) await nextMonth.click();
    cell = page.getByRole('gridcell', { name: futureDay }).first();
  }
  if (await cell.isVisible().catch(() => false)) await cell.click();
  else await page.keyboard.press('Escape');
}

async function readDialog(dialog: Locator): Promise<string> {
  const text = await dialog.innerText().catch(() => '');
  const values = await dialog.locator('input, textarea').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value || '').join('\n')).catch(() => '');
  return `${text}\n${values}`.replace(/[\u2010-\u2015\u2212]/g, '-');
}

async function openTask(page: Page, taskId: string): Promise<Locator> {
  const row = page.locator('tr').filter({ hasText: taskId }).first();
  await row.waitFor({ state: 'visible', timeout: 20_000 });
  await row.getByText(taskId, { exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: /Comments|Update status|Post comment/i }).last();
  await dialog.waitFor({ state: 'visible', timeout: 20_000 });
  await dialog.locator('.modal-title').first().scrollIntoViewIfNeeded().catch(() => undefined);
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const header = await readDialog(dialog);
    const titleValue = await dialog.locator('input').first().inputValue().catch(() => '');
    if (header.includes(taskId) && titleValue.trim() && !/Task - Loading/i.test(header)) return dialog;
    await page.waitForTimeout(400);
  }
  return dialog;
}

async function selectedOption(dialog: Locator, options: RegExp): Promise<string> {
  const select = dialog.locator('select').filter({ hasText: options }).first();
  if (!(await select.count())) return '';
  return select.evaluate((el) => {
    const node = el as HTMLSelectElement;
    const choice = node.options[node.selectedIndex];
    return `${choice?.text || ''} ${node.value}`.trim();
  }).catch(() => '');
}

async function refreshAndOpen(page: Page, portal: Portal, taskId: string): Promise<Locator> {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForShell(page);
  if (!page.url().includes('/tasks')) await gotoApp(page, portal, portal === 'staff' ? '/staff/tasks' : '/provider/tasks');
  const search = page.getByRole('textbox', { name: 'Search', exact: true });
  if (await search.isVisible().catch(() => false)) {
    await search.fill(taskId);
    await search.press('Enter');
    await page.waitForTimeout(800);
  }
  return openTask(page, taskId);
}

test('NX-049 Restrict changes to other users task content', async ({ browser }) => {
  test.setTimeout(300_000);
  const title = `TEST CODEGEN ${stamp()}`;
  const description = `NO DESCRIPTION FOR NOW ${stamp()}`;
  const comment = `HELLO ${stamp()}`;
  const dueText = futureDateText();
  const staffSession = await signedPage(browser, 'staff', 'ADMIN');
  const staff = staffSession.page;
  let providerSession: { context: BrowserContext; page: Page } | undefined;
  try {
    await gotoApp(staff, 'staff', '/staff/tasks');
    await staff.getByRole('button', { name: 'Create Task' }).click();
    const dialog = staff.getByRole('dialog').last();
    await chooseFutureDueDate(staff, dialog);
    await dialog.getByRole('textbox', { name: 'Type task title' }).fill(title);
    await staff.getByLabel('Priority:').selectOption('high');
    await staff.getByRole('button', { name: 'No linked case' }).click();
    const preferredCase = staff.getByRole('button', { name: 'NXL-2026-0327 — muskan aaa' });
    const caseButton = (await preferredCase.isVisible().catch(() => false))
      ? preferredCase
      : staff.getByRole('button', { name: /muskan aaa/ }).first();
    await caseButton.click();
    await dialog.getByRole('textbox', { name: 'Type Message/Task here...' }).fill(description);
    await dialog.getByRole('checkbox', { name: 'Assign to myself' }).check();
    const assignCombo = dialog.getByRole('checkbox', { name: 'Assign to myself' }).locator('xpath=following::*[@role="combobox"][1]');
    await assignCombo.click();
    await assignCombo.fill('Muskan');
    const person = staff.locator('.ant-select-item-option-content').filter({ hasText: /^Muskan prov$/ }).last();
    await person.waitFor({ state: 'visible', timeout: 10_000 });
    await person.click();
    await dialog.getByRole('textbox', { name: 'Type task title' }).click();
    await dialog.locator('.ant-select').filter({ hasText: 'Task categories' }).first().click();
    const qa = staff.locator('.ant-select-item-option-content').filter({ hasText: /^QA$/ }).last();
    await qa.waitFor({ state: 'visible', timeout: 8_000 });
    await qa.click();
    await dialog.getByRole('textbox', { name: 'Type task title' }).click();
    await dialog.getByRole('button', { name: 'Create task', exact: true }).click();
    await staff.getByText(/Task created/i).waitFor({ state: 'visible', timeout: 15_000 });
    await staff.keyboard.press('Escape');
    await staff.locator('.nxl-hot-toast').first().waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => undefined);

    const search = staff.getByRole('textbox', { name: 'Search', exact: true });
    await search.fill(title);
    await search.press('Enter');
    await staff.waitForTimeout(800);
    const staffRow = staff.locator('tr').filter({ hasText: title }).first();
    await staffRow.waitFor({ state: 'visible', timeout: 20_000 });
    const staffRowText = await staffRow.innerText();
    const taskId = (staffRowText.match(/TSK-\d+/) || [''])[0];
    if (!taskId) fail(`Staff did not generate a task id. Row: ${staffRowText.replace(/\s+/g, ' ').slice(0, 180)}`);
    if (!/Muskan prov/i.test(staffRowText) || !/Jordan Ellis/i.test(staffRowText)) fail('The saved task is missing an assignee.');
    if (!/High/i.test(staffRowText)) fail('The saved task is missing priority High.');
    if (!staffRowText.includes(dueText)) fail(`The saved due date is not the future date ${dueText}.`);
    if (!/NXL-2026-0327/.test(staffRowText)) fail('The saved task is missing the linked case.');

    providerSession = await signedPage(browser, 'provider', 'PROVIDER');
    const provider = providerSession.page;
    await gotoApp(provider, 'provider', '/provider/tasks');
    const providerSearch = provider.getByRole('textbox', { name: 'Search', exact: true });
    await providerSearch.fill(title);
    await providerSearch.press('Enter');
    await provider.waitForTimeout(800);
    let providerDialog = await openTask(provider, taskId);
    const providerOpen = await readDialog(providerDialog);
    const priorityChosen = await selectedOption(providerDialog, /High|Medium|Low|Urgent/);
    if (!providerOpen.includes(taskId) || !providerOpen.includes(title)) fail(`The provider opened a different task. Dialog: ${providerOpen.replace(/\s+/g, ' ').slice(0, 220)}`);
    if (!/High/i.test(priorityChosen || providerOpen) || !/NXL-2026-0327/.test(providerOpen)) fail('The provider task does not show the same priority and linked case.');

    const titleBox = providerDialog.getByRole('textbox', { name: /Type task title|^Title/i }).first();
    if (await titleBox.isVisible().catch(() => false) && await titleBox.isEditable().catch(() => false)) fail('The provider can edit the title.');
    const priority = providerDialog.getByLabel(/Priority/i);
    if (await priority.count() && await priority.first().isEnabled().catch(() => false) && await priority.first().evaluate((el) => el.tagName === 'SELECT' || el.getAttribute('role') === 'combobox').catch(() => false)) {
      if (await priority.first().isEditable().catch(() => false)) fail('The provider can edit the priority.');
    }
    const assignGroup = providerDialog.getByRole('radiogroup', { name: /Assign to/i });
    const radios = assignGroup.getByRole('radio');
    const radioCount = await radios.count();
    if (!radioCount) fail('The assignee control was not on the provider task.');
    for (let i = 0; i < radioCount; i += 1) {
      if (await radios.nth(i).isEnabled()) fail('The provider can edit the assignee.');
    }

    await providerDialog.locator('select').filter({ hasText: /In Progress/ }).first().selectOption('started');
    await provider.getByRole('textbox', { name: /Add a comment/i }).fill(comment);
    await provider.getByRole('button', { name: 'Post comment' }).click();
    await provider.getByRole('button', { name: 'Update status' }).click();
    await provider.getByText(comment).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);

    providerDialog = await refreshAndOpen(provider, 'provider', taskId);
    const providerAfter = await readDialog(providerDialog);
    const providerStatus = await selectedOption(providerDialog, /In Progress|Open|Completed/);
    if (!providerAfter.includes(comment)) fail('After refresh, the comment is not inside the provider task.');
    if (!/In Progress/i.test(providerStatus)) fail('After refresh, In Progress is not inside the provider task.');

    const staffDialog = await refreshAndOpen(staff, 'staff', taskId);
    const staffAfter = await readDialog(staffDialog);
    const staffStatus = await selectedOption(staffDialog, /In Progress|Open|Completed/);
    if (!/In Progress/i.test(staffStatus) && !/Status changed to started/i.test(staffAfter)) fail('After refresh, Staff does not show In Progress inside the task.');
    if (!staffAfter.includes(comment)) fail('After refresh, Staff does not show the provider comment inside the task.');
  } finally {
    await providerSession?.context.close();
    await staffSession.context.close();
  }
});

test('NX-039 Communicate disputed payments and allow correction', async ({ browser }) => {
  test.setTimeout(360_000);
  const id = stamp();
  const reference = `yess ${id}`;
  const dispute = `not approved ${id}`;
  const corrected = `paid fee ${id}`;
  const changed = `nothing is changed ${id}`;
  const staffSession = await signedPage(browser, 'staff', 'ADMIN');
  const staff = staffSession.page;
  let veteranSession: { context: BrowserContext; page: Page } | undefined;
  try {
    await gotoApp(staff, 'staff', '/staff/cases');
    const before = await staff.locator('body').innerText();
    const known = new Set(before.match(/NXL-\d{4}-\d+/g) || []);
    await staff.getByRole('button', { name: '+ Create Case' }).click();
    const dialog = staff.getByRole('dialog').last();
    await dialog.getByLabel(/Referring Organization/).selectOption('My Org');
    await dialog.getByLabel(/Case Type/).selectOption('IME Single');
    await dialog.getByRole('button', { name: 'Select Veteran + New veteran' }).click();
    await staff.getByRole('button', { name: 'muskan aaa (VET-10009) · CLI-8006', exact: true }).click();
    const providerPick = dialog.getByLabel(/Assign Provider/);
    if (await providerPick.isVisible().catch(() => false)) await providerPick.selectOption('51').catch(() => undefined);
    await dialog.getByRole('checkbox', { name: 'Wrist', exact: true }).check();
    await dialog.getByRole('button', { name: 'Create case', exact: true }).click();
    await staff.waitForTimeout(1500);
    const created = `${staff.url()}\n${await staff.locator('body').innerText()}`;
    const caseId = (created.match(/NXL-\d{4}-\d+/g) || []).find((item) => !known.has(item)) || '';
    if (!caseId) fail('Create case did not show a new case id.');

    veteranSession = await signedPage(browser, 'veteran', 'VETERAN');
    const veteran = veteranSession.page;
    await gotoApp(veteran, 'veteran', '/veteran/case');
    await veteran.getByLabel('Filter by case').selectOption(caseId);
    await veteran.getByRole('button', { name: 'Upload documents' }).click();
    await veteran.locator('input[type="file"]').first().setInputFiles(RECORD);
    await veteran.getByRole('button', { name: 'Mark records complete' }).click();

    await staff.locator('.nxl-case-field > .form-select').selectOption('Pending Pre-Review');
    await staff.getByRole('button', { name: 'Save' }).click();
    await staff.getByRole('button', { name: 'Records Review' }).click();
    await staff.locator('select').filter({ hasText: 'Sufficient' }).first().selectOption({ label: 'Sufficient' });
    await staff.getByRole('button', { name: 'Save Pre-Review' }).click();
    await staff.waitForTimeout(1000);

    await gotoApp(veteran, 'veteran', '/veteran/billing');
    await veteran.getByLabel('Filter by case').selectOption(caseId);
    const paymentReference = veteran.getByRole('textbox', { name: 'Payment reference (optional)' });
    await paymentReference.waitFor({ state: 'visible', timeout: 20_000 });
    await paymentReference.fill(reference);
    await veteran.getByRole('button', { name: /Payment submitted for/i }).click();

    await gotoApp(staff, 'staff', '/staff/billing');
    await staff.locator('table.billing-invoices-table').waitFor({ state: 'visible', timeout: 25_000 });
    const billSearch = staff.getByRole('textbox', { name: /Search/i }).first();
    if (await billSearch.isVisible().catch(() => false)) {
      await billSearch.fill(caseId);
      await staff.waitForTimeout(800);
    }
    const rows = () => staff.locator('table.billing-invoices-table tbody tr').filter({ hasText: caseId });
    await rows().filter({ hasText: /Pre-review/i }).first().getByRole('button', { name: 'View' }).click();
    let detail = staff.getByRole('dialog').last();
    await detail.locator('.billing-detail-actions .btn-primary').click();
    await detail.getByRole('textbox', { name: 'Payment Reference' }).fill(reference);
    await detail.getByRole('button', { name: 'Mark payment received' }).click();
    await staff.waitForTimeout(800);
    await detail.getByRole('button', { name: 'Close' }).last().click().catch(() => staff.keyboard.press('Escape'));
    await staff.getByRole('dialog').last().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);

    await rows().filter({ hasText: /Remainder/i }).first().getByRole('button', { name: 'View' }).click();
    detail = staff.getByRole('dialog').last();
    await detail.getByText(/Remainder/i).first().waitFor({ state: 'visible', timeout: 10_000 });
    await detail.getByRole('button', { name: 'Mark Disputed' }).click();
    await detail.getByRole('textbox', { name: 'Dispute reason' }).fill(dispute);
    await detail.getByRole('button', { name: 'Mark disputed', exact: true }).click();
    await detail.getByText(new RegExp(dispute)).first().waitFor({ state: 'visible', timeout: 15_000 });
    await detail.getByRole('button', { name: 'Close' }).last().click().catch(() => staff.keyboard.press('Escape'));

    await gotoApp(veteran, 'veteran', '/veteran/billing');
    const caseFilter = veteran.getByLabel('Filter by case');
    await caseFilter.selectOption(caseId);
    await veteran.reload({ waitUntil: 'domcontentloaded' });
    await waitForShell(veteran);
    await caseFilter.selectOption(caseId);
    const disputedBanner = veteran.locator('.banner-warn').filter({ hasText: caseId }).or(veteran.locator('.banner-warn').filter({ hasText: /Payment disputed/i })).first();
    await disputedBanner.waitFor({ state: 'visible', timeout: 20_000 });
    const correctedBox = veteran.getByRole('textbox', { name: 'Corrected payment reference' });
    const changedBox = veteran.getByRole('textbox', { name: 'What changed' });
    await correctedBox.waitFor({ state: 'visible', timeout: 15_000 });
    await changedBox.waitFor({ state: 'visible', timeout: 15_000 });
    await correctedBox.fill(corrected);
    await changedBox.fill(changed);
    await veteran.getByRole('button', { name: 'Submit corrected payment details', exact: true }).click();
    await veteran.locator('.banner-warn, .nxl-hot-toast').filter({ hasText: /submitted for verification/i }).first().waitFor({ state: 'visible', timeout: 20_000 });

    await staff.keyboard.press('Escape');
    await staff.reload({ waitUntil: 'domcontentloaded' });
    await waitForShell(staff);
    if (!staff.url().includes('/billing')) await gotoApp(staff, 'staff', '/staff/billing');
    await staff.locator('table.billing-invoices-table').waitFor({ state: 'visible', timeout: 25_000 });
    if (await billSearch.isVisible().catch(() => false)) {
      await billSearch.fill(caseId);
      await staff.waitForTimeout(800);
    }
    await rows().filter({ hasText: /Remainder/i }).first().getByRole('button', { name: 'View' }).click();
    detail = staff.getByRole('dialog').last();
    const historyBlock = detail.getByText(/^History$/i).first();
    await historyBlock.scrollIntoViewIfNeeded();
    await detail.getByText(corrected).first().waitFor({ state: 'visible', timeout: 25_000 });
    await detail.getByText(changed).first().waitFor({ state: 'visible', timeout: 10_000 });
    const history = await detail.innerText();
    if (!history.includes(corrected) || !history.includes(changed)) {
      fail(`Staff invoice history is missing the new reference or what changed. History: ${history.replace(/\s+/g, ' ').slice(0, 400)}`);
    }
    await detail.getByRole('button', { name: 'Mark as Paid' }).click();
    const paidReference = detail.getByRole('textbox', { name: 'Payment Reference' });
    const showedReference = await paidReference.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
    if (showedReference) {
      await paidReference.fill(corrected);
      await detail.getByRole('button', { name: 'Mark payment received' }).click();
    }
    await detail.getByText(/^Paid$/).first().waitFor({ state: 'visible', timeout: 20_000 });
  } finally {
    await veteranSession?.context.close();
    await staffSession.context.close();
  }
});
