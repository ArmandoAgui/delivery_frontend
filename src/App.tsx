import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
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
  DeliveryProfile,
  DeliveryStats,
  DeliveryStatus,
  LoyaltyBalance,
  MostOrderedRestaurant,
  Order,
  Product,
  Restaurant,
  RestaurantCommissionReport,
  RestaurantSchedule,
  RefundType,
  RoleCountReport,
  Role,
  StatusCountReport,
  TopDeliveryReport,
  TopProductReport,
  Tracking,
  User,
} from './api/types';

const demoPassword = 'Password123!';
const demoUsers = [
  { label: 'Admin', email: 'admin.dev@example.com' },
  { label: 'Cliente', email: 'cliente.dev@example.com' },
  { label: 'Restaurante', email: 'restaurante.dev@example.com' },
  { label: 'Repartidor', email: 'repartidor.dev@example.com' },
];

const roleHome: Record<Role, string> = {
  ADMIN: '/admin',
  CUSTOMER: '/cliente',
  RESTAURANT: '/restaurante',
  DELIVERY: '/repartidor',
};

function money(value?: number): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function dateTimeLocal(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function shortDate(value?: string): string {
  return value ? new Date(value).toLocaleString() : '-';
}

function apiError(error: unknown): string {
  if (error instanceof DeliveryApiError) {
    return `${error.status}: ${error.message}`;
  }
  return error instanceof Error ? error.message : 'No se pudo completar la accion.';
}

function useAction() {
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
      setError(apiError(caught));
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, success, run };
}

