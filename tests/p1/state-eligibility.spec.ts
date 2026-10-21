import path from 'path';
import { Locator, Page, TestInfo, test } from '@playwright/test';
import { app, blocked, expectArea, finish, flat, open, openAdmin, readPage } from './support';

const PROVIDER_EMAIL = 'alikhanhere2905@gmail.com';
const PROVIDER_NAME = /^Muskan prov$/;
const VETERAN_NAME = /muskan aaa/i;
const VETERAN_QUERY = 'muskan aaa';
const CLINIC_NAME = 'P1 LOC';
const CLINIC_OPTION = /P1 LOC/i;
const SAME_STATE = 'Texas (TX)';
const OTHER_STATE = 'California (CA)';

const adminState = path.join(__dirname, '.auth', 'admin.json');
const veteranState = path.join(__dirname, '.auth', 'veteran.json');
const providerState = path.join(__dirname, '.auth', 'provider.json');

type Trio = { veteran: string; provider: string; clinic: string };
type Party = 'veteran' | 'provider' | 'clinic';

function codeOf(label: string): string {
  const code = label.match(/\(([A-Z]{2})\)/)?.[1];
  if (!code) app(`"${label}" is not a state option with a two-letter code.`);
  return code;
}

function saysEligible(text: string): boolean {
  if (/Not eligible|Ineligible/i.test(text)) return false;
  return /\bEligible\b/i.test(text);
}

function panelStates(text: string): Trio {
  return {
    veteran: (text.match(/Veteran:\s*([A-Z]{2})/) || [])[1] || '',
    clinic: (text.match(/Clinic:[^\n]*·\s*([A-Z]{2})/) || [])[1] || '',
    provider: (text.match(/Provider license:\s*([A-Z]{2})/) || [])[1] || '',
  };
}

function bookDialog(page: Page): Locator {
  return page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Book appointment' }) }).last();
}

async function chooseOption(page: Page, dialog: Locator, index: number, name: RegExp): Promise<void> {
  await dialog.getByRole('combobox').nth(index).click();
  const option = page.getByRole('option', { name }).first();
  await option.waitFor({ state: 'visible', timeout: 12_000 });
  await option.click();
  await page.waitForTimeout(400);
}

async function selectedLabel(select: Locator): Promise<string> {
  const label = (await select.locator('option:checked').innerText()).replace(/\s+/g, ' ').trim();
  if (!label || /^Select state/i.test(label)) app('A state field is still on "Select state", so eligibility cannot be set from it.');
  return label;
}

async function dismiss(page: Page, dialog: Locator): Promise<void> {
  const cancel = dialog.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  else await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
}

async function commit(page: Page, dialog: Locator, changed: boolean): Promise<void> {
  if (!changed) {
    await dismiss(page, dialog);
    return;
  }
  for (let step = 0; step < 6; step += 1) {
    const save = dialog.getByRole('button', { name: /Save Changes|^Save$/i }).last();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      try {
        await dialog.waitFor({ state: 'hidden', timeout: 20_000 });
      } catch {
        app(`Saving the state did not close the form. ${flat(await dialog.innerText()).slice(0, 300)}`);
      }
      await page.waitForTimeout(600);
      return;
    }
    const next = dialog.getByRole('button', { name: 'Next', exact: true });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(300);
  }
  app('The form has no Save button after the state is changed.');
}

async function openUser(page: Page, query: string): Promise<Locator> {
  await openAdmin(page, '/staff/admin/users');
  const status = page.locator('select').filter({ hasText: 'All statuses' }).first();
  if (await status.isVisible().catch(() => false)) await status.selectOption({ label: 'All statuses' }).catch(() => undefined);
  const groups = page.locator('select').filter({ hasText: 'All user groups' }).first();
  if (await groups.isVisible().catch(() => false)) await groups.selectOption({ label: 'All user groups' }).catch(() => undefined);
  await page.getByRole('textbox', { name: /Search user/i }).fill(query);
  await page.waitForTimeout(900);
  const row = page.locator('[role="row"], tr').filter({ hasText: query }).first();
  await row.waitFor({ state: 'visible', timeout: 15_000 });
  const edit = row.getByRole('button', { name: /Edit/i }).first();
  if (await edit.isVisible().catch(() => false)) await edit.click();
  else await row.locator('button').first().click();
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  return dialog;
}

