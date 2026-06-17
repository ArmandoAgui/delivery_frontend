import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, authApi, DeliveryApiError } from './api/client';
import { getStoredUser } from './api/session';
import type {
  Address,
  AdminSummary,
  Cart,
  Category,
  CommissionConfig,
  Complaint,
  Coupon,
  Delivery,
  DeliveryStatus,
  LoyaltyBalance,
  MostOrderedRestaurant,
  Order,
  Product,
  Restaurant,
  Tracking,
  User,
} from './api/types';

const demoUsers = [
  { role: 'ADMIN', email: 'admin.dev@example.com', label: 'Admin' },
  { role: 'CUSTOMER', email: 'cliente.dev@example.com', label: 'Cliente' },
  { role: 'RESTAURANT', email: 'restaurante.dev@example.com', label: 'Restaurante' },
  { role: 'DELIVERY', email: 'repartidor.dev@example.com', label: 'Repartidor' },
] as const;

const demoPassword = 'Password123!';

function money(value?: number): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function readableError(error: unknown): string {
  if (error instanceof DeliveryApiError) {
    return `${error.status}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'No se pudo completar la accion.';
}

function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function run(action: () => Promise<void>, successMessage?: string) {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await action();
      if (successMessage) {
        setSuccess(successMessage);
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, success, run, setError, setSuccess };
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="status-pill">{children}</span>;
}

function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function Notice({
  error,
  success,
  loading,
}: {
  error?: string;
  success?: string;
  loading?: boolean;
}) {
  return (
    <>
      {loading && <p className="notice neutral">Cargando...</p>}
      {error && <p className="notice error">{error}</p>}
      {success && <p className="notice success">{success}</p>}
    </>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>(demoUsers[1].email);
  const [password, setPassword] = useState(demoPassword);
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: demoPassword,
  });
  const action = useAsyncAction();

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      const auth =
        mode === 'login'
          ? await authApi.login({ email, password })
          : await authApi.register({ ...registerData, role: 'CUSTOMER' });
      onAuthenticated(auth.user);
    });
  }

  return (
    <main className="auth-page">
      <section className="hero-card">
        <p className="eyebrow">Delivery Backend Console</p>
        <h1>Un frontend MVP para probar el backend por rol.</h1>
        <p>
          Login, catalogo, carrito, pedidos, delivery, reclamos, cupones y reportes
          conectados al backend mediante REST.
        </p>
        <div className="demo-grid">
          {demoUsers.map((demo) => (
            <button
              className="demo-card"
              key={demo.email}
              type="button"
              onClick={() => {
                setMode('login');
                setEmail(demo.email);
                setPassword(demoPassword);
              }}
            >
              <span>{demo.label}</span>
              <small>{demo.email}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="auth-card">
        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Registro cliente
          </button>
        </div>
        <form onSubmit={submit} className="form-grid">
          {mode === 'login' ? (
            <>
              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Nombre
                <input
                  value={registerData.firstName}
                  onChange={(event) =>
                    setRegisterData((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </label>
              <label>
                Apellido
                <input
                  value={registerData.lastName}
                  onChange={(event) =>
                    setRegisterData((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(event) =>
                    setRegisterData((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label>
                Telefono
                <input
                  value={registerData.phone}
                  onChange={(event) =>
                    setRegisterData((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(event) =>
                    setRegisterData((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
            </>
          )}
          <button className="primary" disabled={action.loading}>
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
          <Notice error={action.error} loading={action.loading} />
        </form>
      </section>
    </main>
  );
}

function AppShell({
  user,
  children,
  onLogout,
}: {
  user: User;
  children: ReactNode;
  onLogout: () => void;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Delivery</p>
          <h2>{user.role}</h2>
        </div>
        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#modules">Modulos</a>
          <a href="#activity">Actividad</a>
        </nav>
        <button className="ghost" onClick={onLogout}>
          Cerrar sesion
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{user.email}</span>
          </div>
          <StatusPill>{user.role}</StatusPill>
        </header>
        {children}
      </div>
    </div>
  );
}

function CustomerDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null);
  const [checkout, setCheckout] = useState({ addressId: '', tipAmount: 0, couponCode: 'DEV10' });
  const [complaint, setComplaint] = useState({ orderId: '', subject: '', description: '' });
  const [review, setReview] = useState({ orderId: '', rating: 5, comment: '' });
  const action = useAsyncAction();

  async function loadBaseData() {
    const [restaurantData, cartData, orderData, addressData, loyaltyData] = await Promise.all([
      api<Restaurant[]>('/restaurants'),
      api<Cart>('/cart').catch(() => ({ subtotal: 0, items: [] })),
      api<Order[]>('/orders/my-history'),
      api<Address[]>('/users/me/addresses'),
      api<LoyaltyBalance>('/loyalty').catch(() => null),
    ]);
    setRestaurants(restaurantData);
    setCart(cartData);
    setOrders(orderData);
    setAddresses(addressData);
    setLoyalty(loyaltyData);
    setCheckout((current) => ({ ...current, addressId: addressData[0]?.id ?? current.addressId }));
  }

  async function selectRestaurant(restaurant: Restaurant) {
    setSelectedRestaurant(restaurant);
    setProducts(await api<Product[]>(`/products/restaurant/${restaurant.id}/available`));
  }

  async function addToCart(product: Product) {
    await action.run(async () => {
      setCart(await api<Cart>('/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1 } }));
    }, `${product.name} agregado al carrito.`);
  }

  async function updateQuantity(itemId: string, quantity: number) {
    await action.run(async () => {
      setCart(await api<Cart>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }));
    });
  }

  async function removeItem(itemId: string) {
    await action.run(async () => {
      await api<void>(`/cart/items/${itemId}`, { method: 'DELETE' });
      setCart(await api<Cart>('/cart'));
    }, 'Producto eliminado.');
  }

  async function createOrder() {
    await action.run(async () => {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: {
          deliveryAddressId: checkout.addressId,
          tipAmount: Number(checkout.tipAmount),
          couponCode: checkout.couponCode || undefined,
          notes: 'Pedido creado desde frontend MVP',
        },
      });
      await loadBaseData();
      setTracking(await api<Tracking>(`/orders/${order.id}/tracking`));
    }, 'Pedido creado correctamente.');
  }

  async function cancelOrder(orderId: string) {
    await action.run(async () => {
      await api<Order>(`/orders/${orderId}/cancel`, { method: 'PATCH' });
      await loadBaseData();
    }, 'Pedido cancelado.');
  }

  async function track(orderId: string) {
    await action.run(async () => {
      setTracking(await api<Tracking>(`/orders/${orderId}/tracking`));
    });
  }

  async function createComplaint() {
    await action.run(async () => {
      await api<Complaint>('/complaints', { method: 'POST', body: complaint });
      setComplaint({ orderId: '', subject: '', description: '' });
    }, 'Reclamo creado.');
  }

  async function createReview() {
    await action.run(async () => {
      await api('/reviews', { method: 'POST', body: { ...review, rating: Number(review.rating) } });
      setReview({ orderId: '', rating: 5, comment: '' });
    }, 'Calificacion enviada.');
  }

  useEffect(() => {
    action.run(loadBaseData);
  }, []);

  return (
    <main id="modules" className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cliente</p>
            <h1>Catalogo y carrito</h1>
          </div>
          {loyalty && <StatusPill>{loyalty.pointsBalance ?? loyalty.points ?? 0} pts</StatusPill>}
        </div>
        <Notice error={action.error} success={action.success} loading={action.loading} />
        <div className="restaurant-grid">
          {restaurants.map((restaurant) => (
            <button
              className={`restaurant-card ${selectedRestaurant?.id === restaurant.id ? 'selected' : ''}`}
              key={restaurant.id}
              onClick={() => selectRestaurant(restaurant)}
            >
              <strong>{restaurant.name}</strong>
              <span>{restaurant.city ?? 'Ciudad no definida'}</span>
              <small>{restaurant.open ? 'Abierto' : 'Estado no disponible'}</small>
            </button>
          ))}
        </div>
        {products.length === 0 ? (
          <EmptyState title="Selecciona un restaurante" detail="Aqui apareceran sus productos disponibles." />
        ) : (
          <div className="cards">
            {products.map((product) => (
              <article className="item-card" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.description}</span>
                </div>
                <div className="item-actions">
                  <b>{money(product.price)}</b>
                  <button onClick={() => addToCart(product)}>Agregar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Carrito</h2>
        {!cart?.items?.length ? (
          <EmptyState title="Carrito vacio" detail="Agrega productos para crear un pedido." />
        ) : (
          <>
            {cart.items.map((item) => (
              <div className="line-item" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>{money(item.lineTotal)}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                />
                <button className="danger" onClick={() => removeItem(item.id)}>
                  Quitar
                </button>
              </div>
            ))}
            <div className="total-row">
              <span>Subtotal</span>
              <strong>{money(cart.subtotal)}</strong>
            </div>
            <label>
              Direccion
              <select
                value={checkout.addressId}
                onChange={(event) =>
                  setCheckout((current) => ({ ...current, addressId: event.target.value }))
                }
              >
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} - {address.streetAddress}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Propina
              <input
                type="number"
                min="0"
                value={checkout.tipAmount}
                onChange={(event) =>
                  setCheckout((current) => ({ ...current, tipAmount: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              Cupon
              <input
                value={checkout.couponCode}
                onChange={(event) =>
                  setCheckout((current) => ({ ...current, couponCode: event.target.value }))
                }
              />
            </label>
            <button className="primary" onClick={createOrder} disabled={!checkout.addressId}>
              Crear pedido
            </button>
          </>
        )}
      </section>

      <section className="panel span-2">
        <h2>Historial y tracking</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
                  <td><StatusPill>{order.status}</StatusPill></td>
                  <td>{money(order.totalAmount)}</td>
                  <td>
                    <button onClick={() => track(order.id)}>Tracking</button>
                    <button className="danger" onClick={() => cancelOrder(order.id)}>Cancelar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tracking && (
          <div className="tracking-card">
            <strong>Pedido {tracking.orderId.slice(0, 8)}</strong>
            <span>{tracking.restaurantName}</span>
            <StatusPill>{tracking.status}</StatusPill>
            <small>{tracking.deliveryAddress}</small>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Reclamos</h2>
        <div className="form-grid">
          <input placeholder="Order ID" value={complaint.orderId} onChange={(event) => setComplaint((current) => ({ ...current, orderId: event.target.value }))} />
          <input placeholder="Asunto" value={complaint.subject} onChange={(event) => setComplaint((current) => ({ ...current, subject: event.target.value }))} />
          <textarea placeholder="Descripcion" value={complaint.description} onChange={(event) => setComplaint((current) => ({ ...current, description: event.target.value }))} />
          <button onClick={createComplaint}>Crear reclamo</button>
        </div>
      </section>

      <section className="panel">
        <h2>Calificaciones</h2>
        <div className="form-grid">
          <input placeholder="Order ID entregado" value={review.orderId} onChange={(event) => setReview((current) => ({ ...current, orderId: event.target.value }))} />
          <input type="number" min="1" max="5" value={review.rating} onChange={(event) => setReview((current) => ({ ...current, rating: Number(event.target.value) }))} />
          <textarea placeholder="Comentario" value={review.comment} onChange={(event) => setReview((current) => ({ ...current, comment: event.target.value }))} />
          <button onClick={createReview}>Enviar review</button>
        </div>
      </section>
    </main>
  );
}

function RestaurantDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: 100, categoryId: '' });
  const action = useAsyncAction();

  async function load() {
    const restaurantData = await api<Restaurant[]>('/restaurants');
    const currentRestaurantId = restaurantId || restaurantData[0]?.id || '';
    const [categoryData, productData, orderData] = await Promise.all([
      currentRestaurantId ? api<Category[]>(`/categories/restaurant/${currentRestaurantId}`) : Promise.resolve([]),
      currentRestaurantId ? api<Product[]>(`/products/restaurant/${currentRestaurantId}`) : Promise.resolve([]),
      api<Order[]>('/orders/restaurant'),
    ]);
    setRestaurants(restaurantData);
    setRestaurantId(currentRestaurantId);
    setCategories(categoryData);
    setProducts(productData);
    setOrders(orderData);
    setProductForm((current) => ({ ...current, categoryId: categoryData[0]?.id ?? current.categoryId }));
  }

  async function createProduct() {
    await action.run(async () => {
      await api<Product>('/products', {
        method: 'POST',
        body: { ...productForm, restaurantId, price: Number(productForm.price) },
      });
      await load();
      setProductForm((current) => ({ ...current, name: '', description: '' }));
    }, 'Producto creado.');
  }

  async function toggleProduct(product: Product) {
    await action.run(async () => {
      await api<Product>(`/products/${product.id}/availability`, {
        method: 'PATCH',
        body: { available: !product.available },
      });
      await load();
    });
  }

  async function orderAction(orderId: string, endpoint: 'confirm' | 'reject') {
    await action.run(async () => {
      await api<Order>(`/orders/${orderId}/${endpoint}`, { method: 'PATCH' });
      await load();
    }, endpoint === 'confirm' ? 'Pedido confirmado.' : 'Pedido rechazado.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>Restaurante</h1>
        <Notice error={action.error} success={action.success} loading={action.loading} />
        <label>
          Restaurante
          <select
            value={restaurantId}
            onChange={(event) => {
              setRestaurantId(event.target.value);
              action.run(load);
            }}
          >
            {restaurants.map((restaurant) => (
              <option value={restaurant.id} key={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>Crear producto</h2>
        <div className="form-grid">
          <input placeholder="Nombre" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
          <input placeholder="Descripcion" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
          <input type="number" min="1" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: Number(event.target.value) }))} />
          <select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button onClick={createProduct}>Guardar</button>
        </div>
      </section>

      <section className="panel span-2">
        <h2>Productos</h2>
        <div className="cards">
          {products.map((product) => (
            <article className="item-card" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.categoryName ?? product.description}</span>
              </div>
              <div className="item-actions">
                <b>{money(product.price)}</b>
                <button onClick={() => toggleProduct(product)}>{product.available ? 'Desactivar' : 'Activar'}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel span-2">
        <h2>Pedidos del restaurante</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Pedido</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
                  <td><StatusPill>{order.status}</StatusPill></td>
                  <td>{money(order.totalAmount)}</td>
                  <td>
                    <button onClick={() => orderAction(order.id, 'confirm')}>Confirmar</button>
                    <button className="danger" onClick={() => orderAction(order.id, 'reject')}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignOrderId, setAssignOrderId] = useState('');
  const action = useAsyncAction();

  async function load() {
    setDeliveries(await api<Delivery[]>('/deliveries/my-orders'));
  }

  async function assign() {
    await action.run(async () => {
      await api<Delivery>('/deliveries/assign', { method: 'POST', body: { orderId: assignOrderId } });
      setAssignOrderId('');
      await load();
    }, 'Delivery asignado.');
  }

  async function updateStatus(id: string, status: DeliveryStatus) {
    await action.run(async () => {
      await api<Delivery>(`/deliveries/${id}/status`, { method: 'PATCH', body: { status } });
      await load();
    }, `Estado actualizado a ${status}.`);
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>Repartidor</h1>
        <Notice error={action.error} success={action.success} loading={action.loading} />
        <div className="form-grid">
          <input placeholder="Order ID para asignar" value={assignOrderId} onChange={(event) => setAssignOrderId(event.target.value)} />
          <button onClick={assign}>Asignar delivery</button>
        </div>
      </section>
      <section className="panel span-2">
        <h2>Entregas asignadas</h2>
        <div className="cards">
          {deliveries.map((delivery) => (
            <article className="delivery-card" key={delivery.id}>
              <div>
                <strong>{delivery.restaurantName ?? `Orden ${delivery.orderId.slice(0, 8)}`}</strong>
                <span>{delivery.deliveryAddress}</span>
                <small>{delivery.orderSummary}</small>
              </div>
              <StatusPill>{delivery.status}</StatusPill>
              <div className="button-row">
                {(['PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] as DeliveryStatus[]).map((status) => (
                  <button key={status} onClick={() => updateStatus(delivery.id, status)}>
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reports, setReports] = useState<MostOrderedRestaurant[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [commission, setCommission] = useState<CommissionConfig | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: 'FRONT10',
    description: 'Cupon creado desde frontend',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minimumOrderAmount: 100,
    maxDiscountAmount: 80,
    usageLimit: 100,
    active: true,
  });
  const action = useAsyncAction();

  async function load() {
    const [userData, complaintData, couponData, reportData, summaryData, commissionData] =
      await Promise.all([
        api<User[]>('/users'),
        api<Complaint[]>('/complaints'),
        api<Coupon[]>('/coupons'),
        api<MostOrderedRestaurant[]>('/reports/restaurants/most-ordered'),
        api<AdminSummary>('/reports/admin-summary').catch(() => null),
        api<CommissionConfig>('/admin/commissions').catch(() => null),
      ]);
    setUsers(userData);
    setComplaints(complaintData);
    setCoupons(couponData);
    setReports(reportData);
    setSummary(summaryData);
    setCommission(commissionData);
  }

  async function createCoupon() {
    await action.run(async () => {
      await api<Coupon>('/coupons', { method: 'POST', body: couponForm });
      await load();
    }, 'Cupon guardado.');
  }

  async function resolveComplaint(id: string, status: 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED') {
    await action.run(async () => {
      await api<Complaint>(`/complaints/${id}/status`, {
        method: 'PATCH',
        body: { status, resolution: status === 'RESOLVED' ? 'Resuelto desde consola admin' : undefined },
      });
      await load();
    }, 'Reclamo actualizado.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Operacion general</h1>
          </div>
          {commission && <StatusPill>Comision {commission.percentage ?? 0}%</StatusPill>}
        </div>
        <Notice error={action.error} success={action.success} loading={action.loading} />
        {summary && (
          <div className="metric-grid">
            <div><span>Usuarios</span><strong>{summary.totalUsers ?? users.length}</strong></div>
            <div><span>Ordenes</span><strong>{summary.totalOrders ?? '-'}</strong></div>
            <div><span>Restaurantes</span><strong>{summary.totalRestaurants ?? '-'}</strong></div>
            <div><span>Ingresos</span><strong>{money(summary.totalRevenue)}</strong></div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Cupones</h2>
        <div className="form-grid">
          <input value={couponForm.code} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value }))} />
          <input type="number" value={couponForm.discountValue} onChange={(event) => setCouponForm((current) => ({ ...current, discountValue: Number(event.target.value) }))} />
          <input type="number" value={couponForm.minimumOrderAmount} onChange={(event) => setCouponForm((current) => ({ ...current, minimumOrderAmount: Number(event.target.value) }))} />
          <button onClick={createCoupon}>Crear cupon</button>
        </div>
        {coupons.slice(0, 5).map((coupon) => (
          <div className="line-item" key={coupon.id}>
            <strong>{coupon.code}</strong>
            <StatusPill>{coupon.active ? 'ACTIVO' : 'INACTIVO'}</StatusPill>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Reportes</h2>
        {reports.map((report) => (
          <div className="line-item" key={report.restaurantId}>
            <div>
              <strong>{report.restaurantName}</strong>
              <span>{report.orderCount} pedidos</span>
            </div>
            <b>{money(report.totalRevenue)}</b>
          </div>
        ))}
      </section>

      <section className="panel span-2">
        <h2>Usuarios</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td><StatusPill>{user.role}</StatusPill></td>
                  <td>{user.active === false ? 'Inactivo' : 'Activo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel span-2">
        <h2>Reclamos</h2>
        <div className="cards">
          {complaints.map((item) => (
            <article className="item-card" key={item.id}>
              <div>
                <strong>{item.subject}</strong>
                <span>{item.description}</span>
                <small>{item.orderId}</small>
              </div>
              <StatusPill>{item.status}</StatusPill>
              <div className="button-row">
                <button onClick={() => resolveComplaint(item.id, 'IN_PROGRESS')}>En proceso</button>
                <button onClick={() => resolveComplaint(item.id, 'RESOLVED')}>Resolver</button>
                <button className="danger" onClick={() => resolveComplaint(item.id, 'REJECTED')}>Rechazar</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Dashboard({ user }: { user: User }) {
  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }
  if (user.role === 'RESTAURANT') {
    return <RestaurantDashboard />;
  }
  if (user.role === 'DELIVERY') {
    return <DeliveryDashboard />;
  }
  return <CustomerDashboard />;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        if (getStoredUser()) {
          setUser(await authApi.me());
        }
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    }
    restore();
  }, []);

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  if (booting) {
    return <div className="boot-screen">Preparando consola...</div>;
  }

  if (!user) {
    return <LoginScreen onAuthenticated={setUser} />;
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <Dashboard user={user} />
    </AppShell>
  );
}