function Notice({ loading, error, success }: { loading?: boolean; error?: string; success?: string }) {
  return (
    <>
      {loading && <p className="notice neutral">Cargando...</p>}
      {error && <p className="notice error">{error}</p>}
      {success && <p className="notice success">{success}</p>}
    </>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="status-pill">{children}</span>;
}

function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function AuthPage({ mode, onAuth }: { mode: 'login' | 'register'; onAuth: (user: User) => void }) {
  const navigate = useNavigate();
  const action = useAction();
  const [email, setEmail] = useState('cliente.dev@example.com');
  const [password, setPassword] = useState(demoPassword);
  const [register, setRegister] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: demoPassword,
    role: 'CUSTOMER' as Exclude<Role, 'ADMIN'>,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      const auth =
        mode === 'login'
          ? await authApi.login({ email, password })
          : await authApi.register(register);
      onAuth(auth.user);
      navigate(roleHome[auth.user.role], { replace: true });
    });
  }

  return (
    <main className="auth-page">
      <section className="hero-card">
        <p className="eyebrow">Delivery Console</p>
        <h1>Servicio de comida listo para demo.</h1>
        <p>Frontend ruteado por rol, conectado al backend real con JWT y API REST.</p>
        <div className="demo-grid">
          {demoUsers.map((demo) => (
            <button
              className="demo-card"
              key={demo.email}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demoPassword);
                navigate('/login');
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
          <Link className={mode === 'login' ? 'active' : ''} to="/login">Login</Link>
          <Link className={mode === 'register' ? 'active' : ''} to="/register">Registro</Link>
        </div>
        <form className="form-grid" onSubmit={submit}>
          {mode === 'login' ? (
            <>
              <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            </>
          ) : (
            <>
              <label>Nombre<input value={register.firstName} onChange={(event) => setRegister((current) => ({ ...current, firstName: event.target.value }))} /></label>
              <label>Apellido<input value={register.lastName} onChange={(event) => setRegister((current) => ({ ...current, lastName: event.target.value }))} /></label>
              <label>Email<input type="email" value={register.email} onChange={(event) => setRegister((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Telefono<input value={register.phone} onChange={(event) => setRegister((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Password<input type="password" value={register.password} onChange={(event) => setRegister((current) => ({ ...current, password: event.target.value }))} /></label>
              <label>Tipo de cuenta
                <select value={register.role} onChange={(event) => setRegister((current) => ({ ...current, role: event.target.value as Exclude<Role, 'ADMIN'> }))}>
                  <option value="CUSTOMER">Cliente</option>
                  <option value="RESTAURANT">Restaurante</option>
                  <option value="DELIVERY">Repartidor</option>
                </select>
              </label>
            </>
          )}
          <button className="primary">{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
          <Notice {...action} />
        </form>
      </section>
    </main>
  );
}

function RequireRole({ user, roles, children }: { user: User | null; roles: Role[]; children: ReactNode }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }
  return children;
}

function AppLayout({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const links: Record<Role, { to: string; label: string }[]> = {
    CUSTOMER: [
      { to: '/cliente/restaurantes', label: 'Restaurantes' },
      { to: '/cliente/carrito', label: 'Carrito' },
      { to: '/cliente/pedidos', label: 'Mis pedidos' },
      { to: '/cliente/direcciones', label: 'Direcciones' },
      { to: '/cliente/fidelidad', label: 'Fidelidad' },
      { to: '/cliente/reclamos', label: 'Reclamos' },
      { to: '/cliente/calificaciones', label: 'Calificar' },
    ],
    RESTAURANT: [
      { to: '/restaurante/perfil', label: 'Restaurante' },
      { to: '/restaurante/productos', label: 'Productos' },
      { to: '/restaurante/horarios', label: 'Horarios' },
      { to: '/restaurante/pedidos', label: 'Pedidos' },
    ],
    DELIVERY: [
      { to: '/repartidor/perfil', label: 'Perfil' },
      { to: '/repartidor/solicitudes', label: 'Solicitudes' },
      { to: '/repartidor/entregas', label: 'Entregas' },
      { to: '/repartidor/historial', label: 'Historial' },
      { to: '/repartidor/estadisticas', label: 'Estadisticas' },
    ],
    ADMIN: [
      { to: '/admin/usuarios', label: 'Usuarios' },
      { to: '/admin/restaurantes', label: 'Restaurantes' },
      { to: '/admin/reclamos', label: 'Reclamos' },
      { to: '/admin/cupones', label: 'Cupones' },
      { to: '/admin/reportes', label: 'Reportes' },
      { to: '/admin/comisiones', label: 'Comisiones' },
    ],
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Delivery</p>
          <h2>{user.role}</h2>
          <nav>{links[user.role].map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}</nav>
        </div>
        <button className="ghost" onClick={onLogout}>Cerrar sesion</button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div><strong>{user.firstName} {user.lastName}</strong><span>{user.email}</span></div>
          <Pill>{user.role}</Pill>
        </header>
        {children}
      </div>
    </div>
  );
}

function CustomerHome() {
  return <DashboardCards title="Cliente" cards={['Buscar restaurantes', 'Comprar desde carrito', 'Tracking REST', 'Reclamos y reviews']} />;
}

function DashboardCards({ title, cards }: { title: string; cards: string[] }) {
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <p className="eyebrow">Dashboard</p>
        <h1>{title}</h1>
        <div className="metric-grid">{cards.map((card) => <div key={card}><span>Modulo</span><strong>{card}</strong></div>)}</div>
      </section>
    </main>
  );
}

function RestaurantsPage() {
  const action = useAction();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [nearby, setNearby] = useState(false);
  const [query, setQuery] = useState('');

  async function load(useNearby = false) {
    await action.run(async () => {
      setNearby(useNearby);
      setRestaurants(await api<Restaurant[]>(useNearby ? '/restaurants/nearby?lat=13.6929&lng=-89.2182&radiusKm=12' : '/restaurants'));
    });
  }

  async function search() {
    await action.run(async () => {
      setNearby(false);
      setRestaurants(await api<Restaurant[]>(`/restaurants/search?q=${encodeURIComponent(query)}`));
    });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div><p className="eyebrow">Cliente</p><h1>Restaurantes</h1></div>
          <button onClick={() => load(!nearby)}>{nearby ? 'Ver todos' : 'Cercanos PostGIS'}</button>
        </div>
        <div className="search-row">
          <input placeholder="Buscar por nombre, ciudad o descripcion" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button onClick={search}>Buscar</button>
        </div>
        <Notice {...action} />
        <div className="restaurant-grid">
          {restaurants.map((restaurant) => (
            <Link className="restaurant-card" key={restaurant.id} to={`/cliente/restaurantes/${restaurant.id}`}>
              <strong>{restaurant.name}</strong>
              <span>{restaurant.city}</span>
              <small>{restaurant.open ? 'Abierto' : 'Cerrado o fuera de horario'}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function RestaurantDetailPage() {
  const { id } = useParams();
  const action = useAction();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState('');

  useEffect(() => {
    action.run(async () => {
      const [restaurantData, productData] = await Promise.all([
        api<Restaurant>(`/restaurants/${id}`),
        api<Product[]>(`/products/restaurant/${id}`),
      ]);
      setRestaurant(restaurantData);
      setProducts(productData);
    });
  }, [id]);

  async function searchProducts() {
    await action.run(async () => {
      const results = await api<Product[]>(`/products/search?q=${encodeURIComponent(productQuery)}`);
      setProducts(results.filter((product) => product.restaurantId === id));
    });
  }

  async function add(product: Product) {
    await action.run(async () => {
      await api<Cart>('/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1 } });
    }, `${product.name} agregado.`);
  }

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{restaurant?.city ?? 'Restaurante'}</p>
            <h1>{restaurant?.name ?? 'Menu'}</h1>
            {restaurant?.description && <span>{restaurant.description}</span>}
          </div>
          <Pill>{restaurant?.open ? 'Abierto' : 'Fuera de horario'}</Pill>
        </div>
        <div className="search-row">
          <input placeholder="Buscar producto o categoria" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
          <button onClick={searchProducts}>Buscar</button>
          <button onClick={() => action.run(async () => setProducts(await api<Product[]>(`/products/restaurant/${id}`)))}>Ver menu</button>
        </div>
        <Notice {...action} />
        <div className="cards">
          {products.map((product) => (
            <article className="item-card" key={product.id}>
              <div><strong>{product.name}</strong><span>{product.description}</span></div>
              <div className="item-actions"><b>{money(product.price)}</b><button onClick={() => add(product)}>Agregar</button></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function CartPage({ checkout = false }: { checkout?: boolean }) {
  const navigate = useNavigate();
  const action = useAction();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({ addressId: '', tipAmount: 0, couponCode: '', notes: '' });
  const [addressForm, setAddressForm] = useState({
    label: 'Casa',
    streetAddress: '',
    city: 'San Salvador',
    state: 'San Salvador',
    country: 'El Salvador',
    postalCode: '1101',
    latitude: 13.6929,
    longitude: -89.2182,
    defaultAddress: true,
  });

  async function load() {
    const [cartData, addressData] = await Promise.all([
      api<Cart>('/cart').catch(() => ({ subtotal: 0, items: [] })),
      api<Address[]>('/users/me/addresses'),
    ]);
    setCart(cartData);
    setAddresses(addressData);
    setForm((current) => ({ ...current, addressId: current.addressId || addressData[0]?.id || '' }));
  }

  async function update(itemId: string, quantity: number) {
    await action.run(async () => {
      setCart(await api<Cart>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }));
    });
  }

  async function remove(itemId: string) {
    await action.run(async () => {
      await api(`/cart/items/${itemId}`, { method: 'DELETE' });
      await load();
    });
  }

  async function createOrder() {
    await action.run(async () => {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: {
          deliveryAddressId: form.addressId,
          tipAmount: Number(form.tipAmount || 0),
          couponCode: form.couponCode.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      navigate(`/cliente/tracking/${order.id}`);
    }, 'Pedido creado.');
  }

  async function createAddress() {
    await action.run(async () => {
      await api<Address>('/users/me/addresses', { method: 'POST', body: addressForm });
      await load();
    }, 'Direccion creada. Ya puedes confirmar tu pedido.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  const total = Number(cart?.subtotal ?? 0) + Number(cart?.estimatedDeliveryFee ?? 0) + Number(form.tipAmount ?? 0);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>{checkout ? 'Checkout' : 'Carrito'}</h1>
        <Notice {...action} />
        {!cart?.items.length ? <Empty title="Carrito vacio" detail="Agrega productos desde restaurantes." /> : (
          <>
            {cart.items.map((item) => (
              <div className="line-item" key={item.id}>
                <div><strong>{item.productName}</strong><span>{money(item.lineTotal)}</span></div>
                <input type="number" min="1" value={item.quantity} onChange={(event) => update(item.id, Number(event.target.value))} />
                <button className="danger" onClick={() => remove(item.id)}>Quitar</button>
              </div>
            ))}
            <div className="metric-grid">
              <div><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
              <div><span>Envio estimado</span><strong>{money(cart.estimatedDeliveryFee)}</strong></div>
              <div><span>ETA</span><strong>{cart.estimatedDeliveryMinutes ?? '-'} min</strong></div>
              <div><span>Distancia</span><strong>{cart.distanceKm ?? '-'} km</strong></div>
            </div>
            {cart.peakDemand && <p className="notice neutral">Horario pico: el envio y ETA pueden aumentar.</p>}
            {checkout ? (
              <div className="form-grid">
                {addresses.length > 0 ? (
                  <label>Direccion<select value={form.addressId} onChange={(event) => setForm((current) => ({ ...current, addressId: event.target.value }))}>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label} - {address.streetAddress}</option>)}</select></label>
                ) : (
                  <div className="panel nested-panel">
                    <h2>Agrega una direccion para poder pedir</h2>
                    <input placeholder="Etiqueta" value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} />
                    <input placeholder="Direccion" value={addressForm.streetAddress} onChange={(event) => setAddressForm((current) => ({ ...current, streetAddress: event.target.value }))} />
                    <input placeholder="Ciudad" value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} />
                    <input placeholder="Estado/departamento" value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} />
                    <input placeholder="Pais" value={addressForm.country} onChange={(event) => setAddressForm((current) => ({ ...current, country: event.target.value }))} />
                    <div className="split-row">
                      <input type="number" step="0.0001" placeholder="Latitud" value={addressForm.latitude} onChange={(event) => setAddressForm((current) => ({ ...current, latitude: Number(event.target.value) }))} />
                      <input type="number" step="0.0001" placeholder="Longitud" value={addressForm.longitude} onChange={(event) => setAddressForm((current) => ({ ...current, longitude: Number(event.target.value) }))} />
                    </div>
                    <button onClick={createAddress} disabled={!addressForm.streetAddress}>Crear direccion</button>
                  </div>
                )}
                <label>Propina<input type="number" min="0" value={form.tipAmount} onChange={(event) => setForm((current) => ({ ...current, tipAmount: Number(event.target.value) }))} /></label>
                <label>Cupon opcional<input placeholder="Ej: DEV10" value={form.couponCode} onChange={(event) => setForm((current) => ({ ...current, couponCode: event.target.value }))} /></label>
                <label>Notas<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                <div className="total-row"><span>Total estimado sin impuestos/descuentos finales</span><strong>{money(total)}</strong></div>
                <button className="primary" onClick={createOrder} disabled={!form.addressId}>Confirmar pedido</button>
              </div>
            ) : <Link className="button-link" to="/cliente/checkout">Ir a checkout</Link>}
          </>
        )}
      </section>
    </main>
  );
}

function OrdersPage() {
  const action = useAction();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    action.run(async () => setOrders(await api<Order[]>('/orders/my-history')));
  }, []);
  return <OrderTable title="Mis pedidos" orders={orders} action={action} basePath="/cliente" />;
}

function TrackingPage() {
  const { id } = useParams();
  const action = useAction();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  async function load() {
    await action.run(async () => setTracking(await api<Tracking>(`/orders/${id}/tracking`)));
  }
  useEffect(() => {
    load();
  }, [id]);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header"><h1>Seguimiento</h1><button onClick={load}>Actualizar</button></div>
        <Notice {...action} />
        {tracking && (
          <div className="tracking-card">
            <strong>{tracking.restaurantName}</strong>
            <Pill>{tracking.status}</Pill>
            {tracking.deliveryStatus && <Pill>Delivery {tracking.deliveryStatus}</Pill>}
            <span>{tracking.deliveryAddress}</span>
            <span>{tracking.deliveryUserName}</span>
            <small>ETA {tracking.estimatedDeliveryMinutes ?? '-'} min · envio {money(tracking.deliveryFee)} · {tracking.distanceKm ?? '-'} km</small>
            {tracking.peakDemand && <p className="notice neutral">Horario pico activo.</p>}
          </div>
        )}
      </section>
    </main>
  );
}

function OrderTable({ title, orders, action, basePath }: { title: string; orders: Order[]; action: ReturnType<typeof useAction>; basePath: string }) {
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>{title}</h1>
        <Notice {...action} />
        <div className="table-wrap">
          <table><thead><tr><th>Pedido</th><th>Estado</th><th>Total</th><th>ETA</th><th>Accion</th></tr></thead><tbody>
            {orders.map((order) => <tr key={order.id}><td>{order.id.slice(0, 8)}</td><td><Pill>{order.status}</Pill></td><td>{money(order.totalAmount)}</td><td>{order.estimatedDeliveryMinutes ?? '-'} min</td><td><Link to={`${basePath}/tracking/${order.id}`}>Tracking</Link></td></tr>)}
          </tbody></table>
        </div>
      </section>
    </main>
  );
}

function SimpleCustomerPage({ kind }: { kind: 'direcciones' | 'perfil' | 'fidelidad' | 'reclamos' | 'calificaciones' }) {
  const action = useAction();
  const [data, setData] = useState<unknown[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null);
  const [form, setForm] = useState({ orderId: '', subject: '', description: '', rating: 5, comment: '' });

  async function load() {
    if (kind === 'direcciones') setData(await api<Address[]>('/users/me/addresses'));
    if (kind === 'perfil') setData([await api<User>('/users/me')]);
    if (kind === 'fidelidad') setLoyalty(await api<LoyaltyBalance>('/loyalty'));
  }

  async function submit() {
    await action.run(async () => {
      if (kind === 'reclamos') await api<Complaint>('/complaints', { method: 'POST', body: { orderId: form.orderId, subject: form.subject, description: form.description } });
      if (kind === 'calificaciones') await api('/reviews', { method: 'POST', body: { orderId: form.orderId, rating: Number(form.rating), comment: form.comment } });
      setForm({ orderId: '', subject: '', description: '', rating: 5, comment: '' });
    }, 'Guardado correctamente.');
  }

  useEffect(() => {
    action.run(load);
  }, [kind]);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>{kind}</h1>
        <Notice {...action} />
        {loyalty && <div className="metric-grid"><div><span>Puntos</span><strong>{loyalty.pointsBalance ?? loyalty.points ?? 0}</strong></div></div>}
        {(kind === 'reclamos' || kind === 'calificaciones') && (
          <div className="form-grid">
            <input placeholder="Order ID entregado" value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} />
            {kind === 'reclamos' ? (
              <>
                <input placeholder="Asunto" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
                <textarea placeholder="Descripcion" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </>
            ) : (
              <>
                <input type="number" min="1" max="5" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))} />
                <textarea placeholder="Comentario" value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} />
              </>
            )}
            <button onClick={submit}>Enviar</button>
          </div>
        )}
        {data.map((item, index) => <pre className="json-card" key={index}>{JSON.stringify(item, null, 2)}</pre>)}
      </section>
    </main>
  );
}

function RestaurantHome() {
  return <DashboardCards title="Restaurante" cards={['Crea tu establecimiento', 'Gestion del menu', 'Horarios', 'Pedidos recibidos', 'Confirmacion automatiza delivery']} />;
}

const dayNames = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

function emptyRestaurantForm(user?: User | null) {
  return {
    ownerId: user?.id ?? '',
    name: '',
    description: '',
    phone: '',
    email: user?.email ?? '',
    streetAddress: '',
    city: 'San Salvador',
    state: 'SS',
    country: 'El Salvador',
    latitude: 13.6929,
    longitude: -89.2182,
    open: false,
  };
}

function scheduleDefaults(): RestaurantSchedule[] {
  return dayNames.map((_, index) => ({
    dayOfWeek: index + 1,
    opensAt: '09:00',
    closesAt: '21:00',
    closed: index === 6,
  }));
}

function RestaurantProfilePage({ user }: { user: User }) {
  const action = useAction();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState(emptyRestaurantForm(user));
  const [account, setAccount] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '', password: '' });

  function fillForm(data: Restaurant) {
    setRestaurant(data);
    setForm({
      ownerId: data.ownerId ?? user.id,
      name: data.name ?? '',
      description: data.description ?? '',
      phone: data.phone ?? '',
      email: data.email ?? user.email,
      streetAddress: data.streetAddress ?? '',
      city: data.city ?? 'San Salvador',
      state: data.state ?? 'SS',
      country: data.country ?? 'El Salvador',
      latitude: data.latitude ?? 13.6929,
      longitude: data.longitude ?? -89.2182,
      open: data.open ?? false,
    });
  }

  async function load() {
    try {
      fillForm(await api<Restaurant>('/restaurants/my'));
    } catch (error) {
      if (error instanceof DeliveryApiError && error.status === 404) {
        setRestaurant(null);
        setForm(emptyRestaurantForm(user));
        return;
      }
      throw error;
    }
  }

  async function save() {
    await action.run(async () => {
      const payload = {
        ...form,
        ownerId: user.id,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };
      const saved = restaurant
        ? await api<Restaurant>(`/restaurants/${restaurant.id}`, { method: 'PUT', body: payload })
        : await api<Restaurant>('/restaurants', { method: 'POST', body: payload });
      fillForm(saved);
    }, restaurant ? 'Restaurante actualizado.' : 'Restaurante creado.');
  }

  async function saveAccount() {
    await action.run(async () => {
      const payload = {
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone,
        password: account.password || undefined,
      };
      await api<User>('/users/me', { method: 'PUT', body: payload });
      setAccount((current) => ({ ...current, password: '' }));
    }, 'Cuenta actualizada.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div><p className="eyebrow">Restaurante</p><h1>{restaurant ? 'Perfil del establecimiento' : 'Crear establecimiento'}</h1></div>
          {restaurant && <Pill>{restaurant.open ? 'Abierto ahora' : 'Cerrado ahora'}</Pill>}
        </div>
        <Notice {...action} />
        <div className="form-grid three">
          <label>Nombre<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label>Telefono<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label className="span-2">Descripcion<input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <label>Ciudad<input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label>
          <label className="span-2">Direccion<input value={form.streetAddress} onChange={(event) => setForm((current) => ({ ...current, streetAddress: event.target.value }))} /></label>
          <label>Estado<input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} /></label>
          <label>Pais<input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} /></label>
          <label>Latitud<input type="number" step="0.000001" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: Number(event.target.value) }))} /></label>
          <label>Longitud<input type="number" step="0.000001" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: Number(event.target.value) }))} /></label>
          <button className="primary" onClick={save}>{restaurant ? 'Guardar cambios' : 'Crear restaurante'}</button>
        </div>
      </section>
      <section className="panel">
        <h2>Cuenta</h2>
        <div className="form-grid">
          <label>Nombre<input value={account.firstName} onChange={(event) => setAccount((current) => ({ ...current, firstName: event.target.value }))} /></label>
          <label>Apellido<input value={account.lastName} onChange={(event) => setAccount((current) => ({ ...current, lastName: event.target.value }))} /></label>
          <label>Email<input type="email" value={account.email} onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Telefono<input value={account.phone} onChange={(event) => setAccount((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label>Nueva password opcional<input type="password" value={account.password} onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))} /></label>
          <button onClick={saveAccount}>Actualizar cuenta</button>
        </div>
      </section>
    </main>
  );
}

