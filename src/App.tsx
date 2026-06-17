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
  DeliveryStatus,
  LoyaltyBalance,
  MostOrderedRestaurant,
  Order,
  Product,
  Restaurant,
  Role,
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
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      const auth =
        mode === 'login'
          ? await authApi.login({ email, password })
          : await authApi.register({ ...register, role: 'CUSTOMER' });
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
      { to: '/repartidor/entregas', label: 'Entregas' },
      { to: '/repartidor/historial', label: 'Historial' },
    ],
    ADMIN: [
      { to: '/admin/usuarios', label: 'Usuarios' },
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
  return <DashboardCards title="Restaurante" cards={['Gestion del menu', 'Horarios', 'Pedidos recibidos', 'Confirmacion automatiza delivery']} />;
}

function RestaurantProductsPage() {
  const action = useAction();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', description: '', price: 100, categoryId: '' });

  async function load(selected = restaurantId) {
    const restaurantData = await api<Restaurant[]>('/restaurants');
    const current = selected || restaurantData[0]?.id || '';
    setRestaurants(restaurantData);
    setRestaurantId(current);
    if (current) {
      const [productData, categoryData] = await Promise.all([
        api<Product[]>(`/products/restaurant/${current}`),
        api<Category[]>(`/categories/restaurant/${current}`),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setForm((value) => ({ ...value, categoryId: value.categoryId || categoryData[0]?.id || '' }));
    }
  }

  async function create() {
    await action.run(async () => {
      await api<Product>('/products', { method: 'POST', body: { ...form, price: Number(form.price), restaurantId } });
      await load(restaurantId);
    }, 'Producto creado.');
  }

  useEffect(() => {
    action.run(() => load());
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <h1>Productos</h1>
        <Notice {...action} />
        <label>Restaurante<select value={restaurantId} onChange={(event) => action.run(() => load(event.target.value))}>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select></label>
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
        {products.map((product) => <div className="line-item" key={product.id}><strong>{product.name}</strong><span>{money(product.price)}</span><Pill>{product.available ? 'Disponible' : 'No disponible'}</Pill></div>)}
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
        <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.id.slice(0, 8)}</td><td><Pill>{order.status}</Pill></td><td>{money(order.totalAmount)}</td><td><button onClick={() => confirm(order.id)}>Confirmar</button><button className="danger" onClick={() => reject(order.id)}>Rechazar</button></td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}

function DeliveryHome() {
  return <DashboardCards title="Repartidor" cards={['Pedidos asignados automaticamente', 'Direccion texto plano', 'Estados REST', 'Historial']} />;
}

function DeliveryOrdersPage() {
  const action = useAction();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  async function load() {
    setDeliveries(await api<Delivery[]>('/deliveries/my-orders'));
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
        <h1>Entregas asignadas</h1>
        <Notice {...action} />
        <div className="cards">
          {deliveries.map((delivery) => <article className="delivery-card" key={delivery.id}><strong>{delivery.restaurantName}</strong><span>{delivery.deliveryAddress}</span><small>{delivery.orderSummary}</small><Pill>{delivery.status}</Pill><div className="button-row">{(['PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] as DeliveryStatus[]).map((next) => <button key={next} onClick={() => status(delivery.id, next)}>{next}</button>)}</div></article>)}
        </div>
      </section>
    </main>
  );
}

function AdminPage({ kind }: { kind: 'usuarios' | 'reclamos' | 'cupones' | 'reportes' | 'comisiones' }) {
  const action = useAction();
  const [items, setItems] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [commission, setCommission] = useState<CommissionConfig | null>(null);
  async function load() {
    if (kind === 'usuarios') setItems(await api<User[]>('/users'));
    if (kind === 'reclamos') setItems(await api<Complaint[]>('/complaints'));
    if (kind === 'cupones') setItems(await api<Coupon[]>('/coupons'));
    if (kind === 'reportes') {
      setSummary(await api<AdminSummary>('/reports/admin-summary'));
      setItems(await api<MostOrderedRestaurant[]>('/reports/restaurants/most-ordered'));
    }
    if (kind === 'comisiones') setCommission(await api<CommissionConfig>('/admin/commissions'));
  }
  useEffect(() => {
    action.run(load);
  }, [kind]);
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Admin: {kind}</h1>
        <Notice {...action} />
        {summary && <div className="metric-grid"><div><span>Usuarios</span><strong>{summary.totalUsers ?? '-'}</strong></div><div><span>Ordenes</span><strong>{summary.totalOrders ?? '-'}</strong></div><div><span>Revenue</span><strong>{money(summary.totalRevenue)}</strong></div></div>}
        {commission && <pre className="json-card">{JSON.stringify(commission, null, 2)}</pre>}
        {items.map((item, index) => <pre className="json-card" key={index}>{JSON.stringify(item, null, 2)}</pre>)}
      </section>
    </main>
  );
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
        <Route path="/restaurante/*" element={<RequireRole user={user} roles={['RESTAURANT']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<RestaurantHome />} /><Route path="perfil" element={<RestaurantHome />} /><Route path="menu" element={<RestaurantProductsPage />} /><Route path="productos" element={<RestaurantProductsPage />} /><Route path="horarios" element={<RestaurantHome />} /><Route path="pedidos" element={<RestaurantOrdersPage />} /><Route path="pedidos/:id" element={<RestaurantOrdersPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/repartidor/*" element={<RequireRole user={user} roles={['DELIVERY']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<DeliveryHome />} /><Route path="entregas" element={<DeliveryOrdersPage />} /><Route path="entregas/:id" element={<DeliveryOrdersPage />} /><Route path="historial" element={<DeliveryOrdersPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole user={user} roles={['ADMIN']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<DashboardCards title="Admin" cards={['Usuarios', 'Reclamos', 'Cupones', 'Reportes']} />} /><Route path="usuarios" element={<AdminPage kind="usuarios" />} /><Route path="reclamos" element={<AdminPage kind="reclamos" />} /><Route path="cupones" element={<AdminPage kind="cupones" />} /><Route path="reportes" element={<AdminPage kind="reportes" />} /><Route path="comisiones" element={<AdminPage kind="comisiones" />} /></Routes></AppLayout></RequireRole>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
