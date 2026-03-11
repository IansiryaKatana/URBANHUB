# GTM & Google Analytics Conversion Tracking

This document describes the **dataLayer events** the website pushes and how to configure **Google Tag Manager (GTM)** and **Google Analytics 4 (GA4)** to track conversions and attribute them to the right pages.

---

## 0. Where GTM/GA IDs come from (important)

- **The site does not use hardcoded or env IDs.** All IDs are read from the database table **`website_analytics_settings`**, which you edit in **Admin → Analytics** (Google Analytics & GTM card).
- **Which script loads:**
  - If **Google Tag Manager ID** is set (e.g. `GTM-P7BR3CH2`): **only the GTM snippet** is injected. No direct gtag/GA script is loaded. So **the correct container is the one you enter in Admin.** GA4 must be configured **inside GTM** (GA4 Configuration tag with your Measurement ID).
  - If **only** Google Analytics ID is set (and GTM is empty): the **gtag.js** script is loaded for that GA4 property.
- **Make sure the container is right:** In Admin → Analytics, the **Google Tag Manager ID** must be exactly the container you use in [tagmanager.google.com](https://tagmanager.google.com) (e.g. `GTM-P7BR3CH2`). If you use a different container for this site, put that container ID in Admin and save. "Inject scripts on website" must be **ON**.

---

## 1. DataLayer event catalog

All events are pushed to `window.dataLayer` with a consistent shape. Use these **event names** in GTM as **Custom Event** triggers.

| Event name        | When it fires | Main parameters | Use for |
|------------------|----------------|------------------|--------|
| `page_view`      | Every route change (SPA) | `page_path` | GA4 page_view (SPA), which pages get traffic |
| `lead_form_open` | User opens “Get a callback” or “Book a viewing” dialog | `form_type`, `cta_source`, `page_path` | Funnel: form opened from nav vs landing vs studios |
| `form_submit`    | User submits a form (callback, viewing, contact, short_term) | `form_type`, `page_path` | **Conversion** – which page converted |
| `cta_click`      | Nav “Get a callback”, “Book viewing”, hero CTAs, short-term CTAs, etc. | `element_id`, `page_path`, `event_label` | Which CTA was clicked and on which page |
| `menu_open`      | Mobile/open menu opened | `page_path` | Engagement |
| `logo_click`     | Logo clicked | `page_path` | Navigation |
| `back_to_top`    | Floating “Back to top” clicked | `element_id` = e.g. `float-back-to-top-home` | **Per-page** – which page drove the click |
| `vr_click`       | Floating VR link clicked | `element_id` = e.g. `float-vr-studios` | **Per-page** |
| `whatsapp_click` | Floating WhatsApp clicked | `element_id` = e.g. `float-whatsapp-contact` | **Per-page** conversion |
| `form_submit`     | Form submit (same as above; also from Supabase-tracked buttons) | `form_type`, `page_path` | Conversion |
| `newsletter_signup` | Newsletter subscribe | `page_path` | Conversion |
| `book_now_click`  | Landing “Book now” (grade card) | `element_id` = `landing-grade-book-now` | Conversion from landing |
| `shortterm_*`    | Short-term page CTAs | `page_path` | Conversion |

---

## 2. Parameter reference

Parameters pushed with events (use these in GTM as **Data Layer Variables** and pass to GA4 as **Event parameters**):

| Parameter      | Type   | Description |
|----------------|--------|-------------|
| `page_path`    | string | Path where the action happened (e.g. `/`, `/studios`, `/landing/xyz`). **Use for “which page converted”.** |
| `form_type`    | string | `callback` \| `viewing` \| `contact` \| `short_term` \| etc. |
| `cta_source`   | string | Where the lead form was opened: `nav` \| `landing_hero` \| `studios_hero` \| `inline` |
| `element_id`   | string | `data-analytics` value (e.g. `float-whatsapp-home`, `nav-callback`, `studios-hero-viewing`). **Floating buttons use page-specific IDs.** |
| `event_action` | string | Same as event name in many cases. |
| `event_label`  | string | Human-readable label (e.g. form type or button id). |
| `event_category`| string | Category from DB (e.g. `conversion`, `navigation`, `contact`). |
| `tag_name`      | string | Internal tag name from `website_analytics_tags`. |

---

## 3. Floating buttons: page-specific IDs

Floating buttons (back to top, VR, WhatsApp) use **different `data-analytics` values per page** so you can see which page drove the click:

- **Pattern:** `float-{action}-{pageSlug}`
- **Examples:**
  - Home: `float-whatsapp-home`, `float-vr-home`, `float-back-to-top-home`
  - Studios: `float-whatsapp-studios`, `float-vr-studios`, …
  - Contact: `float-whatsapp-contact`, …
  - Landing: `float-whatsapp-landing-{slug}`, …

In GA4/GTM, use **`element_id`** (or `event_label`) to segment by page (e.g. “WhatsApp clicks from home” vs “from studios”).

---

## 4. Book a viewing / Get a callback from nav

- **Click (nav):** Already tracked as `cta_click` with `element_id` = `nav-callback` or `nav-book-viewing` and current `page_path`.
- **Form opened:** When the dialog opens, we push `lead_form_open` with:
  - `form_type`: `callback` or `viewing`
  - `cta_source`: `nav` when opened from Navigation; `landing_hero` from landing hero; `studios_hero` from Studios hero.
  - `page_path`: page where the user was when they opened the form.
- **Form submitted:** `form_submit` with `form_type` and `page_path`.

So you can measure:
- Nav CTA click → lead_form_open (source = nav) → form_submit, and which `page_path` each step happened on.

---

## 5. GTM naming convention (use these exact names)

**Container:** Use `GTM-P7BR3CH2` (set in Admin → Analytics).

| Prefix | Use for | Example |
|--------|--------|--------|
| **DLV -** | Data Layer Variable (one-time) | `DLV - page_path` |
| **EV -** | Trigger = Custom Event | `EV - page_view` |
| **GA4 -** | GA4 Event tag (short, clear) | `GA4 - Page View (SPA)` |

**GA4 Configuration tag (create first, fire on All Pages):**  
Name: `GA4 Config` — Type: Google Analytics: GA4 Configuration — Measurement ID: `G-ZWBWT1PJQL`.

---

### 5a. All names in priority order (copy-paste)

**Variables (Variables → New → Data Layer Variable)**

| GTM name | Data Layer Variable Name |
|----------|---------------------------|
| DLV - page_path | page_path |
| DLV - form_type | form_type |
| DLV - cta_source | cta_source |
| DLV - element_id | element_id |
| DLV - event_category | event_category |
| DLV - event_action | event_action |
| DLV - event_label | event_label |

**Triggers (Triggers → New → Custom Event)**

| GTM name | Event name (exact) |
|----------|--------------------|
| EV - page_view | page_view |
| EV - form_submit | form_submit |
| EV - whatsapp_click | whatsapp_click |
| EV - book_now_click | book_now_click |
| EV - lead_form_open | lead_form_open |

**Tags (Tags → New → GA4 Event)**

| GTM name | Event Name | Parameters | Trigger |
|----------|------------|------------|---------|
| GA4 - Page View (SPA) | page_view | page_path → {{DLV - page_path}} | EV - page_view |
| GA4 - Form Submit | form_submit | page_path, form_type | EV - form_submit |
| GA4 - WhatsApp Click | whatsapp_click | page_path, element_id | EV - whatsapp_click |
| GA4 - Book Now Click | book_now_click | page_path, element_id | EV - book_now_click |
| GA4 - Lead Form Open | lead_form_open | page_path, form_type, cta_source | EV - lead_form_open |

---

## 6. GTM setup (summary)

**When the site loads GTM**, GA4 does **not** load from the site directly. Add a **GA4 Configuration** tag in your GTM container with your Measurement ID (e.g. `G-ZWBWT1PJQL`), firing on **All Pages**, so page views and events are sent to GA4.

1. **Data Layer Variables**  
   Create variables for: `page_path`, `form_type`, `cta_source`, `element_id`, `event_category`, `event_action`, `event_label` (Data Layer Variable, set the data layer variable name to the parameter name). Use names from table 5a above.

2. **Triggers**  
   - **Custom Event** triggers for each event name (e.g. `EV - page_view` with event name `page_view`). Use names from table 5a.

3. **GA4 Event tags**  
   - Create a GA4 tag per event using names and parameters from table 5a. Fire on the corresponding trigger.

4. **SPA page views**  
   - Trigger: Custom Event, Event name = `page_view`.
   - GA4 tag: Event name = `page_view`, parameter `page_location` = `https://yoursite.com{{page_path}}` (or build from `page_path`). Optionally set as “non-interaction” if you don’t want it to affect engagement metrics like bounce.

5. **Conversions in GA4**  
   - In GA4: Admin → Events → mark `form_submit` (and optionally `lead_form_open`, `whatsapp_click`, `book_now_click`) as **Conversion**.

---

## 7. Database: tracked elements (website_analytics_tags)

The app also records the same clicks to **Supabase** (`website_analytics_events`) for the in-app Analytics dashboard. The **element_selector** in `website_analytics_tags` matches buttons; **element_id** stored in events is taken from `data-analytics` (or `id`) so floating buttons get page-specific IDs.

After migration `025_analytics_gtm_floating_and_landing.sql`:

- Back to top: `[data-analytics^="float-back-to-top-"]`
- VR: `[data-analytics^="float-vr-"]`
- WhatsApp: `[data-analytics^="float-whatsapp-"]`
- Landing “Book now”: `[data-analytics="landing-grade-book-now"]`

---

## 8. Naming alignment

- **Tags in DB:** e.g. “Get a Callback”, “Book Viewing”, “WhatsApp” – used for internal dashboard and selector matching.
- **GTM:** Use **event names** (e.g. `cta_click`, `form_submit`, `lead_form_open`) and **parameters** (`page_path`, `form_type`, `cta_source`, `element_id`) for triggers and GA4.
- **GA4:** Same event names; add parameters as Event parameters for reporting and conversion breakdown by page/source.

This keeps “which page is converting” clear in GA4 (by `page_path` and, for floating buttons, `element_id`), and keeps nav vs landing vs studios form opens clear via `cta_source` and `lead_form_open`.