function RestaurantProductsPage() {
  const action = useAction();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', description: '', price: 100, categoryId: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  async function load() {
    const ownRestaurant = await api<Restaurant>('/restaurants/my');
    setRestaurant(ownRestaurant);
    if (ownRestaurant.id) {
      const [productData, categoryData] = await Promise.all([
        api<Product[]>(`/products/restaurant/${ownRestaurant.id}`),
        api<Category[]>(`/categories/restaurant/${ownRestaurant.id}`),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setForm((value) => ({ ...value, categoryId: value.categoryId || categoryData[0]?.id || '' }));
    }
  }

  async function createCategory() {
    if (!restaurant) return;
    await action.run(async () => {
      await api<Category>('/categories', { method: 'POST', body: { ...categoryForm, restaurantId: restaurant.id } });
      setCategoryForm({ name: '', description: '' });
      await load();
    }, 'Categoria creada.');
  }

  async function updateCategory(category: Category) {
    const name = window.prompt('Nuevo nombre de categoria', category.name);
    if (!name) return;
    await action.run(async () => {
      await api<Category>(`/categories/${category.id}`, { method: 'PUT', body: { name, description: category.description ?? '' } });
      await load();
    }, 'Categoria actualizada.');
  }

  async function deactivateCategory(category: Category) {
    await action.run(async () => {
      await api<null>(`/categories/${category.id}/deactivate`, { method: 'PATCH' });
      await load();
    }, 'Categoria desactivada.');
  }

  async function create() {
    if (!restaurant) return;
    await action.run(async () => {
      await api<Product>('/products', { method: 'POST', body: { ...form, price: Number(form.price), categoryId: Number(form.categoryId), restaurantId: restaurant.id } });
      setForm({ name: '', description: '', price: 100, categoryId: categories[0]?.id ?? '' });
      await load();
    }, 'Producto creado.');
  }

  async function updateProduct(product: Product) {
    const name = window.prompt('Nuevo nombre del producto', product.name);
    if (!name) return;
    const description = window.prompt('Nueva descripcion', product.description ?? '') ?? product.description ?? '';
    const priceInput = window.prompt('Nuevo precio', String(product.price));
    if (!priceInput) return;
    await action.run(async () => {
      await api<Product>(`/products/${product.id}`, {
        method: 'PUT',
        body: {
          name,
          description,
          price: Number(priceInput),
          categoryId: Number(product.categoryId ?? categories[0]?.id),
          available: product.available ?? true,
        },
      });
      await load();
    }, 'Producto actualizado.');
  }

  async function toggleAvailability(product: Product) {
    await action.run(async () => {
      await api<Product>(`/products/${product.id}/availability`, { method: 'PATCH', body: { available: !product.available } });
      await load();
    }, 'Disponibilidad actualizada.');
  }

  async function deactivateProduct(product: Product) {
    await action.run(async () => {
      await api<null>(`/products/${product.id}/deactivate`, { method: 'PATCH' });
      await load();
    }, 'Producto desactivado.');
  }

  useEffect(() => {
    action.run(() => load());
  }, []);

  if (!restaurant && !action.loading) {
    return <main className="dashboard-grid"><section className="panel"><Empty title="Primero crea tu restaurante" detail="Ve a Perfil y registra tu establecimiento antes de gestionar menu." /><Link className="button-link" to="/restaurante/perfil">Crear restaurante</Link></section></main>;
  }

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>Productos</h1>
        <Notice {...action} />
        <p className="muted">Menu de {restaurant?.name}</p>
        <div className="form-grid">
          <input placeholder="Categoria" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
          <input placeholder="Descripcion categoria" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
          <button onClick={createCategory}>Crear categoria</button>
        </div>
        <div className="chip-row">
          {categories.map((category) => <span className="chip" key={category.id}>{category.name}<button onClick={() => updateCategory(category)}>Editar</button><button onClick={() => deactivateCategory(category)}>X</button></span>)}
        </div>
        <div className="form-grid">
          <input placeholder="Nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <input placeholder="Descripcion" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <input type="number" min="1" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} />
          <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <button onClick={create}>Crear producto</button>
        </div>
      </section>
      <section className="panel">
        <h2>Menu</h2>
        {products.length === 0 && <Empty title="Sin productos" detail="Crea categorias y luego agrega productos al menu." />}
        {products.map((product) => (
          <div className="line-item" key={product.id}>
            <strong>{product.name}</strong>
            <span>{money(product.price)}</span>
            <Pill>{product.available ? 'Disponible' : 'No disponible'}</Pill>
            <div className="button-row">
              <button onClick={() => updateProduct(product)}>Guardar</button>
              <button onClick={() => toggleAvailability(product)}>{product.available ? 'Pausar' : 'Activar'}</button>
              <button className="danger" onClick={() => deactivateProduct(product)}>Eliminar</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function RestaurantSchedulesPage() {
  const action = useAction();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [schedules, setSchedules] = useState<RestaurantSchedule[]>(scheduleDefaults());

  async function load() {
    const ownRestaurant = await api<Restaurant>('/restaurants/my');
    setRestaurant(ownRestaurant);
    const data = await api<RestaurantSchedule[]>(`/restaurants/${ownRestaurant.id}/schedules`);
    setSchedules(data.length ? data : scheduleDefaults());
  }

  async function save() {
    if (!restaurant) return;
    await action.run(async () => {
      const payload = schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        opensAt: schedule.closed ? null : schedule.opensAt,
        closesAt: schedule.closed ? null : schedule.closesAt,
        closed: schedule.closed,
      }));
      setSchedules(await api<RestaurantSchedule[]>(`/restaurants/${restaurant.id}/schedules`, { method: 'PUT', body: payload }));
    }, 'Horarios actualizados.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Horarios</h1>
        <Notice {...action} />
        <div className="schedule-grid">
          {schedules.map((schedule, index) => (
            <div className="schedule-row" key={schedule.dayOfWeek}>
              <strong>{dayNames[schedule.dayOfWeek - 1]}</strong>
              <label><input type="checkbox" checked={schedule.closed} onChange={(event) => setSchedules((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, closed: event.target.checked } : item))} /> Cerrado</label>
              <input type="time" value={schedule.opensAt ?? '09:00'} disabled={schedule.closed} onChange={(event) => setSchedules((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, opensAt: event.target.value } : item))} />
              <input type="time" value={schedule.closesAt ?? '21:00'} disabled={schedule.closed} onChange={(event) => setSchedules((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, closesAt: event.target.value } : item))} />
            </div>
          ))}
        </div>
        <button className="primary" onClick={save}>Guardar horarios</button>
      </section>
    </main>
  );
}

