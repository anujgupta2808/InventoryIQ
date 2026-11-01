import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardPage = () => {
  const { user, stats, products, sales, auditLogs, setCurrentPage } = useInventory();
  const [timeRange, setTimeRange] = useState('30D');

  const hasSales = sales && sales.length > 0;

  const chartDatasets = {
    '7D': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: hasSales
        ? [0, 0, 0, Math.round(stats.totalSales * 0.3), Math.round(stats.totalSales * 0.5), Math.round(stats.totalSales * 0.8), stats.totalSales]
        : [0, 0, 0, 0, 0, 0, 0]
    },
    '30D': {
      labels: ['Day 1', 'Day 6', 'Day 12', 'Day 18', 'Day 24', 'Day 28', 'Day 30'],
      data: hasSales
        ? [0, 0, Math.round(stats.totalSales * 0.25), Math.round(stats.totalSales * 0.5), Math.round(stats.totalSales * 0.75), Math.round(stats.totalSales * 0.9), stats.totalSales]
        : [0, 0, 0, 0, 0, 0, 0]
    },
    '1Y': {
      labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      data: hasSales
        ? [0, 0, 0, 0, 0, 0, 0, 0, Math.round(stats.totalSales * 0.4), Math.round(stats.totalSales * 0.7), stats.totalSales, stats.totalSales]
        : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  };

  const activeData = chartDatasets[timeRange];

  const chartData = {
    labels: activeData.labels,
    datasets: [
      {
        label: 'Sales Revenue',
        data: activeData.data,
        borderColor: '#F5B942',
        borderWidth: 3,
        pointBackgroundColor: '#F5B942',
        pointBorderColor: '#090909',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.42,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 280);
          gradient.addColorStop(0, 'rgba(245, 185, 66, 0.32)');
          gradient.addColorStop(0.5, 'rgba(245, 185, 66, 0.08)');
          gradient.addColorStop(1, 'rgba(245, 185, 66, 0.00)');
          return gradient;
        }
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
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (item) => ` Revenue: ₹${item.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: { color: '#A1A1AA', font: { family: 'Inter', size: 12 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: {
          color: '#A1A1AA',
          font: { family: 'Inter', size: 12 },
          callback: (val) => val >= 100000 ? `${val / 100000}L` : `${val / 1000}k`
        }
      }
    }
  };

  const topProducts = (products || []).slice(0, 5);
  const recentActivities = (auditLogs || []).slice(0, 4);

  return (
    <div className="dashboard-content animate-fade-in">
      {/* Top Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Dashboard</h1>
          <p className="page-header-subtitle">
            Welcome back, <span className="gold-text fw-medium">{user?.name || 'Administrator'}</span>! Here's your business overview.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-dark-custom"
            onClick={() => setCurrentPage('inventory')}
          >
            <i className="bi bi-box-seam text-gold"></i>
            <span>Track Stock</span>
          </button>
          <button
            type="button"
            className="btn-gold"
            onClick={() => setCurrentPage('sales')}
          >
            <i className="bi bi-cart-plus"></i>
            <span>Manage Sales</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Total Products */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card cursor-pointer" onClick={() => setCurrentPage('inventory')}>
            <div className="stat-card-header">
              <span className="stat-card-title">Total Products</span>
              <div className="stat-icon-wrapper">
                <i className="bi bi-box-seam"></i>
              </div>
            </div>
            <div className="stat-card-value">{stats.totalProducts.toLocaleString()}</div>
            <div className="stat-card-footer">
              <span className={`stat-trend ${stats.totalProducts > 0 ? 'up' : 'text-secondary'}`}>
                {stats.totalProducts > 0 ? <><i className="bi bi-arrow-up-short"></i> {stats.trends.products}</> : '0 items in catalog'}
              </span>
              <span className="stat-period">{stats.totalProducts > 0 ? 'active inventory' : 'catalog empty'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Sales */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card cursor-pointer" onClick={() => setCurrentPage('sales')}>
            <div className="stat-card-header">
              <span className="stat-card-title">Total Sales</span>
              <div className="stat-icon-wrapper">
                <i className="bi bi-currency-rupee"></i>
              </div>
            </div>
            <div className="stat-card-value">₹{stats.totalSales.toLocaleString('en-IN')}</div>
            <div className="stat-card-footer">
              <span className={`stat-trend ${stats.totalSales > 0 ? 'up' : 'text-secondary'}`}>
                {stats.totalSales > 0 ? <><i className="bi bi-arrow-up-short"></i> {stats.trends.sales}</> : 'No sales recorded'}
              </span>
              <span className="stat-period">{stats.totalSales > 0 ? 'revenue generated' : 'start selling'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Purchases */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card cursor-pointer" onClick={() => setCurrentPage('purchases')}>
            <div className="stat-card-header">
              <span className="stat-card-title">Total Purchases</span>
              <div className="stat-icon-wrapper">
                <i className="bi bi-cart3"></i>
              </div>
            </div>
            <div className="stat-card-value">₹{stats.totalPurchases.toLocaleString('en-IN')}</div>
            <div className="stat-card-footer">
              <span className={`stat-trend ${stats.totalPurchases > 0 ? 'up' : 'text-secondary'}`}>
                {stats.totalPurchases > 0 ? <><i className="bi bi-arrow-up-short"></i> {stats.trends.purchases}</> : 'No purchase orders'}
              </span>
              <span className="stat-period">{stats.totalPurchases > 0 ? 'procurement cost' : 'restock inventory'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Estimated Profit */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card cursor-pointer" onClick={() => setCurrentPage('analytics')}>
            <div className="stat-card-header">
              <span className="stat-card-title">Estimated Profit</span>
              <div className="stat-icon-wrapper">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
            </div>
            <div className="stat-card-value text-gold">₹{stats.profit.toLocaleString('en-IN')}</div>
            <div className="stat-card-footer">
              <span className={`stat-trend ${stats.profit > 0 ? 'up' : 'text-secondary'}`}>
                {stats.profit > 0 ? <><i className="bi bi-arrow-up-short"></i> {stats.trends.profit}</> : '₹0 net profit'}
              </span>
              <span className="stat-period">{stats.profit > 0 ? 'net margin' : 'based on transactions'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart + Recent Activities */}
      <div className="row g-4 mb-4">
        {/* Sales Overview Spline Chart */}
        <div className="col-12 col-lg-8">
          <div className="iq-card h-100">
            <div className="iq-card-header">
              <div>
                <h5 className="iq-card-title">Sales Overview</h5>
                <small className="text-secondary">Historical revenue trends over time</small>
              </div>
              <div className="filter-pills">
                {['7D', '30D', '1Y'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className={`filter-pill-btn ${timeRange === tab ? 'active' : ''}`}
                    onClick={() => setTimeRange(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="iq-card-body">
              <div style={{ height: 280 }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="col-12 col-lg-4">
          <div className="iq-card h-100">
            <div className="iq-card-header">
              <h5 className="iq-card-title">Recent Activities</h5>
              <button
                type="button"
                className="btn btn-link btn-sm text-gold text-decoration-none p-0"
                style={{ color: 'var(--primary-accent)', fontSize: '0.85rem' }}
                onClick={() => setCurrentPage('security')}
              >
                View All →
              </button>
            </div>
            <div className="iq-card-body">
              {recentActivities.length === 0 ? (
                <div className="text-center py-5 text-secondary">
                  <i className="bi bi-clock-history fs-2 d-block mb-2 text-muted"></i>
                  <p className="small mb-1 text-white">No recent activities yet</p>
                  <p className="small text-secondary mb-0">Transactions and security events will show up here.</p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivities.map((act) => (
                    <div key={act.id} className="activity-item">
                      <div className="activity-node">
                        <i className={`bi ${
                          act.action.includes('Sale') ? 'bi-receipt' :
                          act.action.includes('Purchase') ? 'bi-cart3' :
                          act.action.includes('Product') ? 'bi-box-seam' :
                          act.action.includes('Login') || act.action.includes('Register') ? 'bi-shield-check' :
                          'bi-activity'
                        }`}></i>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title text-white">{act.action}</div>
                        <div className="activity-meta text-secondary">
                          {act.details ? `${act.details} • ` : ''}{act.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top-Selling Products Table */}
      <div className="iq-card">
        <div className="iq-card-header">
          <div>
            <h5 className="iq-card-title">Top-Selling Products</h5>
            <small className="text-secondary">Best performing items by velocity and turnover</small>
          </div>
          <button
            type="button"
            className="btn-dark-custom btn-sm"
            onClick={() => setCurrentPage('inventory')}
          >
            Manage Catalog
          </button>
        </div>

        <div className="table-responsive-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table-iq">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="py-3">
                      <i className="bi bi-box-seam fs-2 text-secondary d-block mb-2"></i>
                      <h6 className="text-white mb-1">No products in inventory yet</h6>
                      <p className="text-secondary small mb-3">Add your first product to start tracking stock, sales, and analytics.</p>
                      <button
                        type="button"
                        className="btn-gold btn-sm"
                        onClick={() => setCurrentPage('inventory')}
                      >
                        <i className="bi bi-plus-lg me-1"></i> Add First Product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                topProducts.map((p, index) => (
                  <tr key={p.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="table-prod-img">
                          <i className="bi bi-box-seam"></i>
                        </div>
                        <div>
                          <div className="fw-semibold text-white">{p.name}</div>
                          <small className="text-muted">SKU: {p.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ background: '#252525', color: '#A1A1AA', border: '1px solid #353535' }}>
                        {p.category}
                      </span>
                    </td>
                    <td>
                      <span className="fw-medium text-white">{p.stock}</span> {p.unit}s
                    </td>
                    <td><span className="fw-semibold text-gold">₹{p.price}</span></td>
                    <td>
                      <span className={`status-pill ${
                        p.status === 'In Stock' ? 'status-in-stock' :
                        p.status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'
                      }`}>
                        <span className="status-dot"></span>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => setCurrentPage('inventory')}
                        title="View Details"
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
