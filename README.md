# InventoryIQ – Smart Inventory. Smarter Business.

A modern, commercial-grade Inventory Management SaaS platform designed for shopkeepers, business owners, retail managers, and employees to oversee products, stock levels, sales transactions, purchase orders, suppliers, customers, and business analytics from one centralized dashboard.

Inspired by premium black-and-gold enterprise dashboard aesthetics (#090909, #151515, #1B1B1B, #F5B942).

---

## ⚡ Quick Start (React + Vite)

To launch the modern **React.js + Vite** platform:

```bash
# In the project root:
npm run dev
```

Or run directly from inside `react-frontend`:
```bash
cd react-frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

To create a production build:
```bash
npm run build
```

---

## 📁 Repository Structure

```
project/
├── package.json                 # Root script runner for React + Vite
├── README.md                    # Project documentation & run guide
│
├── react-frontend/              # React 18 + Vite Commercial SaaS Architecture
│   ├── index.html               # HTML entry point with Inter & Poppins fonts
│   ├── vite.config.js           # Vite configuration with @vitejs/plugin-react
│   ├── package.json             # React, Lucide, Chart.js, react-chartjs-2 dependencies
│   ├── public/                  # Static assets & SVG vector illustrations
│   └── src/
│       ├── main.jsx             # React DOM root entry point
│       ├── App.jsx              # Main routing & layout controller
│       ├── index.css            # Unified Black & Gold design tokens & animations
│       │
│       ├── context/
│       │   └── InventoryContext.jsx # Central state management, CRUD, auto-stocking,
│       │                            # localStorage persistence & toasts
│       │
│       ├── data/
│       │   └── seedData.js      # Seed data matching Stockly design reference
│       │
│       ├── components/
│       │   ├── Sidebar.jsx      # Collapsible sidebar, mobile drawer & active indicators
│       │   ├── Topbar.jsx       # Ctrl+K search trigger, notifications & profile capsule
│       │   ├── GlobalSearchModal.jsx # Multi-entity search across items, sales & contacts
│       │   ├── InvoiceModal.jsx # Printable tax invoice modal (window.print() ready)
│       │   ├── ConfirmModal.jsx # Reusable modal confirmation dialogs
│       │   └── ToastContainer.jsx # Floating toast notification stack
│       │
│       └── pages/
│           ├── DashboardPage.jsx  # KPI stat cards, Chart.js spline, recent activities
│           ├── InventoryPage.jsx  # Product catalog, 6 retail categories, CRUD, CSV export
│           ├── SalesPage.jsx      # Point of Sale builder, live GST math, invoice generator
│           ├── PurchasesPage.jsx  # Supplier PO builder, auto-restocking upon receipt
│           ├── AnalyticsPage.jsx  # Revenue spline, category donut, valuation metrics
│           ├── SuppliersPage.jsx  # Supplier contact cards, CRUD, phone/email directory
│           ├── CustomersPage.jsx  # Customer CRM, order spending, profiles
│           ├── SettingsPage.jsx   # Profile settings, appearance, JSON backups, demo reset
│           ├── ProfilePage.jsx    # User role privileges, security credentials
│           ├── SecurityPage.jsx   # Active sessions revoke, 2FA toggle, audit log trail
│           │
│           └── Auth/
│               ├── LoginPage.jsx          # Split-screen 3D isometric login
│               ├── RegisterPage.jsx       # Account creation with strength meter
│               ├── ForgotPasswordPage.jsx # Password recovery workflow
│               └── ResetPasswordPage.jsx  # Password update form
│
└── frontend/                    # Vanilla HTML5 / CSS3 / Vanilla JS ES6+ Edition
    ├── index.html               # Vanilla gateway
    ├── *.html                   # 14 standalone HTML pages
    ├── assets/css/              # Modular vanilla CSS sheets
    └── js/                      # Modular vanilla JavaScript controllers
```

---

## 🎨 Design System & Color Palette

| Token | Color Hex / Value | Description |
| :--- | :--- | :--- |
| **Main Background** | `#090909` | Deep obsidian base |
| **Secondary Background** | `#151515` | Section & inner canvas background |
| **Card Background** | `#1B1B1B` | Container & widget background |
| **Hover Background** | `#242424` | Table rows & list item hover |
| **Primary Accent** | `#F5B942` | Royal Gold primary accent |
| **Accent Hover** | `#E5A92E` | Deep Gold button hover |
| **Primary Text** | `#FFFFFF` | Crisp white typography |
| **Secondary Text** | `#A1A1AA` | Light slate typography |
| **Borders** | `#353535` | Sleek border dividers |
| **Border Gold Glow** | `rgba(245, 185, 66, 0.35)` | Subtle golden accents & card borders |
| **Success** | `#22C55E` | In-Stock / Completed status |
| **Warning** | `#F5B942` | Low-Stock / Pending status |
| **Danger** | `#EF4444` | Out of Stock / Cancelled status |

---

## 🛠️ Complete SaaS Feature Suite

1. **Dashboard Overview**:
   - 4 Top Metric Cards (Total Products: `2,480`, Total Sales: `₹1,25,680`, Total Purchases: `₹98,420`, Estimated Profit: `₹27,260`).
   - Chart.js spline chart with golden glowing area fill and `7D` / `30D` / `1Y` timeline toggles.
   - Recent Activities timeline and Top-Selling Products table.
2. **Inventory Management**:
   - 6 Retail Categories: *Hardware / General Items, Fasteners / Accessories, Electrical Items, Stationery / Paper, Puja, General / Herbal*.
   - Live search by product name and SKU.
   - Low-stock warning banner with 1-click filter button.
   - Full Add, Edit, Delete and Detailed View modals.
   - Stock status indicators (`In Stock`, `Low Stock`, `Out of Stock`).
   - Reorder level tracking and CSV report export.
3. **Sales & Point of Sale (POS)**:
   - Create New Sale modal with dynamic line items and available stock validation.
   - Customer picker (Existing CRM customer or Walk-in customer).
   - Live tax (GST 0%, 5%, 12%, 18%) and discount calculations.
   - Automatically deducts physical inventory when sales are confirmed.
   - Generates a tax invoice with print stylesheet (`window.print()`).
4. **Purchase Management**:
   - Create Purchase Orders linked to verified suppliers.
   - Real-time PO status: `Pending` or `Completed`.
   - Marking a PO as received automatically restocks and updates item inventory counts.
5. **Analytics & Financial Reports**:
   - Gross Revenue Trend spline.
   - "Sales by Category" donut chart (Hardware 35%, Electrical 30%, Stationery 20%, Others 15%).
   - Sales vs Purchases comparison bar chart.
   - Live inventory cost valuation vs retail valuation with projected gross margin calculations.
6. **Supplier & Customer CRM**:
   - Supplier cards with brand initials avatar, email, phone, address, and purchase records.
   - Customer profiles with total spending, order counts, and contact records.
7. **Security Center & Audit Trail**:
   - Active device sessions with 1-click session revocation.
   - Two-Factor Authentication (2FA) switch.
   - Live audit trail logging logins, stock adjustments, price updates, and transactions.
8. **Settings & Data Preservation**:
   - Profile preferences and appearance preview.
   - Full JSON snapshot download to back up client-side data.
   - Restore demo database button to reset to initial pristine seed data.
9. **Global Search Modal (`Ctrl+K`)**:
   - Instant live keyboard search indexing items, customers, suppliers, and sales orders.