function RestaurantOrdersPage() {
  const action = useAction();
  const [orders, setOrders] = useState<Order[]>([]);
  async function load() {
    setOrders(await api<Order[]>('/orders/restaurant'));
  }
  async function confirm(id: string) {
    await action.run(async () => {
      await api<Order>(`/orders/${id}/confirm`, { method: 'PATCH' });
      await load();
    }, 'Pedido confirmado y delivery asignado automaticamente.');
  }
  async function reject(id: string) {
    await action.run(async () => {
      await api<Order>(`/orders/${id}/reject`, { method: 'PATCH' });
      await load();
    }, 'Pedido rechazado.');
  }
  useEffect(() => {
    action.run(load);
  }, []);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Pedidos recibidos</h1>
        <Notice {...action} />
        <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Estado</th><th>Items</th><th>Envio</th><th>Propina</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.id.slice(0, 8)}<br /><small>{order.createdAt}</small></td><td><Pill>{order.status}</Pill></td><td>{order.items?.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}</td><td>{money(order.deliveryFee)}</td><td>{money(order.tipAmount)}</td><td>{money(order.totalAmount)}</td><td><button disabled={order.status !== 'CREATED'} onClick={() => confirm(order.id)}>Confirmar</button><button className="danger" disabled={order.status !== 'CREATED'} onClick={() => reject(order.id)}>Rechazar</button></td></tr>)}</tbody></table></div>
      </section>
      <RestaurantStats orders={orders} />
    </main>
  );
}