async function userStateSelect(page: Page, dialog: Locator, which: 'license' | 'address'): Promise<Locator> {
  for (let step = 0; step < 6; step += 1) {
    const selects = dialog.locator('select').filter({ hasText: 'Alabama (AL)' });
    if ((await selects.count()) > 0) return which === 'license' ? selects.first() : selects.last();
    const next = dialog.getByRole('button', { name: 'Next', exact: true });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(400);
  }
  app(`Admin user settings did not show the ${which === 'license' ? 'provider license' : 'veteran'} state list.`);
}

async function readUserState(page: Page, query: string, which: 'license' | 'address'): Promise<string> {
  const dialog = await openUser(page, query);
  const select = await userStateSelect(page, dialog, which);
  const label = await selectedLabel(select);
  await dismiss(page, dialog);
  return label;
}

async function writeUserState(page: Page, query: string, which: 'license' | 'address', label: string): Promise<void> {
  const dialog = await openUser(page, query);
  const select = await userStateSelect(page, dialog, which);
  const current = await selectedLabel(select);
  const changed = current !== label;
  if (changed) await select.selectOption({ label });
  await commit(page, dialog, changed);
}

async function openClinic(page: Page): Promise<{ dialog: Locator; select: Locator }> {
  await openAdmin(page, '/staff/admin/locations');
  const search = page.getByRole('textbox', { name: /Search location/i });
  if (await search.isVisible().catch(() => false)) {
    await search.fill(CLINIC_NAME);
    await page.waitForTimeout(800);
  }
  const row = page.locator('[role="row"], tr').filter({ hasText: CLINIC_NAME }).first();
  await row.waitFor({ state: 'visible', timeout: 15_000 });
  const edit = row.getByRole('button', { name: /Edit/i }).first();
  if (await edit.isVisible().catch(() => false)) await edit.click();
  else await row.locator('button').last().click();
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  const select = dialog.locator('select').filter({ hasText: 'Alabama (AL)' }).last();
  await select.waitFor({ state: 'visible', timeout: 10_000 });
  return { dialog, select };
}

async function readClinicState(page: Page): Promise<string> {
  const { dialog, select } = await openClinic(page);
  const label = await selectedLabel(select);
  await dismiss(page, dialog);
  return label;
}

async function writeClinicState(page: Page, label: string): Promise<void> {
  const { dialog, select } = await openClinic(page);
  const current = await selectedLabel(select);
  const changed = current !== label;
  if (changed) await select.selectOption({ label });
  await commit(page, dialog, changed);
}

async function readTrio(page: Page): Promise<Trio> {
  return {
    veteran: await readUserState(page, VETERAN_QUERY, 'address'),
    provider: await readUserState(page, PROVIDER_EMAIL, 'license'),
    clinic: await readClinicState(page),
  };
}

async function writeTrio(page: Page, states: Trio): Promise<void> {
  await writeUserState(page, VETERAN_QUERY, 'address', states.veteran);
  await writeUserState(page, PROVIDER_EMAIL, 'license', states.provider);
  await writeClinicState(page, states.clinic);
}

async function eligibilityText(page: Page): Promise<string> {
  await open(page, 'staff', '/staff/appointments');
  await page.getByText(/Loading calendar/i).waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menuitem', { name: 'Book appointment' }).or(page.getByText('Book appointment', { exact: true })).first().click();
  const dialog = bookDialog(page);
  await dialog.getByRole('heading', { name: 'Book appointment' }).waitFor();
  await chooseOption(page, dialog, 0, PROVIDER_NAME);
  await chooseOption(page, dialog, 1, CLINIC_OPTION);
  await chooseOption(page, dialog, 2, VETERAN_NAME);
  await page.waitForTimeout(1000);
  const text = await dialog.innerText();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
  return text;
}

function requirePanel(text: string, expected: { veteran: string; clinic: string; provider: string }, eligible: boolean, why: string): Trio {
  const seen = panelStates(text);
  if (!seen.veteran || !seen.clinic || !seen.provider) {
    app(`Booking did not show veteran, clinic, and provider states. Panel: ${flat(text).slice(0, 350)}`);
  }
  if (seen.veteran !== expected.veteran || seen.clinic !== expected.clinic || seen.provider !== expected.provider) {
    app(`${why} Expected veteran ${expected.veteran}, clinic ${expected.clinic}, provider ${expected.provider}. Saw veteran ${seen.veteran}, clinic ${seen.clinic}, provider ${seen.provider}.`);
  }
  const shown = saysEligible(text);
  if (shown !== eligible) {
    app(`${why} The form ${shown ? 'says Eligible' : 'does not say Eligible'}. Panel: ${flat(text).slice(0, 350)}`);
  }
  return seen;
}

