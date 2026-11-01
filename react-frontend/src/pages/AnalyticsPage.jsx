import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const AnalyticsPage = () => {
  const { stats, products, exportCSV } = useInventory();
  const [timeFilter, setTimeFilter] = useState('30D');

  // Total Inventory Valuation (Cost & Retail)
  const totalCostValuation = products.reduce((acc, p) => acc + (p.stock * (p.costPrice || 0)), 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const projectedGrossMargin = totalRetailValuation - totalCostValuation;

  // 1. Revenue Spline Data
  const splineData = {
    labels: ['Oct 1', 'Oct 6', 'Oct 11', 'Oct 16', 'Oct 21', 'Oct 26', 'Oct 30'],
    datasets: [
      {
        label: 'Revenue Trend',
        data: [28000, 49000, 36000, 68000, 45000, 92000, 84000],
        borderColor: '#F5B942',
        borderWidth: 3,
        pointBackgroundColor: '#F5B942',
        tension: 0.42,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(245, 185, 66, 0.35)');
          gradient.addColorStop(0.5, 'rgba(245, 185, 66, 0.10)');
          gradient.addColorStop(1, 'rgba(245, 185, 66, 0.00)');
          return gradient;
        }
      }
    ]
  };

  // 2. Sales by Category Doughnut Data (matching reference screenshot)
  const doughnutData = {
    labels: ['Hardware', 'Electrical', 'Stationery', 'Puja & Herbal'],
    datasets: [
      {
        data: [35, 30, 20, 15],
        backgroundColor: ['#F5B942', '#E5A92E', '#3B82F6', '#22C55E'],
        borderColor: '#1B1B1B',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  // 3. Comparison Bar Chart (Sales vs Purchases)
  const barData = {
    labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        label: 'Sales Revenue',
        data: [85000, 98000, 110000, 105000, 125680],
        backgroundColor: '#F5B942',
        borderRadius: 6
      },
      {
        label: 'Purchases Cost',
        data: [62000, 71000, 82000, 79000, 98420],
        backgroundColor: '#353535',
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1B1B1B',
        titleColor: '#F5B942',
        bodyColor: '#FFFFFF',
        borderColor: '#353535',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#A1A1AA' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#A1A1AA' } }
    }
  };

  const handleExportAnalytics = () => {
    const headers = ['Metric', 'Current Value', 'Growth Rate'];
    const rows = [
      ['Total Sales Revenue', `₹${stats.totalSales}`, stats.trends.sales],
      ['Total Purchase Cost', `₹${stats.totalPurchases}`, stats.trends.purchases],
      ['Net Profit', `₹${stats.profit}`, stats.trends.profit],
      ['Inventory Retail Valuation', `₹${totalRetailValuation}`, '-'],
      ['Inventory Cost Valuation', `₹${totalCostValuation}`, '-'],
      ['Projected Gross Margin', `₹${projectedGrossMargin}`, '34.2%']
    ];
    exportCSV('InventoryIQ_Analytics_Report', rows, headers);
  };

  return (
    <div className="analytics-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Analytics & Growth</h2>
          <p className="page-subtitle text-secondary mb-0">Insights and detailed financial reports</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group btn-group-sm bg-dark p-1 rounded-pill border border-secondary">
            {['7D', '30D', '1Y'].map(tab => (
              <button
                key={tab}
                type="button"
                className={`btn rounded-pill px-3 ${timeFilter === tab ? 'btn-gold' : 'btn-link text-secondary text-decoration-none'}`}
                onClick={() => setTimeFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExportAnalytics}
          >
            <i className="bi bi-file-earmark-spreadsheet text-gold"></i>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Top 3 High-Impact Cards (matching reference design) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="stat-card">
            <span className="stat-label">Total Revenue</span>
            <div className="stat-value text-white mt-1">₹{stats.totalSales.toLocaleString('en-IN')}</div>
            <div className="d-flex align-items-center gap-2 mt-2">
              <span className="trend-badge trend-up">
                <i className="bi bi-arrow-up-right me-1"></i> +18%
              </span>
              <span className="stat-subtext">mom growth</span>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="stat-card">
            <span className="stat-label">Total Profit</span>
            <div className="stat-value text-gold mt-1">₹{stats.profit.toLocaleString('en-IN')}</div>
            <div className="d-flex align-items-center gap-2 mt-2">
              <span className="trend-badge trend-up">
                <i className="bi bi-arrow-up-right me-1"></i> +20%
              </span>
              <span className="stat-subtext">net margin</span>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="d-flex align-items-center justify-content-between">
              <span className="stat-label">Top Product</span>
              <i className="bi bi-trophy-fill text-gold fs-5"></i>
            </div>
            <div className="stat-value text-white mt-1" style={{ fontSize: '1.4rem' }}>Screw Pack</div>
            <div className="d-flex align-items-center gap-2 mt-2">
              <span className="trend-badge trend-up">
                <i className="bi bi-arrow-up-right me-1"></i> +51%
              </span>
              <span className="stat-subtext">turnover velocity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="row g-4 mb-4">
        {/* Spline Trend */}
        <div className="col-12 col-lg-7">
          <div className="card-custom h-100 p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="card-title text-white fw-bold mb-0">Revenue Trend</h5>
                <small className="text-secondary">Rolling gross sales performance</small>
              </div>
              <span className="badge badge-gold">Active</span>
            </div>
            <div style={{ height: 260 }}>
              <Line data={splineData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Category Donut */}
        <div className="col-12 col-lg-5">
          <div className="card-custom h-100 p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="card-title text-white fw-bold mb-0">Sales by Category</h5>
                <small className="text-secondary">Percentage distribution</small>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ height: 200 }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '72%',
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
            <div className="row g-2 mt-3 text-center small">
              <div className="col-6">
                <span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: '#F5B942' }}></span>
                <span className="text-secondary">Hardware <strong>35%</strong></span>
              </div>
              <div className="col-6">
                <span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: '#E5A92E' }}></span>
                <span className="text-secondary">Electrical <strong>30%</strong></span>
              </div>
              <div className="col-6">
                <span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: '#3B82F6' }}></span>
                <span className="text-secondary">Stationery <strong>20%</strong></span>
              </div>
              <div className="col-6">
                <span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: '#22C55E' }}></span>
                <span className="text-secondary">Others <strong>15%</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison & Valuation Row */}
      <div className="row g-4 mb-4">
        {/* Sales vs Purchases Bar Chart */}
        <div className="col-12 col-lg-7">
          <div className="card-custom p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="card-title text-white fw-bold mb-0">Sales vs Purchases</h5>
                <small className="text-secondary">Monthly cash flow and inventory investments</small>
              </div>
              <div className="d-flex align-items-center gap-3 small">
                <span className="d-flex align-items-center gap-1 text-gold">
                  <span className="rounded-circle" style={{ width: 8, height: 8, background: '#F5B942' }}></span> Sales
                </span>
                <span className="d-flex align-items-center gap-1 text-secondary">
                  <span className="rounded-circle" style={{ width: 8, height: 8, background: '#353535' }}></span> Purchases
                </span>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <Bar data={barData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Valuation Summary Card */}
        <div className="col-12 col-lg-5">
          <div className="card-custom p-4">
            <h5 className="card-title text-white fw-bold mb-1">Inventory Valuation</h5>
            <small className="text-secondary d-block mb-3">Live balance of physical assets</small>

            <div className="p-3 bg-secondary-dark rounded mb-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small d-block">Cost Valuation (At Purchase)</span>
                <span className="fw-bold text-white fs-5">₹{totalCostValuation.toLocaleString('en-IN')}</span>
              </div>
              <i className="bi bi-shield-lock text-gold fs-4"></i>
            </div>

            <div className="p-3 bg-secondary-dark rounded mb-2 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small d-block">Retail Valuation (Potential Sales)</span>
                <span className="fw-bold text-gold fs-5">₹{totalRetailValuation.toLocaleString('en-IN')}</span>
              </div>
              <i className="bi bi-tag text-gold fs-4"></i>
            </div>

            <div className="p-3 bg-secondary-dark rounded d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small d-block">Projected Gross Margin</span>
                <span className="fw-bold text-success fs-5">₹{projectedGrossMargin.toLocaleString('en-IN')}</span>
              </div>
              <span className="badge badge-success">+34.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