function RestaurantStats({ orders }: { orders: Order[] }) {
  const totalSales = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  const byStatus = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const productCounts = orders.flatMap((order) => order.items ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.productName] = (acc[item.productName] ?? 0) + item.quantity;
    return acc;
  }, {});
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <section className="panel">
      <h2>Estadisticas</h2>
      <div className="metric-grid">
        <div><span>Pedidos</span><strong>{orders.length}</strong></div>
        <div><span>Ventas</span><strong>{money(totalSales)}</strong></div>
        <div><span>Top producto</span><strong>{topProduct ? `${topProduct[0]} (${topProduct[1]})` : '-'}</strong></div>
      </div>
      <div className="chip-row">{Object.entries(byStatus).map(([status, count]) => <span className="chip" key={status}>{status}: {count}</span>)}</div>
    </section>
  );
}

function DeliveryHome() {
  return <DashboardCards title="Repartidor" cards={['Solicitudes cercanas por PostGIS', 'Aceptar o rechazar', 'Estados REST ordenados', 'Historial y ganancias']} />;
}

function DeliveryCard({ delivery, children }: { delivery: Delivery; children?: ReactNode }) {
  return (
    <article className="delivery-card">
      <div className="panel-header">
        <div className="delivery-card-title">
          <strong>{delivery.restaurantName ?? 'Restaurante'}</strong>
          <small>Pedido {delivery.orderId.slice(0, 8)}</small>
        </div>
        <Pill>{delivery.status}</Pill>
      </div>
      <span><strong>Pickup:</strong> {delivery.restaurantAddress ?? 'Sin direccion de restaurante'}</span>
      <span><strong>Entrega:</strong> {delivery.deliveryAddress ?? 'Sin direccion de entrega'}</span>
      <small>{delivery.orderSummary}</small>
      <div className="metric-grid compact">
        <div><span>Distancia</span><strong>{delivery.distanceKm ?? '-'} km</strong></div>
        <div><span>Envio</span><strong>{money(delivery.deliveryFee)}</strong></div>
        <div><span>Propina</span><strong>{money(delivery.tipAmount)}</strong></div>
        <div><span>Total</span><strong>{money(delivery.totalAmount)}</strong></div>
      </div>
      {children}
    </article>
  );
}

function DeliveryRequestsPage() {
  const action = useAction();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  async function load() {
    setDeliveries(await api<Delivery[]>('/deliveries/requests'));
  }
  async function accept(id: string) {
    await action.run(async () => {
      await api<Delivery>(`/deliveries/${id}/accept`, { method: 'PATCH' });
      await load();
    }, 'Solicitud aceptada.');
  }
  async function reject(id: string) {
    await action.run(async () => {
      await api<Delivery>(`/deliveries/${id}/reject`, { method: 'PATCH' });
      await load();
    }, 'Solicitud rechazada. Se ofrecera al siguiente repartidor si existe.');
  }
  useEffect(() => {
    action.run(load);
  }, []);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Solicitudes pendientes</h1>
        <Notice {...action} />
        {deliveries.length === 0 && <Empty title="Sin solicitudes" detail="Cuando un restaurante confirme un pedido cercano, aparecera aqui." />}
        <div className="cards">
          {deliveries.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery}>
              <div className="button-row"><button onClick={() => accept(delivery.id)}>Aceptar</button><button className="danger" onClick={() => reject(delivery.id)}>Rechazar</button></div>
            </DeliveryCard>
          ))}
        </div>
      </section>
    </main>
  );
}

function DeliveryActivePage() {
  const action = useAction();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  async function load() {
    setDeliveries(await api<Delivery[]>('/deliveries/active'));
  }
  async function status(id: string, next: DeliveryStatus) {
    await action.run(async () => {
      await api<Delivery>(`/deliveries/${id}/status`, { method: 'PATCH', body: { status: next } });
      await load();
    }, `Estado actualizado a ${next}.`);
  }
  useEffect(() => {
    action.run(load);
  }, []);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Entregas activas</h1>
        <Notice {...action} />
        {deliveries.length === 0 && <Empty title="Sin entregas activas" detail="Acepta una solicitud para comenzar una entrega." />}
        <div className="cards">
          {deliveries.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery}>
              <div className="button-row">{(['PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] as DeliveryStatus[]).map((next) => <button key={next} onClick={() => status(delivery.id, next)}>{next}</button>)}</div>
            </DeliveryCard>
          ))}
        </div>
      </section>
    </main>
  );
}

function DeliveryHistoryPage() {
  const action = useAction();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  useEffect(() => {
    action.run(async () => setDeliveries(await api<Delivery[]>('/deliveries/history')));
  }, []);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Historial</h1>
        <Notice {...action} />
        {deliveries.length === 0 && <Empty title="Sin historial" detail="Las entregas completadas apareceran aqui." />}
        <div className="cards">{deliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} />)}</div>
      </section>
    </main>
  );
}

