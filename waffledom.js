// ============================================================
// WAFFLEDOM - Frontend ↔ Backend Integration
// Base URL: http://127.0.0.1:8000/api/v1
// ============================================================

const API = 'http://127.0.0.1:8000/api/v1';

// ── Sidebar toggle ──────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const toggleBtn = document.getElementById('toggle-btn');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
  });
}

// ── Utility helpers ─────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail?.message || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    console.error(`API error [${path}]:`, e.message);
    return null;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

function fmt(n) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

function statusBadge(status) {
  const map = {
    Pending: 'badge-warning',
    Confirmed: 'badge-info',
    Preparing: 'badge-info',
    Ready: 'badge-info',
    Delivered: 'badge-success',
    Cancelled: 'badge-danger',
    'In Transit': 'badge-info',
    Failed: 'badge-danger',
    'In Progress': 'badge-info',
    Completed: 'badge-success',
    'Mobile Money': 'badge-info',
    Cash: 'badge-success',
    Card: 'badge-info',
  };
  return `<span class="badge ${map[status] || 'badge-default'}">${status}</span>`;
}

function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Page router ─────────────────────────────────────────────
const page = document.body.dataset.page;

const pages = {
  dashboard: loadDashboard,
  customers: loadCustomers,
  products: loadProducts,
  orders: loadOrders,
  suppliers: loadSuppliers,
  payments: loadPayments,
  reports: loadReports,
};

if (pages[page]) pages[page]();

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const [orders, products, lowStock, customers] = await Promise.all([
    apiFetch('/orders?limit=1000'),
    apiFetch('/products?limit=1000'),
    apiFetch('/inventory/low-stock'),
    apiFetch('/customers'),
  ]);

  if (orders) {
    const total = orders.length;
    const pending = orders.filter(o => o.order_status === 'Pending').length;
    const delivered = orders.filter(o => o.order_status === 'Delivered').length;
    const revenue = orders.reduce((s, o) => s + (o.total?.total_amount || 0), 0);

    setText('stat-orders', fmt(total));
    setText('stat-revenue', '₦' + fmt(revenue));
    setText('dash-orders-today', fmt(total));
    setText('dash-orders-progress', fmt(pending));
    setText('dash-orders-complete', fmt(delivered));
  }

  if (products) {
    setText('stat-products', fmt(products.length));
    setText('dash-products-stock', fmt(products.filter(p => p.is_active).length));
  }

  if (lowStock) {
    setText('dash-low-stock', fmt(lowStock.length));
  }

  if (customers) {
    setText('stat-customers', fmt(customers.length));
  }
}

// ============================================================
// CUSTOMERS
// ============================================================
async function loadCustomers() {
  const [orders, customers] = await Promise.all([
    apiFetch('/orders?limit=1000'),
    apiFetch('/customers'),
  ]);

  if (customers) {
    setText('stat-total-customers', fmt(customers.length));
    
    // Load Customer cards
    const grid = document.getElementById('customer-directory-grid');
    if (grid) {
      if (customers.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">No customers registered yet.</p>';
      } else {
        grid.innerHTML = customers.map(c => `
          <div class="customer-card">
            <h3>${c.first_name} ${c.last_name || ''}</h3>
            <p>Customer ID: C-${String(c.customer_id).padStart(3, '0')}</p>
            <p>Email: ${c.email || '—'}</p>
            <p>Phone: ${c.phone_number || '—'}</p>
            <p>Registered: ${c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '—'}</p>
          </div>`).join('');
      }
    }
  }

  if (orders) {
    // Recent activity table
    const tbody = document.getElementById('customer-activity-body');
    if (tbody) {
      if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No customer activity recorded yet.</td></tr>';
      } else {
        tbody.innerHTML = orders.slice(0, 20).map(o => `
          <tr>
            <td>Customer #${o.customer_id}</td>
            <td>Placed Order #${o.order_id}</td>
            <td>${new Date(o.order_date).toLocaleDateString('en-GB')}</td>
            <td>${statusBadge(o.order_status)}</td>
          </tr>`).join('');
      }
    }
  }

  // Add Customer form
  const addBtn = document.getElementById('add-customer-btn');
  const modal = document.getElementById('add-customer-modal');
  const closeModal = document.getElementById('close-customer-modal');
  const form = document.getElementById('add-customer-form');

  if (addBtn && modal) {
    addBtn.onclick = () => modal.classList.add('active');
    if (closeModal) closeModal.onclick = () => modal.classList.remove('active');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        first_name: document.getElementById('cust-first-name').value,
        last_name: document.getElementById('cust-last-name').value || null,
        phone_number: document.getElementById('cust-phone').value || null,
        email: document.getElementById('cust-email').value || null,
      };
      const res = await apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) });
      if (res) {
        showToast(`Customer ${res.first_name} added (ID: ${res.customer_id})`);
        modal.classList.remove('active');
        form.reset();
        loadCustomers();
      } else {
        showToast('Failed to add customer', 'error');
      }
    };
  }
}