const ZONES: Array<{ name: RegExp; mark: RegExp }> = [
  { name: /Arizona/i, mark: /\b(AZ|Arizona)\b/i },
  { name: /Pacific/i, mark: /\b(PT|Pacific)\b/i },
  { name: /Eastern/i, mark: /\b(ET|Eastern)\b/i },
  { name: /Central/i, mark: /\b(CT|Central)\b/i },
  { name: /Mountain/i, mark: /\b(MT|Mountain)\b/i },
  { name: /Alaska/i, mark: /\b(AKT|AKST|Alaska)\b/i },
  { name: /Hawaii/i, mark: /\b(HT|HST|Hawaii)\b/i },
];

function zoneOf(label: string): { label: string; mark: RegExp } {
  const found = ZONES.find((zone) => zone.name.test(label));
  if (!found) app(`"${label}" is not a known appointment timezone.`);
  return { label: label.replace(/\s+/g, ' ').trim(), mark: found.mark };
}

async function timezoneSelect(page: Page): Promise<Locator> {
  const select = page.locator('select').filter({ hasText: 'Hawaii Time (UTC-10)' }).first();
  await select.waitFor({ state: 'visible', timeout: 15_000 });
  return select;
}

async function profileTimezone(page: Page): Promise<string> {
  await open(page, 'veteran', '/veteran/profile');
  const select = page.locator('select').filter({ hasText: 'Hawaii Time (UTC-10)' }).first();
  if (await select.isVisible().catch(() => false)) {
    return (await select.locator('option:checked').innerText()).replace(/\s+/g, ' ').trim();
  }
  const text = await readPage(page);
  const labeled = text.match(/(?:Display timezone|Timezone)\s*[:\n]?\s*([^\n]+)/i)?.[1]?.trim() || '';
  if (!labeled) app('The veteran profile does not show a timezone.');
  return labeled;
}