function DeliveryProfilePage() {
  const action = useAction();
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [form, setForm] = useState({ latitude: 13.6929, longitude: -89.2182, available: true });

  async function load() {
    const data = await api<DeliveryProfile>('/deliveries/profile');
    setProfile(data);
    setForm({
      latitude: data.latitude ?? 13.6929,
      longitude: data.longitude ?? -89.2182,
      available: data.available,
    });
  }

  async function saveLocation() {
    await action.run(async () => {
      setProfile(await api<DeliveryProfile>('/deliveries/location', { method: 'PATCH', body: form }));
    }, 'Ubicacion actualizada.');
  }

  async function toggleAvailability() {
    await action.run(async () => {
      const next = !form.available;
      setProfile(await api<DeliveryProfile>('/deliveries/availability', { method: 'PATCH', body: { available: next } }));
      setForm((current) => ({ ...current, available: next }));
    }, 'Disponibilidad actualizada.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>Perfil y ubicacion</h1>
        <Notice {...action} />
        {profile && <div className="tracking-card"><strong>{profile.deliveryUserName}</strong><Pill>{profile.available ? 'Disponible' : 'No disponible'}</Pill><small>Ultimo registro: {profile.locationRecordedAt ?? 'sin ubicacion'}</small></div>}
        <div className="form-grid">
          <label>Latitud<input type="number" step="0.000001" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: Number(event.target.value) }))} /></label>
          <label>Longitud<input type="number" step="0.000001" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: Number(event.target.value) }))} /></label>
          <label><input type="checkbox" checked={form.available} onChange={(event) => setForm((current) => ({ ...current, available: event.target.checked }))} /> Disponible para recibir solicitudes</label>
          <button onClick={saveLocation}>Guardar ubicacion</button>
          <button onClick={toggleAvailability}>{form.available ? 'Pausar disponibilidad' : 'Activar disponibilidad'}</button>
        </div>
      </section>
    </main>
  );
}

function DeliveryStatsPage() {
  const action = useAction();
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  useEffect(() => {
    action.run(async () => setStats(await api<DeliveryStats>('/deliveries/stats')));
  }, []);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Estadisticas</h1>
        <Notice {...action} />
        {stats && <div className="metric-grid"><div><span>Solicitudes</span><strong>{stats.pendingRequests}</strong></div><div><span>Activas</span><strong>{stats.activeDeliveries}</strong></div><div><span>Completadas</span><strong>{stats.completedDeliveries}</strong></div><div><span>Rechazadas</span><strong>{stats.rejectedRequests}</strong></div><div><span>Envios</span><strong>{money(stats.estimatedDeliveryEarnings)}</strong></div><div><span>Propinas</span><strong>{money(stats.tipsReceived)}</strong></div></div>}
      </section>
    </main>
  );
}