// ============================================================
// PRODUCTS & INVENTORY
// ============================================================
async function loadProducts() {
  const [products, lowStock] = await Promise.all([
    apiFetch('/products?limit=1000'),
    apiFetch('/inventory/low-stock'),
  ]);

  if (products) {
    const active = products.filter(p => p.is_active);
    setText('stat-total-products', fmt(products.length));
    setText('stat-active-products', fmt(active.length));
    setText('stat-low-stock', fmt(lowStock?.length ?? '—'));
    setText('stat-out-stock', fmt(products.filter(p => !p.is_active).length));

    // Product cards
    const grid = document.getElementById('product-grid');
    if (grid) {
      if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">No products in menu.</p>';
      } else {
        grid.innerHTML = products.map(p => `
          <div class="product-card">
            <div class="product-header">
              <h3>${p.product_name}</h3>
              <span class="product-price">₦${fmt(p.unit_price)}</span>
            </div>
            <p>${p.category || 'No category'}</p>
            <div class="stock-badge ${p.is_active ? 'in-stock' : 'out-of-stock'}">
              ${p.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>`).join('');
      }
    }

    // Inventory table - fetch per product
    const tbody = document.getElementById('inventory-tbody');
    if (tbody) {
      if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No inventory status to show.</td></tr>';
      } else {
        const invRows = await Promise.all(products.slice(0, 30).map(async p => {
          const inv = await apiFetch(`/inventory/${p.product_id}`);
          const qty = inv?.stock_quantity ?? 0;
          const reorder = inv?.reorder_level ?? 10;
          let status = 'Healthy';
          if (qty === 0) status = 'Out of Stock';
          else if (qty <= reorder) status = 'Low Stock';
          return `<tr>
            <td>${p.product_name}</td>
            <td>${qty}</td>
            <td>${reorder}</td>
            <td>${statusBadge(status)}</td>
          </tr>`;
        }));
        tbody.innerHTML = invRows.join('');
      }
    }
  }

  // Add Product form
  const addBtn = document.getElementById('add-product-btn');
  const modal = document.getElementById('add-product-modal');
  const form = document.getElementById('add-product-form');
  const closeModal = document.getElementById('close-product-modal');

  if (addBtn && modal) {
    addBtn.onclick = () => modal.classList.add('active');
    if (closeModal) closeModal.onclick = () => modal.classList.remove('active');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        product_name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-category').value || null,
        unit_price: parseFloat(document.getElementById('prod-price').value),
        is_active: true,
      };
      const res = await apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
      if (res) {
        showToast(`Product "${res.product_name}" added!`);
        modal.classList.remove('active');
        form.reset();
        loadProducts();
      } else {
        showToast('Failed to add product', 'error');
      }
    };
  }
}