async function visitTimes(page: Page): Promise<string[]> {
  await page.getByText(/Loading calendar/i).waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
  const events = page.locator('.rbc-event');
  await events.first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
  const chips = (await events.allInnerTexts()).map((item) => item.replace(/\s+/g, ' ').trim()).filter((item) => /\d{1,2}:\d{2}/.test(item));
  if (chips.length) return chips;
  const event = events.first();
  if (!(await event.isVisible().catch(() => false))) return [];
  await event.click();
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  const detail = (await dialog.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  await dialog.getByRole('button', { name: /Close|Cancel/i }).first().click().catch(() => undefined);
  return detail ? [detail] : [];
}

test.describe('appointment state and timezone', () => {
  test.use({ storageState: adminState });

  test('STATE-MATCH veteran, provider, and clinic states must all match', async ({ page }, testInfo: TestInfo) => {
    testInfo.setTimeout(420_000);
    expectArea(testInfo, {
      area: 'Staff / scheduling',
      acceptance: 'Eligible only when the veteran address state, the provider license state, and the clinic location state are the same. Any one difference says Not eligible. Nothing is booked.',
      steps: [
        'In Admin Users, set muskan aaa and Muskan prov to the same state, and set P1 LOC to that state under Locations.',
        'Open Appointments, Add, Book appointment, and choose Muskan prov, P1 LOC, and muskan aaa.',
        'Change only the veteran state and read Not eligible.',
        'Change only the clinic state and read Not eligible.',
        'Change only the provider license state and read Not eligible.',
        'Put the three original states back.',
      ],
    });

    const original = await readTrio(page);
    let restored = false;
    try {
      await writeTrio(page, { veteran: SAME_STATE, provider: SAME_STATE, clinic: SAME_STATE });
      const sameCode = codeOf(SAME_STATE);
      const same = await eligibilityText(page);
      requirePanel(same, { veteran: sameCode, clinic: sameCode, provider: sameCode }, true, `All three states are ${sameCode}.`);

      await writeUserState(page, VETERAN_QUERY, 'address', OTHER_STATE);
      const veteranDiff = await eligibilityText(page);
      requirePanel(
        veteranDiff,
        { veteran: codeOf(OTHER_STATE), clinic: sameCode, provider: sameCode },
        false,
        `Veteran is ${codeOf(OTHER_STATE)} while clinic and provider stay ${sameCode}.`,
      );

      await writeUserState(page, VETERAN_QUERY, 'address', SAME_STATE);
      await writeClinicState(page, OTHER_STATE);
      const clinicDiff = await eligibilityText(page);
      requirePanel(
        clinicDiff,
        { veteran: sameCode, clinic: codeOf(OTHER_STATE), provider: sameCode },
        false,
        `Clinic is ${codeOf(OTHER_STATE)} while veteran and provider stay ${sameCode}.`,
      );

      await writeClinicState(page, SAME_STATE);
      await writeUserState(page, PROVIDER_EMAIL, 'license', OTHER_STATE);
      const providerDiff = await eligibilityText(page);
      requirePanel(
        providerDiff,
        { veteran: sameCode, clinic: sameCode, provider: codeOf(OTHER_STATE) },
        false,
        `Provider is ${codeOf(OTHER_STATE)} while veteran and clinic stay ${sameCode}.`,
      );

      await writeTrio(page, original);
      restored = true;
      const after = await readTrio(page);
      if (after.veteran !== original.veteran || after.provider !== original.provider || after.clinic !== original.clinic) {
        app(`Original states did not stick. Veteran ${after.veteran}, provider ${after.provider}, clinic ${after.clinic}. Expected ${original.veteran}, ${original.provider}, ${original.clinic}.`);
      }
      return finish(
        testInfo,
        `All three on ${sameCode} is Eligible. Veteran ${codeOf(OTHER_STATE)}, clinic ${codeOf(OTHER_STATE)}, and provider ${codeOf(OTHER_STATE)} are each Not eligible on their own. States were put back to veteran ${original.veteran}, provider ${original.provider}, clinic ${original.clinic}. Nothing was booked.`,
      );
    } finally {
      if (!restored) {
        await writeTrio(page, original).catch(() => undefined);
      }
    }
  });
});

test.describe('portal timezones', () => {
  test.use({ storageState: veteranState });

  test('ZONE-PORTAL veteran and provider times follow their own timezone', async ({ page, browser }, testInfo: TestInfo) => {
    testInfo.setTimeout(240_000);
    expectArea(testInfo, {
      area: 'Veteran / provider appointments',
      acceptance: 'Veteran appointment times use the timezone on the veteran profile. Provider appointment times use the timezone selected on the provider appointment module.',
      steps: [
        'Open the veteran profile and read the timezone.',
        'Open veteran Appointments and read the visit times.',
        'Open provider Appointments, read the timezone control, and read the visit times.',
      ],
    });

    const profile = await profileTimezone(page);
    const concrete = !/Practice default/i.test(profile);
    const veteranZone = concrete ? zoneOf(profile) : null;
    await open(page, 'veteran', '/veteran/appointments');
    const veteranTimes = await visitTimes(page);
    if (!veteranTimes.length) blocked('The veteran calendar has no visit time to compare with the profile timezone.');
    if (veteranZone) {
      const missed = veteranTimes.filter((item) => !veteranZone.mark.test(item));
      if (missed.length) {
        app(`Veteran profile timezone is ${veteranZone.label}, but a visit time is not shown in that zone. Sample: ${missed[0].slice(0, 220)}`);
      }
    }

    const providerContext = await browser.newContext({ storageState: providerState });
    const provider = await providerContext.newPage();
    try {
      await open(provider, 'provider', '/provider/appointments');
      const selected = zoneOf(await (await timezoneSelect(provider)).locator('option:checked').innerText());
      const providerTimes = await visitTimes(provider);
      if (!providerTimes.length) blocked('The provider calendar has no visit time to compare with its timezone control.');
      const missed = providerTimes.filter((item) => !selected.mark.test(item));
      if (missed.length) {
        app(`The provider appointment module is set to ${selected.label}, but a visit time is not shown in that zone. Sample: ${missed[0].slice(0, 220)}`);
      }
      const veteranNote = veteranZone
        ? `Veteran profile is ${veteranZone.label} and the visit times use that zone.`
        : `Veteran profile is "${profile}", so the visit times were only confirmed to be present.`;
      return finish(testInfo, `${veteranNote} Provider appointment module is ${selected.label} and the visit times use that zone.`);
    } finally {
      await providerContext.close();
    }
  });
});