function AdminUsersPage() {
  const action = useAction();
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState<'ALL' | Role>('ALL');
  const [query, setQuery] = useState('');

  async function load() {
    setUsers(await api<User[]>('/users'));
  }

  async function setActive(user: User, active: boolean) {
    const message = active ? 'activar' : 'desactivar';
    if (!window.confirm(`Confirmar ${message} usuario ${user.email}?`)) return;
    await action.run(async () => {
      if (active) {
        await api<User>(`/users/${user.id}/activate`, { method: 'PATCH' });
      } else {
        await api(`/users/${user.id}`, { method: 'DELETE' });
      }
      await load();
    }, `Usuario ${active ? 'activado' : 'desactivado'}.`);
  }

  useEffect(() => {
    action.run(load);
  }, []);

  const filtered = users.filter((user) => {
    const matchesRole = role === 'ALL' || user.role === role;
    const text = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
    return matchesRole && text.includes(query.toLowerCase());
  });

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div><p className="eyebrow">Admin</p><h1>Usuarios</h1></div>
          <Pill>{filtered.length} visibles</Pill>
        </div>
        <div className="search-row">
          <input placeholder="Buscar por nombre o correo" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select value={role} onChange={(event) => setRole(event.target.value as 'ALL' | Role)}>
            <option value="ALL">Todos los roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="RESTAURANT">RESTAURANT</option>
            <option value="DELIVERY">DELIVERY</option>
          </select>
        </div>
        <Notice {...action} />
        <p className="notice neutral">Por regla del proyecto, el administrador solo consulta usuarios y puede activar o desactivar cuentas. No edita datos personales ni roles.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
            <tbody>{filtered.map((user) => <tr key={user.id}><td><strong>{user.firstName} {user.lastName}</strong><br /><small>{user.email}</small><br /><small>{user.phone ?? 'sin telefono'}</small></td><td><Pill>{user.role}</Pill></td><td>{user.active === false ? 'Inactivo' : 'Activo'}</td><td>{shortDate(user.createdAt)}</td><td><div className="button-row">{user.active === false ? <button onClick={() => setActive(user, true)}>Activar</button> : <button className="danger" onClick={() => setActive(user, false)}>Desactivar</button>}</div></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function AdminRestaurantsPage() {
  const action = useAction();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState('');
  async function load() {
    setRestaurants(await api<Restaurant[]>('/restaurants'));
  }
  async function search() {
    setRestaurants(await api<Restaurant[]>(`/restaurants/search?q=${encodeURIComponent(query)}`));
  }
  async function deactivate(restaurant: Restaurant) {
    if (!window.confirm(`Desactivar restaurante ${restaurant.name}?`)) return;
    await action.run(async () => {
      await api(`/restaurants/${restaurant.id}/deactivate`, { method: 'PATCH' });
      await load();
    }, 'Restaurante desactivado.');
  }
  useEffect(() => {
    action.run(load);
  }, []);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header"><div><p className="eyebrow">Admin</p><h1>Restaurantes</h1></div><Pill>Supervision</Pill></div>
        <div className="search-row"><input placeholder="Buscar restaurante o ciudad" value={query} onChange={(event) => setQuery(event.target.value)} /><button onClick={() => action.run(search)}>Buscar</button></div>
        <Notice {...action} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Restaurante</th><th>Ubicacion</th><th>Estado</th><th>Owner</th><th>Acciones</th></tr></thead>
            <tbody>{restaurants.map((restaurant) => <tr key={restaurant.id}><td><strong>{restaurant.name}</strong><br /><small>{restaurant.email ?? '-'}</small></td><td>{restaurant.city}, {restaurant.country}<br /><small>{restaurant.streetAddress}</small></td><td><Pill>{restaurant.open ? 'Abierto' : 'Cerrado'}</Pill><br /><small>{restaurant.active === false ? 'Inactivo' : 'Activo'}</small></td><td><small>{restaurant.ownerId ?? '-'}</small></td><td><button className="danger" disabled={restaurant.active === false} onClick={() => deactivate(restaurant)}>Desactivar</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function AdminComplaintsPage() {
  const action = useAction();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [status, setStatus] = useState('ALL');
  const [decisions, setDecisions] = useState<Record<string, { resolution: string; refundType: RefundType; refundAmount: number }>>({});

  async function load(nextStatus = status) {
    const queryString = nextStatus === 'ALL' ? '' : `?status=${nextStatus}`;
    setComplaints(await api<Complaint[]>(`/complaints${queryString}`));
  }

  function decisionFor(complaint: Complaint) {
    return decisions[complaint.id] ?? { resolution: complaint.resolution ?? '', refundType: 'TOTAL' as RefundType, refundAmount: Number(complaint.refund?.amount ?? 0) };
  }

  function updateDecision(complaint: Complaint, patch: Partial<{ resolution: string; refundType: RefundType; refundAmount: number }>) {
    setDecisions((current) => ({ ...current, [complaint.id]: { ...decisionFor(complaint), ...patch } }));
  }

  async function update(complaint: Complaint, nextStatus: string) {
    const decision = decisionFor(complaint);
    await action.run(async () => {
      await api<Complaint>(`/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        body: {
          status: nextStatus,
          resolution: decision.resolution.trim() || undefined,
          refundType: nextStatus === 'RESOLVED' ? decision.refundType : 'NONE',
          refundAmount: nextStatus === 'RESOLVED' && decision.refundType === 'PARTIAL' ? Number(decision.refundAmount) : undefined,
        },
      });
      await load();
    }, 'Reclamo actualizado.');
  }

  useEffect(() => {
    action.run(() => load('ALL'));
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header"><div><p className="eyebrow">Admin</p><h1>Reclamos y reembolsos</h1></div><select value={status} onChange={(event) => { setStatus(event.target.value); action.run(() => load(event.target.value)); }}><option value="ALL">Todos</option><option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="RESOLVED">RESOLVED</option><option value="REJECTED">REJECTED</option></select></div>
        <Notice {...action} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reclamo</th><th>Cliente</th><th>Pedido</th><th>Estado</th><th>Reembolso</th><th>Acciones</th></tr></thead>
            <tbody>{complaints.map((complaint) => {
              const decision = decisionFor(complaint);
              return <tr key={complaint.id}><td><strong>{complaint.subject}</strong><br /><small>{complaint.description}</small><br /><small>Resolucion: {complaint.resolution ?? '-'}</small></td><td>{complaint.customerName ?? complaint.customerUserId}<br /><small>{complaint.customerEmail}</small></td><td>{complaint.orderId.slice(0, 8)}<br /><small>{complaint.restaurantName ?? '-'}</small><br /><small>{complaint.orderStatus ?? '-'}</small></td><td><Pill>{complaint.status}</Pill></td><td>{complaint.refund?.refundStatus ?? 'NONE'}<br /><small>{money(complaint.refund?.amount)}</small></td><td><div className="form-grid admin-inline-form"><label>Comentario<textarea value={decision.resolution} onChange={(event) => updateDecision(complaint, { resolution: event.target.value })} placeholder="Resolucion administrativa" disabled={complaint.status === 'RESOLVED' || complaint.status === 'REJECTED'} /></label><label>Reembolso<select value={decision.refundType} onChange={(event) => updateDecision(complaint, { refundType: event.target.value as RefundType })} disabled={complaint.status !== 'IN_PROGRESS'}><option value="TOTAL">Total</option><option value="PARTIAL">Parcial</option><option value="NONE">Sin reembolso</option></select></label>{decision.refundType === 'PARTIAL' && <label>Monto parcial<input type="number" min="0.01" step="0.01" value={decision.refundAmount} onChange={(event) => updateDecision(complaint, { refundAmount: Number(event.target.value) })} disabled={complaint.status !== 'IN_PROGRESS'} /></label>}<div className="button-row"><button disabled={complaint.status !== 'OPEN'} onClick={() => update(complaint, 'IN_PROGRESS')}>Tomar</button><button disabled={complaint.status !== 'IN_PROGRESS'} onClick={() => update(complaint, 'RESOLVED')}>Resolver</button><button className="danger" disabled={complaint.status !== 'IN_PROGRESS'} onClick={() => update(complaint, 'REJECTED')}>Rechazar</button></div></div></td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function AdminCouponsPage() {
  const action = useAction();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState({
    code: 'ADMINDEMO',
    description: 'Cupon demo administrativo',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minimumOrderAmount: 0,
    maxDiscountAmount: 5,
    usageLimit: 100,
    startsAt: dateTimeLocal(0),
    expiresAt: dateTimeLocal(30),
    active: true,
  });

  async function load() {
    setCoupons(await api<Coupon[]>('/coupons'));
  }

  function edit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue ?? 0),
      minimumOrderAmount: Number(coupon.minimumOrderAmount ?? 0),
      maxDiscountAmount: Number(coupon.maxDiscountAmount ?? 0),
      usageLimit: Number(coupon.usageLimit ?? 100),
      startsAt: (coupon.startsAt ?? dateTimeLocal(0)).slice(0, 16),
      expiresAt: (coupon.expiresAt ?? dateTimeLocal(30)).slice(0, 16),
      active: coupon.active ?? true,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      const method = editingId ? 'PUT' : 'POST';
      const path = editingId ? `/coupons/${editingId}` : '/coupons';
      await api<Coupon>(path, { method, body: form });
      setEditingId(null);
      await load();
    }, editingId ? 'Cupon actualizado.' : 'Cupon creado.');
  }

  async function setCouponActive(coupon: Coupon, active: boolean) {
    await action.run(async () => {
      await api<Coupon>(`/coupons/${coupon.id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
      await load();
    }, `Cupon ${active ? 'activado' : 'desactivado'}.`);
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>{editingId ? 'Editar cupon' : 'Crear cupon'}</h1>
        <Notice {...action} />
        <form className="form-grid" onSubmit={submit}>
          <label>Codigo<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label>Descripcion<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>Tipo<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED">Monto fijo</option></select></label>
          <label>Descuento<input type="number" min="0.01" step="0.01" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: Number(event.target.value) })} /></label>
          <label>Monto minimo<input type="number" min="0" step="0.01" value={form.minimumOrderAmount} onChange={(event) => setForm({ ...form, minimumOrderAmount: Number(event.target.value) })} /></label>
          <label>Max descuento<input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(event) => setForm({ ...form, maxDiscountAmount: Number(event.target.value) })} /></label>
          <label>Limite usos<input type="number" min="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: Number(event.target.value) })} /></label>
          <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
          <label>Expira<input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label>
          <label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activo</label>
          <button className="primary">{editingId ? 'Guardar cambios' : 'Crear cupon'}</button>
        </form>
      </section>
      <section className="panel">
        <h1>Cupones</h1>
        <div className="cards">
          {coupons.map((coupon) => <article className="item-card" key={coupon.id}><div><strong>{coupon.code}</strong><span>{coupon.description}</span></div><div className="metric-grid compact"><div><span>Tipo</span><strong>{coupon.discountType}</strong></div><div><span>Valor</span><strong>{coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : money(coupon.discountValue)}</strong></div><div><span>Usos</span><strong>{coupon.usedCount ?? 0}/{coupon.usageLimit ?? '-'}</strong></div><div><span>Estado</span><strong>{coupon.active ? 'Activo' : 'Inactivo'}</strong></div></div><div className="button-row"><button onClick={() => edit(coupon)}>Editar</button>{coupon.active ? <button className="danger" onClick={() => setCouponActive(coupon, false)}>Desactivar</button> : <button onClick={() => setCouponActive(coupon, true)}>Activar</button>}</div></article>)}
        </div>
      </section>
    </main>
  );
}

function AdminReportsPage() {
  const action = useAction();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [restaurants, setRestaurants] = useState<MostOrderedRestaurant[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<StatusCountReport[]>([]);
  const [complaintsByStatus, setComplaintsByStatus] = useState<StatusCountReport[]>([]);
  const [usersByRole, setUsersByRole] = useState<RoleCountReport[]>([]);
  const [topDeliveries, setTopDeliveries] = useState<TopDeliveryReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [restaurantCommissions, setRestaurantCommissions] = useState<RestaurantCommissionReport[]>([]);

  useEffect(() => {
    action.run(async () => {
      const [summaryData, restaurantData, orderStatusData, complaintStatusData, roleData, deliveryData, productData, commissionData] = await Promise.all([
        api<AdminSummary>('/reports/admin-summary'),
        api<MostOrderedRestaurant[]>('/reports/restaurants/most-ordered'),
        api<StatusCountReport[]>('/reports/orders/by-status'),
        api<StatusCountReport[]>('/reports/complaints/by-status'),
        api<RoleCountReport[]>('/reports/users/by-role'),
        api<TopDeliveryReport[]>('/reports/deliveries/top'),
        api<TopProductReport[]>('/reports/products/top'),
        api<RestaurantCommissionReport[]>('/reports/restaurants/commissions'),
      ]);
      setSummary(summaryData);
      setRestaurants(restaurantData);
      setOrdersByStatus(orderStatusData);
      setComplaintsByStatus(complaintStatusData);
      setUsersByRole(roleData);
      setTopDeliveries(deliveryData);
      setTopProducts(productData);
      setRestaurantCommissions(commissionData);
    });
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header"><div><p className="eyebrow">Admin</p><h1>Reportes</h1></div><Pill>Tiempo real</Pill></div>
        <Notice {...action} />
        {summary && <div className="metric-grid"><div><span>Usuarios</span><strong>{summary.users ?? summary.totalUsers}</strong></div><div><span>Restaurantes</span><strong>{summary.restaurants ?? summary.totalRestaurants}</strong></div><div><span>Pedidos</span><strong>{summary.orders ?? summary.totalOrders}</strong></div><div><span>Ventas</span><strong>{money(summary.revenue ?? summary.totalRevenue)}</strong></div><div><span>Reclamos abiertos</span><strong>{summary.openComplaints ?? 0}</strong></div><div><span>Comisiones est.</span><strong>{money(summary.estimatedCommissions)}</strong></div></div>}
      </section>
      <ReportTable title="Restaurantes mas pedidos" rows={restaurants.map((row) => [row.restaurantName, `${row.orders ?? row.orderCount ?? 0} pedidos`, money(row.revenue ?? row.totalRevenue)])} />
      <ReportTable title="Comision generada por restaurante" rows={restaurantCommissions.map((row) => [row.restaurantName, `${row.orders} pedidos`, `${row.commissionPercentage}%`, money(row.commissionAmount)])} />
      <ReportTable title="Pedidos por estado" rows={ordersByStatus.map((row) => [row.status, `${row.count}`, money(row.amount)])} />
      <ReportTable title="Reclamos por estado" rows={complaintsByStatus.map((row) => [row.status, `${row.count}`, ''])} />
      <ReportTable title="Usuarios por rol" rows={usersByRole.map((row) => [row.role, `${row.users}`, ''])} />
      <ReportTable title="Top repartidores" rows={topDeliveries.map((row) => [row.deliveryUserName, `${row.deliveries} entregas`, money(row.earnings)])} />
      <ReportTable title="Top productos" rows={topProducts.map((row) => [row.productName, `${row.quantitySold} vendidos`, money(row.revenue)])} />
    </main>
  );
}

function ReportTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length === 0 ? <Empty title="Sin datos" /> : <div className="table-wrap"><table><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}
    </section>
  );
}

function AdminCommissionsPage() {
  const action = useAction();
  const [commissions, setCommissions] = useState<CommissionConfig[]>([]);
  const [form, setForm] = useState({ commissionPercentage: 12, startsAt: dateTimeLocal(0), endsAt: '' });

  async function load() {
    setCommissions(await api<CommissionConfig[]>('/admin/commissions'));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      await api<CommissionConfig>('/admin/commissions', { method: 'POST', body: { ...form, endsAt: form.endsAt || null } });
      await load();
    }, 'Comision global configurada.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>Comision global</h1>
        <Notice {...action} />
        <p className="notice neutral">Esta comision porcentual aplica para todos los restaurantes. Los reportes calculan cuanto genera cada restaurante con el porcentaje global vigente.</p>
        <form className="form-grid" onSubmit={submit}>
          <label>Porcentaje<input type="number" min="0" max="100" step="0.01" value={form.commissionPercentage} onChange={(event) => setForm({ ...form, commissionPercentage: Number(event.target.value) })} /></label>
          <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
          <label>Fin opcional<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
          <button className="primary">Guardar comision global</button>
        </form>
      </section>
      <section className="panel">
        <h1>Historial de comisiones</h1>
        <div className="table-wrap"><table><thead><tr><th>Alcance</th><th>Porcentaje</th><th>Vigencia</th></tr></thead><tbody>{commissions.map((commission) => <tr key={commission.id}><td>{commission.global ? 'Todos los restaurantes' : 'Configuracion heredada'}</td><td>{commission.commissionPercentage}%</td><td>{shortDate(commission.startsAt)}<br /><small>{commission.endsAt ? `hasta ${shortDate(commission.endsAt)}` : 'sin fin'}</small></td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}

function AdminHome() {
  return <DashboardCards title="Admin" cards={['Gestion de usuarios', 'Reclamos y reembolsos', 'Cupones', 'Reportes', 'Comisiones', 'Supervision de restaurantes']} />;
}

function Forbidden() {
  return <main className="boot-screen">403 - No tienes permisos para esta vista.</main>;
}

function NotFound() {
  return <main className="boot-screen">404 - Pagina no encontrada.</main>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        if (getStoredUser()) setUser(await authApi.me());
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

  if (booting) return <div className="boot-screen">Preparando consola...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={user ? roleHome[user.role] : '/login'} replace />} />
        <Route path="/login" element={<AuthPage mode="login" onAuth={setUser} />} />
        <Route path="/register" element={<AuthPage mode="register" onAuth={setUser} />} />
        <Route path="/403" element={<Forbidden />} />

        <Route path="/cliente/*" element={<RequireRole user={user} roles={['CUSTOMER']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<CustomerHome />} /><Route path="restaurantes" element={<RestaurantsPage />} /><Route path="restaurantes/:id" element={<RestaurantDetailPage />} /><Route path="carrito" element={<CartPage />} /><Route path="checkout" element={<CartPage checkout />} /><Route path="pedidos" element={<OrdersPage />} /><Route path="pedidos/:id" element={<TrackingPage />} /><Route path="tracking/:id" element={<TrackingPage />} /><Route path="direcciones" element={<SimpleCustomerPage kind="direcciones" />} /><Route path="perfil" element={<SimpleCustomerPage kind="perfil" />} /><Route path="fidelidad" element={<SimpleCustomerPage kind="fidelidad" />} /><Route path="reclamos" element={<SimpleCustomerPage kind="reclamos" />} /><Route path="calificaciones" element={<SimpleCustomerPage kind="calificaciones" />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/restaurante/*" element={<RequireRole user={user} roles={['RESTAURANT']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<RestaurantHome />} /><Route path="perfil" element={<RestaurantProfilePage user={user!} />} /><Route path="menu" element={<RestaurantProductsPage />} /><Route path="productos" element={<RestaurantProductsPage />} /><Route path="horarios" element={<RestaurantSchedulesPage />} /><Route path="pedidos" element={<RestaurantOrdersPage />} /><Route path="pedidos/:id" element={<RestaurantOrdersPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/repartidor/*" element={<RequireRole user={user} roles={['DELIVERY']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<DeliveryHome />} /><Route path="perfil" element={<DeliveryProfilePage />} /><Route path="solicitudes" element={<DeliveryRequestsPage />} /><Route path="entregas" element={<DeliveryActivePage />} /><Route path="entregas/:id" element={<DeliveryActivePage />} /><Route path="historial" element={<DeliveryHistoryPage />} /><Route path="estadisticas" element={<DeliveryStatsPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole user={user} roles={['ADMIN']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<AdminHome />} /><Route path="usuarios" element={<AdminUsersPage />} /><Route path="restaurantes" element={<AdminRestaurantsPage />} /><Route path="reclamos" element={<AdminComplaintsPage />} /><Route path="cupones" element={<AdminCouponsPage />} /><Route path="reportes" element={<AdminReportsPage />} /><Route path="comisiones" element={<AdminCommissionsPage />} /></Routes></AppLayout></RequireRole>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