// ============================================================
// ORDERS
// ============================================================
async function loadOrders() {
  const orders = await apiFetch('/orders?limit=1000');
  if (!orders) return;

  const pending = orders.filter(o => o.order_status === 'Pending').length;
  const completed = orders.filter(o => o.order_status === 'Delivered').length;
  const cancelled = orders.filter(o => o.order_status === 'Cancelled').length;

  setText('stat-total-orders', fmt(orders.length));
  setText('stat-pending-orders', fmt(pending));
  setText('stat-completed-orders', fmt(completed));
  setText('stat-cancelled-orders', fmt(cancelled));

  const tbody = document.getElementById('orders-tbody');
  if (tbody) {
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>';
    } else {
      tbody.innerHTML = orders.slice(0, 50).map(o => {
        const items = o.items?.map(i => `Product #${i.product_id} x${i.quantity}`).join(', ') || '—';
        const total = o.total?.total_amount ? `₦${fmt(o.total.total_amount)}` : '—';
        const isPaid = o.order_status === 'Confirmed' || o.order_status === 'Delivered' || o.order_status === 'Cancelled';
        const payButton = isPaid ? '' : `<button onclick="openPayModal(${o.order_id}, ${o.total?.total_amount || 0})" class="primary-btn" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;">Pay</button>`;
        return `<tr>
          <td>ORD-${String(o.order_id).padStart(3,'0')}</td>
          <td>Customer #${o.customer_id}</td>
          <td>${items}</td>
          <td>${total}</td>
          <td>${statusBadge(o.order_status)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 5px;">
              <select onchange="updateOrderStatus(${o.order_id}, this.value)" class="status-select">
                ${['Pending','Confirmed','Preparing','Ready','Delivered','Cancelled']
                  .map(s => `<option ${s===o.order_status?'selected':''}>${s}</option>`).join('')}
              </select>
              ${payButton}
            </div>
          </td>
        </tr>`;
      }).join('');
    }
  }

  // Create Order Modal flow
  const addBtn = document.getElementById('add-order-btn');
  const modal = document.getElementById('add-order-modal');
  const closeModal = document.getElementById('close-order-modal');
  const form = document.getElementById('add-order-form');
  const itemsContainer = document.getElementById('order-items-container');
  const addItemBtn = document.getElementById('add-item-row-btn');

  let activeProducts = [];

  if (addBtn && modal) {
    addBtn.onclick = async () => {
      // Fetch customers and products
      const [customers, products] = await Promise.all([
        apiFetch('/customers'),
        apiFetch('/products?limit=1000')
      ]);

      if (!customers || customers.length === 0) {
        showToast('Please register a customer first!', 'error');
        return;
      }

      activeProducts = products || [];

      // Populate customer dropdown
      const custSelect = document.getElementById('order-customer-id');
      custSelect.innerHTML = '<option value="">Select Customer</option>' + 
        customers.map(c => `<option value="${c.customer_id}">${c.first_name} ${c.last_name || ''}</option>`).join('');

      // Clear and add first item row
      itemsContainer.innerHTML = '';
      addItemRow();
      
      modal.classList.add('active');
    };

    if (closeModal) closeModal.onclick = () => modal.classList.remove('active');

    if (addItemBtn) addItemBtn.onclick = () => addItemRow();

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const customerId = parseInt(document.getElementById('order-customer-id').value);
      
      const rows = itemsContainer.getElementsByClassName('order-item-row');
      const items = [];
      for (const row of rows) {
        const prodId = parseInt(row.querySelector('.order-product-select').value);
        const qty = parseInt(row.querySelector('.order-product-qty').value);
        if (prodId && qty) {
          items.push({ product_id: prodId, quantity: qty });
        }
      }

      if (items.length === 0) {
        showToast('Select at least one product', 'error');
        return;
      }

      const data = {
        customer_id: customerId,
        items: items
      };

      const res = await apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) });
      if (res) {
        showToast(`Order created successfully! (ID: ${res.order_id})`);
        modal.classList.remove('active');
        form.reset();
        loadOrders();
      } else {
        showToast('Failed to create order', 'error');
      }
    };
  }

  function addItemRow() {
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.style = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    row.innerHTML = `
      <select class="order-product-select" required style="flex: 2;">
        <option value="">Select Product</option>
        ${activeProducts.map(p => `<option value="${p.product_id}">${p.product_name} (₦${fmt(p.unit_price)})</option>`).join('')}
      </select>
      <input type="number" class="order-product-qty" placeholder="Qty" min="1" value="1" required style="flex: 1;">
      <button type="button" class="secondary-btn remove-row-btn" style="padding: 10px; margin: 0; color: #ff4d4d; border-color: #ff4d4d;">&times;</button>
    `;
    
    row.querySelector('.remove-row-btn').onclick = () => {
      row.remove();
    };

    itemsContainer.appendChild(row);
  }

  // Pay Modal flow
  const payModal = document.getElementById('pay-order-modal');
  const closePayBtn = document.getElementById('close-pay-modal');
  const payForm = document.getElementById('pay-order-form');

  if (closePayBtn) {
    closePayBtn.onclick = () => payModal.classList.remove('active');
  }

  if (payForm) {
    payForm.onsubmit = async (e) => {
      e.preventDefault();
      const orderId = parseInt(document.getElementById('pay-order-id').value);
      const amountStr = document.getElementById('pay-amount-label').textContent.replace('₦', '').replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const method = document.getElementById('pay-method').value;

      const data = {
        order_id: orderId,
        payment_amount: amount,
        payment_method: method
      };

      const res = await apiFetch('/payments', { method: 'POST', body: JSON.stringify(data) });
      if (res) {
        const confirmRes = await apiFetch(`/payments/${res.payment_id}/confirm?order_id=${orderId}`, { method: 'PATCH' });
        if (confirmRes) {
          showToast(`Payment of ₦${fmt(amount)} confirmed for Order #${orderId}!`);
          await apiFetch(`/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ order_status: 'Confirmed' }),
          });
          payModal.classList.remove('active');
          loadOrders();
        } else {
          showToast('Failed to confirm payment', 'error');
        }
      } else {
        showToast('Failed to record payment', 'error');
      }
    };
  }
}

window.updateOrderStatus = async (orderId, status) => {
  const res = await apiFetch(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ order_status: status }),
  });
  if (res) showToast(`Order #${orderId} → ${status}`);
  else showToast('Update failed', 'error');
};

window.openPayModal = (orderId, amount) => {
  const modal = document.getElementById('pay-order-modal');
  if (modal) {
    document.getElementById('pay-order-id').value = orderId;
    document.getElementById('pay-amount-label').textContent = '₦' + fmt(amount);
    modal.classList.add('active');
  }
};

// ============================================================
// SUPPLIERS
// ============================================================
async function loadSuppliers() {
  const suppliers = await apiFetch('/suppliers?limit=1000');
  if (!suppliers) return;

  setText('stat-total-suppliers', fmt(suppliers.length));

  // Load Suppliers directory cards
  const grid = document.getElementById('supplier-directory-grid');
  if (grid) {
    if (suppliers.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">No suppliers found.</p>';
    } else {
      grid.innerHTML = suppliers.map(s => `
        <div class="supplier-card">
          <h3>${s.supplier_name}</h3>
          <p>Contact: ${s.contact_person || '—'}</p>
          <p>Email: ${s.email || '—'}</p>
          <p>Phone: ${s.phone_number || '—'}</p>
          <p>Location: ${s.address || '—'}</p>
        </div>`).join('');
    }
  }

  // Load Suppliers table
  const tbody = document.getElementById('suppliers-tbody');
  if (tbody) {
    if (suppliers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No suppliers found.</td></tr>';
    } else {
      tbody.innerHTML = suppliers.map(s => `
        <tr>
          <td>${s.supplier_name}</td>
          <td>${s.contact_person || '—'}</td>
          <td>${s.phone_number || '—'}</td>
          <td>${s.email || '—'}</td>
          <td>${s.address || '—'}</td>
        </tr>`).join('');
    }
  }

  // Add Supplier form
  const addBtn = document.getElementById('add-supplier-btn');
  const modal = document.getElementById('add-supplier-modal');
  const form = document.getElementById('add-supplier-form');
  const closeModal = document.getElementById('close-supplier-modal');

  if (addBtn && modal) {
    addBtn.onclick = () => modal.classList.add('active');
    if (closeModal) closeModal.onclick = () => modal.classList.remove('active');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        supplier_name: document.getElementById('sup-name').value,
        contact_person: document.getElementById('sup-contact').value || null,
        phone_number: document.getElementById('sup-phone').value || null,
        email: document.getElementById('sup-email').value || null,
        address: document.getElementById('sup-address').value || null,
      };
      const res = await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(data) });
      if (res) {
        showToast(`Supplier "${res.supplier_name}" added!`);
        modal.classList.remove('active');
        form.reset();
        loadSuppliers();
      } else {
        showToast('Failed to add supplier', 'error');
      }
    };
  }
}

