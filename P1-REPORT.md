# P1 production blockers

Last update: 2026-10-21T08:54:25.254Z

**46 fixed. 2 not fixed. 2 not fully verified.**


## Fixed (46)

| ID | Area | Result |
| --- | --- | --- |
| NX-002 | Staff / billing | Case types show configurable prices. Credit or override text was visible. Sample: $100. |
| NX-003 | Staff / provider | Directory shows Deactivate (offboard), Onboard / Activate, and Booking status. No provider was turned off. |
| NX-005 | Staff / scheduling | Add Location includes Onboarding and says the clinic stays off the schedule. Nothing was saved. |
| NX-007 | Staff / scheduling | All three states MD at P1 LOC is eligible. Veteran MD and provider MD with clinic TX is not eligible, and Book stays blocked until the checkbox and reason are filled. Nothing was booked. |
| NX-009 | All appointment portals | Veteran, Provider, Staff notifications include a reschedule or cancel notice with a time zone. No appointment was changed. |
| NX-010 | Admin / billing | Cancellation and rescheduling fees are on billing or on a past or later appointment. |
| NX-014 | Provider / calendar | Provider day, week, and month views all show appointments. A visit near midnight is on the calendar. |
| NX-015 | Provider / case | Provider and staff both open notes or transcripts on NXL-2026-0224. No note was saved. |
| NX-016 | Provider / tasks | Tasks stay linked to a case id. Create Task is tied to a case. The form shows a case field. Nothing was saved. |
| NX-017 | Provider / case | NXL-2026-0224 shows only its own tasks, with status and due date. NXL-2026-0308 does not show those tasks. |
| NX-020 | Veteran / representative | Veteran and representative menus have no Tasks module. Veteran alerts show read or unread state and a link. |
| NX-022 | Veteran / representative | Veteran home leads with "IME Single - Wrist - 10/2026, opened 10/19/2026". The internal id is not the only label. Context: Veteran Portal muskan aaa Veteran · User 50 Logout Dashboard Case Records Notes Appointments Bill |
| NX-026 | Admin / intake / billing | Admin case types set duration, included contentions, and an extra price. A two-contention case is labeled Multiple instead of becoming a second case. |
| NX-028 | All address forms | The location address form uses a state list rather than free typing. Nothing was saved. |
| NX-031 | Staff / account creation | A second provider with the same email is refused. Using that email for a veteran asks before it is saved. Nothing was saved. |
| NX-032 | Staff / intake | Staff can see case work without that screen granting portal access. |
| NX-033 | Veteran / representative | This veteran has no representative controls on the profile or case page. |
| NX-034 | Staff / records reviewer | Staff created NXL-2026-0318 for muskan aaa. The veteran uploaded records and marked them complete. Staff accepted a file, rejected one, sent the packet back, then marked needs further review. The veteran saw each reason. |
| NX-035 | Staff / records reviewer | Notifications include a records notice for NXL-2026-0314, and View notification opens that case. |
| NX-037 | Veteran / staff billing | Staff invoice detail includes a download. Veteran billing says: Veteran Portal muskan aaa Veteran · User 50 Logout Dashboard Case Records Notes Appointments Billing Reports Profile Billing IME Single - Wrist - 10/2026, o |
| NX-038 | Staff / veteran billing | Billing keeps a client-reported payment state separate from a staff paid or verified state. No card field was shown. |
| NX-039 | Veteran / staff billing | The headed run passed. After the veteran sent the corrected reference and what changed, staff refreshed Billing, opened the remainder invoice, and the history showed both. The remainder was then marked paid. |
| NX-040 | Admin / billing | Admin can upload a template, keep earlier versions, mark one Current, and download the file. |
| NX-041 | All appointment portals | October shows Arizona (UTC-7) and Pacific Time (UTC-7). The January range still shows a regional name plus UTC offset. |
| NX-042 | Staff / provider calendar | Appointment detail includes a zone or visit type. Sample: Staff Portal Jordan Ellis Admin · Super Admin 49 Logout Dashboard Cases Veterans Providers Provider Pay Appointments Billing QA Reviews Tasks Announcements Templa |
| NX-043 | Staff / scheduler | Scheduler can open cases for booking and is blocked from QA Reviews and the activity log. Case text started: Staff Portal SCHEDULAR acc Scheduler · User 50 Logout Dashboard Cases Veterans Providers Appointments Referral  |
| NX-044 | Staff / provider appointments | Appointment detail keeps muskan aaa with case NXL-2026-0287. |
| NX-045 | Provider / calendar / notifications | Appointment "muskan aaa 10:00 AM – 11:15 AM ET P1 LOC Cancelled" opened case link Open case at https://providers.nexletta.com/provider/cases/198. |
| NX-046 | Provider / case | Demographics on the assigned case shows the veteran name and contact or identity details. |
| NX-047 | Provider / case notes | Veteran notes open on the assigned case. NXL-2026-0245 is not in this provider's case list. |
| NX-052 | Provider / evaluation | The evaluation identifies required fields. Submit was not left as a completed clinical sign-off. |
| NX-053 | Provider / evaluation | A submitted evaluation explains that it is locked or waiting, and it was not edited. |
| NX-055 | Admin / evaluations | Admin can open the evaluation area, and Submit is not an enabled provider sign-off. |
| NX-056 | Staff / provider evaluations | Provider evaluations do not show a PDF export. This case did not show a staff PDF export, which is correct if the form is not submitted. |
| NX-057 | Admin / evaluations | The opened case evaluation has no delete or remove-form action. |
| NX-060 | Provider / records / evaluation | Records and the evaluation are separate tabs on the same case, so the case stays open. |
| NX-061 | Veteran / representative / staff | Reports page: Veteran Portal muskan aaa Veteran · User 50 Logout Dashboard Case Records Notes Appointments Billing Reports Profile Reports Final reports are available after quality review is complete. FILTER BY CASE IME  |
| NX-062 | Veteran / representative | Veteran reset: Reset your password · Veteran Portal Reset code * Sent to nobody-nx-check@example.com for the Veteran Portal. Expires in about 10 minutes. Stay on this host — a code from another portal will not verify her |
| NX-063 | Veteran / representative | Profile shows contact details and an edit or correction path. Sample: Veteran Portal muskan aaa Veteran · User Logout Dashboard Case Records Notes Appointments Billing Reports Profile MA muskan aaa acc37618@gmail.com Vet |
| NX-064 | Veteran / staff billing | Veteran billing: Veteran Portal muskan aaa Veteran · User 50 Logout Dashboard Case Records Notes Appointments Billing Reports Profile Billing IME Single - Wrist - 10/2026, opened 10/19/2026 — Review invoices. Submitting  |
| NX-065 | Representative / veteran / staff billing | Organization invoices INV-2026-0604, INV-2026-0599, INV-2026-0597 are not on the veteran billing page. |
| NX-066 | Staff / organization billing | Referral organizations show a billing mode. Standard is in use, and the edit view was opened without saving. |
| NX-069 | Provider | Provider forgot-password stayed generic: Reset your password · Provider Portal Reset code * Sent to nobody-nx-check@example.com for the Provider Portal. Expires in about 10 minutes. Stay on this host — a code from anothe |
| NX-070 | Provider | Provider profile: Provider Portal Muskan prov Provider · User 48 Logout Dashboard Cases Evaluations Appointments Tasks My Earnings Announcements Profile MP Muskan prov MD alikhanhere2905@gmail.com Provider Sign out Perso |
| NX-071 | Staff / intake | Case shows the exact contention labels. Sample: Contentions: Wrist, Right Knee Overview Demographi. Nothing was saved. |
| NX-073 | Staff / Admin | Admin activity log shows actor, time, action, and old/new columns, including a real change. Scheduler cannot open the log. |

## Not fixed (2)

| ID | Area | Result |
| --- | --- | --- |
| NX-030 | Staff / account creation | A new staff-user script is saved. It was not run. The last run still ended because the temp inbox did not receive a password. |
| STATE-MATCH veteran, provider, and clinic states must all match | Staff / scheduling | SmokeError: [application] Veteran is CA while clinic and provider stay TX. The form says Eligible. Panel: Book appointment Provider Muskan prov ​ Location P1 LOC · In-person ​ Mon 09:00–17:00, Tue 09:00–17:00, Wed 09:00– |

## Not fully verified (2)

| ID | Area | Result |
| --- | --- | --- |
| NX-049 | Provider / tasks | Provider reopened TSK-184 after refresh with status In Progress. Staff task details showed Status In Progress and the comment HELLO 791702 from Muskan Prov. The script stopped because it did not read that staff status te |
| ZONE-PORTAL veteran and provider times follow their own timezone | Veteran / provider appointments | SmokeError: [test-data] The veteran calendar has no visit time to compare with the profile timezone. |