// ============================================================
// PAYMENTS
// ============================================================
async function loadPayments() {
  const payments = await apiFetch('/payments');
  if (!payments) return;

  const totalRevenue = payments.reduce((s, p) => s + (p.payment_amount || 0), 0);

  setText('stat-total-payments', fmt(payments.length));
  setText('stat-confirmed-payments', fmt(payments.length));
  setText('stat-total-revenue', '₦' + fmt(totalRevenue));

  const tbody = document.getElementById('payments-tbody');
  if (tbody) {
    if (payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No confirmed payments found</td></tr>';
    } else {
      tbody.innerHTML = payments.map(p => `
        <tr>
          <td>#${p.payment_id}</td>
          <td>Order #${p.order_id}</td>
          <td>₦${fmt(p.payment_amount)}</td>
          <td>${p.payment_method}</td>
          <td>${statusBadge(p.payment_status)}</td>
          <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB') : '—'}</td>
          <td>✓</td>
        </tr>`).join('');
    }
  }
}

// ============================================================
// REPORTS & ANALYTICS
// ============================================================
async function loadReports() {
  const [orders, payments, customers] = await Promise.all([
    apiFetch('/orders?limit=1000'),
    apiFetch('/payments'),
    apiFetch('/customers'),
  ]);

  if (!orders) return;

  const totalOrders = orders.length;
  const totalRevenue = payments ? payments.reduce((s, p) => s + (p.payment_amount || 0), 0) : 0;
  const customersServed = customers ? customers.length : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  setText('report-total-revenue', '₦' + fmt(totalRevenue));
  setText('report-total-orders', fmt(totalOrders));
  setText('report-customers-served', fmt(customersServed));
  setText('report-avg-order-value', '₦' + fmt(avgOrderValue));

  // Calculate best selling product
  const productCounts = {};
  orders.forEach(o => {
    o.items?.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + item.quantity;
    });
  });

  let bestProdId = null;
  let maxQty = 0;
  for (const prodId in productCounts) {
    if (productCounts[prodId] > maxQty) {
      maxQty = productCounts[prodId];
      bestProdId = prodId;
    }
  }

  if (bestProdId) {
    const prod = await apiFetch(`/products/${bestProdId}`);
    setText('report-best-selling-product', prod?.product_name || `Product #${bestProdId}`);
    setText('report-best-selling-desc', `${maxQty} units sold`);
  } else {
    setText('report-best-selling-product', 'None');
    setText('report-best-selling-desc', '0 units sold');
  }

  // Monthly sales summary
  const monthlyData = {};
  orders.forEach(o => {
    const date = new Date(o.order_date);
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { revenue: 0, orders: 0, customers: new Set() };
    }
    monthlyData[monthName].orders++;
    monthlyData[monthName].customers.add(o.customer_id);
    monthlyData[monthName].revenue += o.total?.total_amount || 0;
  });

  const tbody = document.getElementById('reports-tbody');
  if (tbody) {
    const keys = Object.keys(monthlyData);
    if (keys.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No monthly data available</td></tr>';
    } else {
      tbody.innerHTML = keys.map(month => {
        const d = monthlyData[month];
        return `<tr>
          <td>${month}</td>
          <td>₦${fmt(d.revenue)}</td>
          <td>${fmt(d.orders)}</td>
          <td>${fmt(d.customers.size)}</td>
          <td>—</td>
        </tr>`;
      }).join('');
    }
  }
}
