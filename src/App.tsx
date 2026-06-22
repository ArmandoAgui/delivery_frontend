import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { api, authApi, DeliveryApiError, uploadFile } from './api/client';
import { getAccessToken, getStoredUser } from './api/session';
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

let leafletScriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement) => LeafletMap;
      tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
      marker: (latLng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
    };
  }
}

type LeafletMap = {
  setView: (latLng: [number, number], zoom: number) => LeafletMap;
  on: (eventName: string, callback: (event: { latlng: { lat: number; lng: number } }) => void) => void;
  invalidateSize: () => void;
  remove: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (latLng: [number, number]) => void;
  on: (eventName: string, callback: (event: { target: { getLatLng: () => { lat: number; lng: number } } }) => void) => void;
};

function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (leafletScriptPromise) return leafletScriptPromise;
  leafletScriptPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-delivery-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.dataset.deliveryLeaflet = 'true';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Leaflet'));
    document.head.appendChild(script);
  });
  return leafletScriptPromise;
}

function money(value?: number): string {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function ratingLabel(value?: number, count?: number): string {
  if (!value || !count) return 'Sin calificaciones';
  return `★ ${Number(value).toFixed(1)} (${count})`;
}

function isPeakDemandNow(date = new Date()): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes >= 11 * 60 && minutes < 13 * 60) || (minutes >= 17 * 60 && minutes < 19 * 60);
}

function PeakDemandBanner() {
  if (!isPeakDemandNow()) return null;
  return (
    <p className="notice peak">
      Horario pico activo. Revisa constantemente los pedidos y mantén actualizado el tiempo de preparación.
    </p>
  );
}

function moneyNumber(value?: number | string): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMoneyText(value: string): string {
  let cleaned = value.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  const [integerPart, decimalPart] = cleaned.split('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || (cleaned.startsWith('.') ? '0' : '');
  if (decimalPart !== undefined) {
    return `${normalizedInteger || '0'}.${decimalPart.slice(0, 2)}`;
  }
  return normalizedInteger;
}

function parseMoneyInput(value: string, fieldName: string, options: { allowZero?: boolean; max?: number } = {}): number {
  if (!value.trim()) {
    throw new Error(`${fieldName} es requerido.`);
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || (!options.allowZero && amount <= 0)) {
    throw new Error(`${fieldName} debe ser ${options.allowZero ? 'mayor o igual a 0' : 'mayor a 0'}.`);
  }
  if (options.max !== undefined && amount > options.max) {
    throw new Error(`${fieldName} no puede ser mayor a ${options.max}.`);
  }
  return amount;
}

function MoneyInput({
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      disabled={disabled}
      inputMode="decimal"
      min={min}
      max={max}
      placeholder={placeholder}
      step="0.01"
      type="text"
      value={value}
      onChange={(event) => onChange(normalizeMoneyText(event.target.value))}
      onBlur={() => onChange(value.trim() === '' ? '' : normalizeMoneyText(value))}
    />
  );
}

function assetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function dateTimeLocal(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function shortDate(value?: string): string {
  return value ? new Date(value).toLocaleString() : '-';
}

const defaultCoordinates = { latitude: 13.6929, longitude: -89.2182 };

type AddressFormState = {
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  defaultAddress: boolean;
};

type CoordinateValue = Pick<AddressFormState, 'latitude' | 'longitude'>;

function emptyAddressForm(overrides: Partial<AddressFormState> = {}): AddressFormState {
  return {
    label: 'Casa',
    streetAddress: '',
    city: 'San Salvador',
    state: 'San Salvador',
    latitude: defaultCoordinates.latitude,
    longitude: defaultCoordinates.longitude,
    defaultAddress: true,
    ...overrides,
  };
}

function addressToForm(address: Address): AddressFormState {
  return emptyAddressForm({
    label: address.label ?? 'Casa',
    streetAddress: address.streetAddress ?? '',
    city: address.city ?? 'San Salvador',
    state: address.state ?? 'San Salvador',
    latitude: address.latitude ?? defaultCoordinates.latitude,
    longitude: address.longitude ?? defaultCoordinates.longitude,
    defaultAddress: address.defaultAddress ?? false,
  });
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

function paymentLabel(order: { paymentStatus?: string; refundStatus?: string }) {
  if (order.paymentStatus === 'REFUNDED') return 'Reembolso a tarjeta (Simulacion)';
  if (order.paymentStatus === 'PAID') return 'Pagado (Simulacion)';
  return order.paymentStatus ?? order.refundStatus ?? '-';
}

function IconButton({
  label,
  icon,
  danger,
  onClick,
  disabled,
}: {
  label: string;
  icon: 'edit' | 'trash' | 'pause' | 'play' | 'image' | 'plus' | 'tag' | 'download';
  danger?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const paths: Record<typeof icon, ReactNode> = {
    edit: <path d="M4 15.5V20h4.5L19 9.5 14.5 5 4 15.5Zm12-12 4.5 4.5" />,
    trash: <path d="M4 7h16M9 7V5h6v2m-8 3 1 10h8l1-10" />,
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="M8 5v14l11-7-11-7Z" />,
    image: <path d="M4 6h16v12H4zM7 15l3-3 2 2 3-4 3 5M8 9h.01" />,
    plus: <path d="M12 5v14M5 12h14" />,
    tag: <path d="M4 11V5h6l10 10-6 6L4 11Zm4-3h.01" />,
    download: <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" />,
  };
  return (
    <button className={`icon-button ${danger ? 'danger' : ''}`} type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {paths[icon]}
      </svg>
      <span>{label}</span>
    </button>
  );
}

function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function ImageUploader({
  title,
  imageUrl,
  disabled,
  onUpload,
  onDelete,
}: {
  title: string;
  imageUrl?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const action = useAction();
  const inputId = `image-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const [preview, setPreview] = useState<string | undefined>(assetUrl(imageUrl));

  useEffect(() => {
    setPreview(assetUrl(imageUrl));
  }, [imageUrl]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    await action.run(async () => {
      await onUpload(file);
      URL.revokeObjectURL(localPreview);
    }, 'Imagen optimizada y guardada.');
  }

  async function remove() {
    if (!onDelete) return;
    await action.run(async () => {
      await onDelete();
      setPreview(undefined);
    }, 'Imagen eliminada.');
  }

  return (
    <div className="image-uploader">
      <div className="image-preview">
        {preview ? <img src={preview} alt={title} /> : <span>Sin imagen</span>}
      </div>
      <div className="image-uploader-actions">
        <strong>{title}</strong>
        <small>JPG, PNG o WEBP. Se optimiza automaticamente.</small>
        <label className={`button-link file-button ${disabled ? 'disabled' : ''}`} htmlFor={inputId}>Cambiar imagen</label>
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={upload} />
        {onDelete && imageUrl && <button className="danger" type="button" disabled={disabled} onClick={remove}>Eliminar imagen</button>}
      </div>
      <Notice {...action} />
    </div>
  );
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Pedido seleccionado</p>
            <h2>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="ghost" type="button" onClick={onClose}>Cerrar</button>
        </div>
        {children}
      </section>
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
    password: '',
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
              <label>Email<input autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            </>
          ) : (
            <>
              <label>Nombre<input value={register.firstName} onChange={(event) => setRegister((current) => ({ ...current, firstName: event.target.value }))} /></label>
              <label>Apellido<input value={register.lastName} onChange={(event) => setRegister((current) => ({ ...current, lastName: event.target.value }))} /></label>
              <label>Email<input autoComplete="email" type="email" value={register.email} onChange={(event) => setRegister((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Telefono<input value={register.phone} onChange={(event) => setRegister((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Password<input autoComplete="new-password" type="password" value={register.password} onChange={(event) => setRegister((current) => ({ ...current, password: event.target.value }))} /></label>
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
  const homePath = roleHome[user.role];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <Link className="brand-link" to={homePath} aria-label="Volver al dashboard">
            <p className="eyebrow">Delivery</p>
            <h2>{user.role}</h2>
          </Link>
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

function CoordinatePicker({
  value,
  onChange,
}: {
  value: CoordinateValue;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !mapRef.current || !window.L) return;
        const map = window.L.map(mapRef.current).setView([value.latitude, value.longitude], 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        const marker = window.L.marker([value.latitude, value.longitude], { draggable: true }).addTo(map);
        map.on('click', (event) => {
          onChange(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
        });
        marker.on('dragend', (event) => {
          const latLng = event.target.getLatLng();
          onChange(Number(latLng.lat.toFixed(6)), Number(latLng.lng.toFixed(6)));
        });
        leafletMapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 80);
      })
      .catch(() => setMapFailed(true));
    return () => {
      cancelled = true;
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([value.latitude, value.longitude]);
    leafletMapRef.current?.setView([value.latitude, value.longitude], 15);
  }, [value.latitude, value.longitude]);

  return (
    <div className="map-picker">
      <div className="leaflet-map" ref={mapRef} />
      {mapFailed ? (
        <small>No se pudo cargar el mapa. Puedes escribir latitud y longitud manualmente.</small>
      ) : (
        <small>{mapReady ? 'Haz clic en el mapa o arrastra el pin para guardar el punto exacto.' : 'Cargando mapa...'}</small>
      )}
    </div>
  );
}

function AddressForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
}: {
  form: AddressFormState;
  onChange: (next: AddressFormState) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const update = (patch: Partial<AddressFormState>) => onChange({ ...form, ...patch });
  return (
    <div className="form-grid three">
      <label>Alias<input placeholder="Casa, trabajo, universidad" value={form.label} onChange={(event) => update({ label: event.target.value })} /></label>
      <label className="span-2">Direccion<input placeholder="Calle, colonia, numero" value={form.streetAddress} onChange={(event) => update({ streetAddress: event.target.value })} /></label>
      <label>Ciudad<input value={form.city} onChange={(event) => update({ city: event.target.value })} /></label>
      <label>Estado/departamento<input value={form.state} onChange={(event) => update({ state: event.target.value })} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={form.defaultAddress} onChange={(event) => update({ defaultAddress: event.target.checked })} /> Marcar como direccion principal</label>
      <div className="span-full"><CoordinatePicker value={form} onChange={(latitude, longitude) => update({ latitude, longitude })} /><small className="coordinate-readout">Punto seleccionado: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}</small></div>
      <div className="form-actions span-full"><button className="primary" onClick={onSubmit} disabled={!form.streetAddress || !form.city}>{submitLabel}</button></div>
    </div>
  );
}

function RestaurantsPage() {
  const action = useAction();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [nearby, setNearby] = useState(false);
  const [query, setQuery] = useState('');

  async function load(useNearby = false) {
    await action.run(async () => {
      const addressData = addresses.length ? addresses : await api<Address[]>('/users/me/addresses').catch(() => []);
      if (!addresses.length) setAddresses(addressData);
      const defaultAddress = addressData.find((address) => address.defaultAddress) ?? addressData[0];
      const latitude = defaultAddress?.latitude ?? defaultCoordinates.latitude;
      const longitude = defaultAddress?.longitude ?? defaultCoordinates.longitude;
      setNearby(useNearby);
      setRestaurants(await api<Restaurant[]>(useNearby ? `/restaurants/nearby?lat=${latitude}&lng=${longitude}&radiusKm=12` : '/restaurants'));
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
        {nearby && <p className="notice neutral">Busqueda cercana usando {addresses[0] ? 'tu direccion principal' : 'coordenadas demo de San Salvador'}.</p>}
        <div className="search-row">
          <input placeholder="Buscar por nombre, ciudad o descripcion" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button onClick={search}>Buscar</button>
        </div>
        <Notice {...action} />
        <div className="restaurant-grid">
          {restaurants.map((restaurant) => (
            <Link className="restaurant-card" key={restaurant.id} to={`/cliente/restaurantes/${restaurant.id}`}>
              <div className="card-media">
                {restaurant.imageUrl ? <img src={assetUrl(restaurant.imageUrl)} alt={restaurant.name} /> : <span>{restaurant.name.slice(0, 1)}</span>}
              </div>
              <strong>{restaurant.name}</strong>
              <span>{restaurant.city}</span>
              <small>{ratingLabel(restaurant.averageRating, restaurant.reviewCount)}</small>
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
  const [cart, setCart] = useState<Cart | null>(null);
  const [productQuery, setProductQuery] = useState('');

  async function loadMenu() {
    const [restaurantData, productData, cartData] = await Promise.all([
        api<Restaurant>(`/restaurants/${id}`),
        api<Product[]>(`/products/restaurant/${id}`),
        api<Cart>('/cart').catch(() => null),
    ]);
    setRestaurant(restaurantData);
    setProducts(productData);
    setCart(cartData);
  }

  useEffect(() => {
    action.run(loadMenu);
  }, [id]);

  async function searchProducts() {
    await action.run(async () => {
      const results = await api<Product[]>(`/products/search?q=${encodeURIComponent(productQuery)}`);
      setProducts(results.filter((product) => product.restaurantId === id));
    });
  }

  async function add(product: Product) {
    await action.run(async () => {
      if (!restaurant?.open) {
        throw new Error('Este restaurante esta cerrado en este momento.');
      }
      if (product.available === false) {
        throw new Error('Este producto no esta disponible.');
      }
      if (cart?.items?.length && cart.restaurantId && cart.restaurantId !== restaurant.id) {
        throw new Error(`Tu carrito ya tiene productos de ${cart.restaurantName ?? 'otro restaurante'}. Vacialo para iniciar un pedido nuevo.`);
      }
      setCart(await api<Cart>('/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1 } }));
    }, `${product.name} agregado.`);
  }

  async function clearCurrentCart() {
    await action.run(async () => {
      await api('/cart', { method: 'DELETE' });
      setCart(await api<Cart>('/cart').catch(() => null));
    }, 'Carrito vaciado. Ya puedes iniciar un pedido nuevo.');
  }

  const hasOtherRestaurantCart = !!cart?.items?.length && !!restaurant && !!cart.restaurantId && cart.restaurantId !== restaurant.id;

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{restaurant?.city ?? 'Restaurante'}</p>
            <h1>{restaurant?.name ?? 'Menu'}</h1>
            {restaurant?.description && <span>{restaurant.description}</span>}
            {restaurant && <small>{ratingLabel(restaurant.averageRating, restaurant.reviewCount)}</small>}
          </div>
          {restaurant?.imageUrl && <img className="header-image" src={assetUrl(restaurant.imageUrl)} alt={restaurant.name} />}
          <Pill>{restaurant?.open ? 'Abierto' : 'Fuera de horario'}</Pill>
        </div>
        <div className="search-row">
          <input placeholder="Buscar producto o categoria" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
          <button onClick={searchProducts}>Buscar</button>
          <button onClick={() => action.run(async () => setProducts(await api<Product[]>(`/products/restaurant/${id}`)))}>Ver menu</button>
        </div>
        <Notice {...action} />
        {restaurant && !restaurant.open && (
          <p className="notice error">Este restaurante esta cerrado en este momento. Puedes ver el menu, pero no se pueden agregar productos ni confirmar pedidos.</p>
        )}
        {hasOtherRestaurantCart && (
          <p className="notice neutral">
            Tu carrito tiene productos de {cart?.restaurantName ?? 'otro restaurante'}. Para pedir aqui, primero <button className="link-button" type="button" onClick={clearCurrentCart}>vacia el carrito</button>.
          </p>
        )}
        <div className="cards">
          {products.map((product) => (
            <article className="item-card" key={product.id}>
              <div className="product-thumb">
                {product.imageUrl ? <img src={assetUrl(product.imageUrl)} alt={product.name} /> : <span>Platillo</span>}
              </div>
              <div><strong>{product.name}</strong><span>{product.description}</span></div>
              <div className="item-actions">
                <b>{money(product.price)}</b>
                <button disabled={!restaurant?.open || product.available === false || hasOtherRestaurantCart} onClick={() => add(product)}>
                  {restaurant?.open ? 'Agregar' : 'Cerrado'}
                </button>
              </div>
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
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null);
  const [form, setForm] = useState({
    addressId: '',
    tipAmount: '',
    couponCode: '',
    notes: '',
    useDigitalWallet: false,
  });
  const [addressForm, setAddressForm] = useState(emptyAddressForm());
  const [payment, setPayment] = useState({ holderName: '', cardNumber: '', expiry: '', cvv: '' });

  async function load() {
    const [cartData, addressData, loyaltyData] = await Promise.all([
      api<Cart>('/cart').catch(() => ({ subtotal: 0, items: [] })),
      api<Address[]>('/users/me/addresses'),
      api<LoyaltyBalance>('/loyalty').catch(() => null),
    ]);
    setCart(cartData);
    setAddresses(addressData);
    setLoyalty(loyaltyData);
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

  async function clear() {
    await action.run(async () => {
      await api('/cart', { method: 'DELETE' });
      await load();
    }, 'Carrito vaciado.');
  }

  function validatePayment() {
    const digits = payment.cardNumber.replace(/\D/g, '');
    if (!payment.holderName.trim()) throw new Error('Ingresa el nombre del titular.');
    if (digits.length < 12 || digits.length > 19) throw new Error('El numero de tarjeta debe tener entre 12 y 19 digitos.');
    if (!payment.expiry.trim()) throw new Error('Ingresa la fecha de expiracion.');
    if (payment.expiry < currentMonth()) throw new Error('La tarjeta no puede estar vencida.');
    if (!/^\d{3,4}$/.test(payment.cvv)) throw new Error('El CVV debe tener 3 o 4 digitos.');
  }

  async function createOrder() {
    await action.run(async () => {
      validatePayment();
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: {
          deliveryAddressId: form.addressId,
          tipAmount: parseMoneyInput(form.tipAmount || '0', 'Propina', { allowZero: true }),
          couponCode: form.couponCode.trim() || undefined,
          notes: form.notes.trim() || undefined,
          useLoyaltyPoints: false,
          useDigitalWallet: form.useDigitalWallet,
        },
      });
      navigate(`/cliente/tracking/${order.id}`);
    }, 'Pago simulado aprobado. Pedido creado.');
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

  const pointsBalance = loyalty?.pointsBalance ?? loyalty?.points ?? 0;
  const pointsCreditBalance = moneyNumber(loyalty?.pointsCreditBalance ?? pointsBalance * 0.01);
  const digitalCreditBalance = moneyNumber(loyalty?.creditBalance);
  const subtotal = moneyNumber(cart?.subtotal);
  const estimatedDeliveryFee = moneyNumber(cart?.estimatedDeliveryFee);
  const tipAmount = moneyNumber(form.tipAmount);
  const estimatedTotalBeforeCredits = subtotal + estimatedDeliveryFee + tipAmount;
  const estimatedCreditApplied = form.useDigitalWallet ? Math.min(digitalCreditBalance, estimatedTotalBeforeCredits) : 0;
  const total = Math.max(estimatedTotalBeforeCredits - estimatedCreditApplied, 0);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div><p className="eyebrow">Cliente</p><h1>{checkout ? 'Checkout' : 'Carrito'}</h1></div>
          {!checkout && !!cart?.items.length && <button className="danger" onClick={clear}>Vaciar carrito</button>}
        </div>
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
                    <AddressForm form={addressForm} onChange={setAddressForm} onSubmit={createAddress} submitLabel="Crear direccion" />
                  </div>
                )}
                <label>Propina<MoneyInput min={0} placeholder="0.00" value={form.tipAmount} onChange={(value) => setForm((current) => ({ ...current, tipAmount: value }))} /></label>
                <label>Cupon opcional<input placeholder="Ej: DEV10" value={form.couponCode} onChange={(event) => setForm((current) => ({ ...current, couponCode: event.target.value }))} /></label>
                <label className="checkbox-label loyalty-option">
                  <input
                    type="checkbox"
                    checked={form.useDigitalWallet}
                    disabled={digitalCreditBalance <= 0}
                    onChange={(event) => setForm((current) => ({ ...current, useDigitalWallet: event.target.checked }))}
                  />
                  Usar mi saldo digital ({money(digitalCreditBalance)})
                </label>
                <p className="notice neutral span-2">
                  Saldo digital disponible: {money(digitalCreditBalance)}. Tus puntos actuales equivalen a {money(pointsCreditBalance)} si los canjeas desde Fidelidad.
                </p>
                {form.useDigitalWallet && (
                  <p className="notice neutral span-2">
                    Se aplicara todo tu saldo digital disponible, hasta cubrir el total. Credito estimado aplicado: {money(estimatedCreditApplied)}.
                  </p>
                )}
                <div className="checkout-summary span-2">
                  <h2>Resumen dinamico</h2>
                  <div><span>Subtotal productos</span><strong>{money(subtotal)}</strong></div>
                  <div><span>Envio estimado</span><strong>{money(estimatedDeliveryFee)}</strong></div>
                  <div><span>Propina</span><strong>{money(tipAmount)}</strong></div>
                  {estimatedCreditApplied > 0 && <div><span>Saldo digital</span><strong>-{money(estimatedCreditApplied)}</strong></div>}
                </div>
                <label>Notas<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                <div className="panel nested-panel span-2">
                  <h2>Pago simulado con tarjeta</h2>
                  <p className="notice neutral">Demo academica: se valida localmente y no se guarda numero de tarjeta ni CVV.</p>
                  <div className="form-grid three">
                    <label className="span-2">Titular<input value={payment.holderName} onChange={(event) => setPayment((current) => ({ ...current, holderName: event.target.value }))} /></label>
                    <label>Numero<input inputMode="numeric" placeholder="4242 4242 4242 4242" value={payment.cardNumber} onChange={(event) => setPayment((current) => ({ ...current, cardNumber: event.target.value }))} /></label>
                    <label>Expiracion<input type="month" min={currentMonth()} value={payment.expiry} onChange={(event) => setPayment((current) => ({ ...current, expiry: event.target.value }))} /></label>
                    <label>CVV<input inputMode="numeric" value={payment.cvv} onChange={(event) => setPayment((current) => ({ ...current, cvv: event.target.value.replace(/\\D/g, '').slice(0, 4) }))} /></label>
                  </div>
                </div>
                <div className="total-row"><span>Total estimado con creditos seleccionados</span><strong>{money(total)}</strong></div>
                <button className="primary" onClick={createOrder} disabled={!form.addressId}>Pagar y confirmar pedido</button>
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
  const [modal, setModal] = useState<{ type: 'complaint' | 'review'; order: Order } | null>(null);
  const [complaintForm, setComplaintForm] = useState({ subject: '', description: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  async function load() {
    setOrders(await api<Order[]>('/orders/my-history'));
  }

  function openComplaint(order: Order) {
    setComplaintForm({ subject: '', description: '' });
    setModal({ type: 'complaint', order });
  }

  function openReview(order: Order) {
    setReviewForm({ rating: 5, comment: '' });
    setModal({ type: 'review', order });
  }

  async function downloadInvoice(order: Order) {
    await action.run(async () => {
      const token = getAccessToken();
      const response = await fetch(`/api/orders/${order.id}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new DeliveryApiError('No se pudo descargar la factura.', response.status);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factura-${order.id.slice(0, 8)}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  async function submitComplaint() {
    if (!modal || modal.type !== 'complaint') return;
    await action.run(async () => {
      await api<Complaint>('/complaints', {
        method: 'POST',
        body: {
          orderId: modal.order.id,
          subject: complaintForm.subject,
          description: complaintForm.description,
        },
      });
      setModal(null);
      await load();
    }, 'Reclamo creado.');
  }

  async function submitReview() {
    if (!modal || modal.type !== 'review') return;
    await action.run(async () => {
      await api('/reviews', {
        method: 'POST',
        body: {
          orderId: modal.order.id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment || undefined,
        },
      });
      setModal(null);
      await load();
    }, 'Calificacion enviada.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <>
      <OrderTable
        title="Mis pedidos"
        orders={orders}
        action={action}
        basePath="/cliente"
        renderActions={(order) => (
          <>
            <IconButton label="Descargar factura" icon="download" onClick={() => downloadInvoice(order)} />
            {order.status === 'DELIVERED' ? (
              <>
                <button type="button" onClick={() => openComplaint(order)}>Reclamar</button>
                <button type="button" onClick={() => openReview(order)}>Calificar</button>
              </>
            ) : (
              <small>Reclamo y calificacion disponibles al entregar.</small>
            )}
          </>
        )}
      />
      {modal?.type === 'complaint' && (
        <Modal
          title="Crear reclamo"
          subtitle={`Pedido ${modal.order.id.slice(0, 8)} · ${modal.order.restaurantName ?? 'Restaurante'} · ${money(modal.order.totalAmount)}`}
          onClose={() => setModal(null)}
        >
          <div className="form-grid">
            <label>Asunto<input value={complaintForm.subject} onChange={(event) => setComplaintForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Ej: Problema con mi pedido" /></label>
            <label>Descripcion<textarea value={complaintForm.description} onChange={(event) => setComplaintForm((current) => ({ ...current, description: event.target.value }))} placeholder="Cuéntanos que paso con este pedido" /></label>
            <div className="form-actions">
              <button className="ghost" type="button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary" type="button" onClick={submitComplaint} disabled={!complaintForm.subject || !complaintForm.description}>Crear reclamo</button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.type === 'review' && (
        <Modal
          title="Calificar restaurante y repartidor"
          subtitle={`Pedido ${modal.order.id.slice(0, 8)} · ${modal.order.restaurantName ?? 'Restaurante'} · ${money(modal.order.totalAmount)}`}
          onClose={() => setModal(null)}
        >
          <div className="form-grid">
            <label>Puntaje<select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)} ({rating})</option>)}</select></label>
            <label>Comentario opcional<textarea value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Comparte como estuvo la comida y la entrega" /></label>
            <div className="form-actions">
              <button className="ghost" type="button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary" type="button" onClick={submitReview}>Enviar calificacion</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
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
            {tracking.status === 'NO_DRIVER_AVAILABLE' && (
              <p className="notice error">
                No fue posible encontrar un repartidor. El pedido fue cancelado por esa razon y el pago fue reembolsado de forma simulada.
              </p>
            )}
            {tracking.status === 'REJECTED' && tracking.paymentStatus === 'REFUNDED' && (
              <p className="notice error">
                Todos los repartidores disponibles rechazaron la solicitud. El pedido fue rechazado y el reembolso sera enviado a tu tarjeta de forma simulada.
              </p>
            )}
            {tracking.statusReason && tracking.status !== 'NO_DRIVER_AVAILABLE' && !(tracking.status === 'REJECTED' && tracking.paymentStatus === 'REFUNDED') && <p className="notice neutral">{tracking.statusReason}</p>}
            {tracking.paymentStatus && <small>Pago: {paymentLabel(tracking)}</small>}
          </div>
        )}
      </section>
    </main>
  );
}

function OrderTable({
  title,
  orders,
  action,
  basePath,
  renderActions,
}: {
  title: string;
  orders: Order[];
  action: ReturnType<typeof useAction>;
  basePath: string;
  renderActions?: (order: Order) => ReactNode;
}) {
  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>{title}</h1>
        <Notice {...action} />
        <div className="table-wrap">
          <table><thead><tr><th>Pedido</th><th>Restaurante</th><th>Estado</th><th>Pago</th><th>Total</th><th>ETA</th><th>Acciones</th></tr></thead><tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id.slice(0, 8)}<br /><small>{shortDate(order.createdAt)}</small></td>
                <td>{order.restaurantName ?? '-'}</td>
                <td>
                  <Pill>{order.status}</Pill>
                  {order.status === 'NO_DRIVER_AVAILABLE' && <><br /><small>No fue posible encontrar repartidor.</small></>}
                  {order.status === 'REJECTED' && order.paymentStatus === 'REFUNDED' && <><br /><small>Reembolso a tarjeta en proceso.</small></>}
                  {order.statusReason && order.status !== 'NO_DRIVER_AVAILABLE' && !(order.status === 'REJECTED' && order.paymentStatus === 'REFUNDED') && <><br /><small>{order.statusReason}</small></>}
                </td>
                <td>{paymentLabel(order)}</td>
                <td>{money(order.totalAmount)}</td>
                <td>{order.estimatedDeliveryMinutes ?? '-'} min</td>
                <td><div className="button-row table-actions"><Link to={`${basePath}/tracking/${order.id}`}>Tracking</Link>{renderActions?.(order)}</div></td>
              </tr>
            ))}
          </tbody></table>
        </div>
        {!orders.length && <Empty title="Sin pedidos" detail="Cuando completes una compra, aqui podras rastrearla, reclamarla o calificarla." />}
      </section>
    </main>
  );
}

function CustomerAddressesPage() {
  const action = useAction();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAddressForm());

  async function load() {
    setAddresses(await api<Address[]>('/users/me/addresses'));
  }

  async function save() {
    await action.run(async () => {
      if (editingId) {
        await api<Address>(`/users/me/addresses/${editingId}`, { method: 'PUT', body: form });
      } else {
        await api<Address>('/users/me/addresses', { method: 'POST', body: form });
      }
      setEditingId(null);
      setForm(emptyAddressForm({ defaultAddress: !addresses.length }));
      await load();
    }, editingId ? 'Direccion actualizada.' : 'Direccion creada.');
  }

  async function remove(address: Address) {
    if (!window.confirm(`Eliminar direccion ${address.label}?`)) return;
    await action.run(async () => {
      await api(`/users/me/addresses/${address.id}`, { method: 'DELETE' });
      await load();
    }, 'Direccion eliminada.');
  }

  function edit(address: Address) {
    setEditingId(address.id);
    setForm(addressToForm(address));
  }

  async function makeDefault(address: Address) {
    await action.run(async () => {
      await api<Address>(`/users/me/addresses/${address.id}`, { method: 'PUT', body: { ...addressToForm(address), defaultAddress: true } });
      await load();
    }, 'Direccion principal actualizada.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Cliente</p><h1>Direcciones</h1></div><Pill>PostGIS</Pill></div>
        <Notice {...action} />
        <AddressForm form={form} onChange={setForm} onSubmit={save} submitLabel={editingId ? 'Guardar direccion' : 'Crear direccion'} />
      </section>
      <section className="panel">
        <h2>Mis direcciones</h2>
        <div className="cards">
          {addresses.map((address) => (
            <article className="item-card" key={address.id}>
              <div>
                <strong>{address.label}</strong>
                <span>{address.streetAddress}</span>
                <small>{address.city}, El Salvador</small>
                <small>{address.latitude}, {address.longitude}</small>
              </div>
              <div className="button-row">
                {address.defaultAddress ? <Pill>Principal</Pill> : <button onClick={() => makeDefault(address)}>Principal</button>}
                <button onClick={() => edit(address)}>Editar</button>
                <button className="danger" onClick={() => remove(address)}>Eliminar</button>
              </div>
            </article>
          ))}
          {!addresses.length && <Empty title="Sin direcciones" detail="Crea una direccion con coordenadas para calcular envio por distancia." />}
        </div>
      </section>
    </main>
  );
}

function CustomerProfilePage() {
  const action = useAction();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });

  async function load() {
    const user = await api<User>('/users/me');
    setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '', password: '' });
  }

  async function save() {
    await action.run(async () => {
      await api<User>('/users/me', {
        method: 'PUT',
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password || undefined,
        },
      });
      setForm((current) => ({ ...current, password: '' }));
    }, 'Perfil actualizado.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header"><div><p className="eyebrow">Cliente</p><h1>Perfil</h1></div><Pill>CUSTOMER</Pill></div>
        <Notice {...action} />
        <div className="form-grid three">
          <label>Nombre<input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
          <label>Apellido<input value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Telefono<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label>Nueva password opcional<input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
          <button className="primary" onClick={save}>Guardar perfil</button>
        </div>
      </section>
    </main>
  );
}

function CustomerLoyaltyPage() {
  const action = useAction();
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null);

  async function load() {
    setLoyalty(await api<LoyaltyBalance>('/loyalty'));
  }

  useEffect(() => {
    action.run(load);
  }, []);

  async function redeemAllPoints() {
    if (pointsBalance <= 0) return;
    await action.run(async () => {
      setLoyalty(await api<LoyaltyBalance>('/loyalty/redeem', {
        method: 'POST',
        body: { points: pointsBalance },
      }));
    }, 'Puntos canjeados como saldo digital.');
  }

  const pointsBalance = loyalty?.pointsBalance ?? loyalty?.points ?? 0;
  const pointsCreditBalance = moneyNumber(loyalty?.pointsCreditBalance ?? pointsBalance * 0.01);
  const digitalCreditBalance = moneyNumber(loyalty?.creditBalance);
  const totalAvailableCredit = moneyNumber(loyalty?.totalAvailableCredit ?? digitalCreditBalance + pointsCreditBalance);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Cliente</p><h1>Fidelidad</h1></div><Pill>Beneficios</Pill></div>
        <Notice {...action} />
        <div className="metric-grid compact">
          <div><span>Puntos disponibles</span><strong>{pointsBalance}</strong></div>
          <div><span>Valor canjeable</span><strong>{money(pointsCreditBalance)}</strong></div>
          <div><span>Saldo digital</span><strong>{money(digitalCreditBalance)}</strong></div>
          <div><span>Total potencial</span><strong>{money(totalAvailableCredit)}</strong></div>
          <div><span>Equivalencia</span><strong>1 punto = $0.01</strong></div>
        </div>
        <p className="notice neutral">
          El saldo digital junta reembolsos aprobados y puntos que decidas canjear. En checkout puedes aplicar todo el saldo disponible, sin uso parcial manual.
        </p>
        <div className="button-row">
          <button className="primary" disabled={pointsBalance <= 0} onClick={redeemAllPoints}>Canjear todos mis puntos</button>
          <Link className="button-link" to="/cliente/checkout">Usar saldo en mi proxima compra</Link>
        </div>
      </section>
      <section className="panel">
        <h2>Historial</h2>
        <div className="cards">
          {(loyalty?.transactions ?? []).map((transaction) => {
            const transactionType = transaction.transactionType ?? transaction.type ?? 'MOVIMIENTO';
            const creditAmount = moneyNumber(transaction.creditAmount);
            return (
              <article className="item-card" key={transaction.id}>
                <div><strong>{transactionType}</strong><span>{transaction.description}</span><small>{shortDate(transaction.createdAt)}</small></div>
                <div className="pill-stack">
                  <Pill>{transaction.points > 0 ? '+' : ''}{transaction.points} pts</Pill>
                  {creditAmount !== 0 && <Pill>{creditAmount > 0 ? '+' : '-'}{money(Math.abs(creditAmount))}</Pill>}
                </div>
              </article>
            );
          })}
          {!(loyalty?.transactions ?? []).length && <Empty title="Sin movimientos" detail="Los puntos se acumulan cuando tus pedidos llegan a DELIVERED." />}
        </div>
      </section>
    </main>
  );
}

function CustomerComplaintsPage() {
  const action = useAction();
  const [orders, setOrders] = useState<Order[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ orderId: '', subject: '', description: '' });

  async function load() {
    const [orderData, complaintData] = await Promise.all([
      api<Order[]>('/orders/my-history'),
      api<Complaint[]>('/complaints'),
    ]);
    setOrders(orderData);
    setComplaints(complaintData);
    setForm((current) => ({ ...current, orderId: current.orderId || orderData.find((order) => order.status === 'DELIVERED')?.id || '' }));
  }

  async function submit() {
    await action.run(async () => {
      await api<Complaint>('/complaints', { method: 'POST', body: form });
      setForm({ orderId: '', subject: '', description: '' });
      await load();
    }, 'Reclamo creado.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Cliente</p><h1>Reclamos</h1></div><Pill>Pedidos entregados</Pill></div>
        <Notice {...action} />
        <div className="form-grid">
          <label>Pedido<select value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}>{orders.filter((order) => order.status === 'DELIVERED').map((order) => <option key={order.id} value={order.id}>{order.id.slice(0, 8)} · {money(order.totalAmount)}</option>)}</select></label>
          <label>Asunto<input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></label>
          <label>Descripcion<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <button className="primary" onClick={submit} disabled={!form.orderId || !form.subject || !form.description}>Crear reclamo</button>
        </div>
      </section>
      <section className="panel">
        <h2>Mis reclamos</h2>
        <div className="cards">
          {complaints.map((complaint) => (
            <article className="item-card" key={complaint.id}>
              <div><strong>{complaint.subject}</strong><span>{complaint.description}</span><small>Pedido {complaint.orderId.slice(0, 8)}</small></div>
              <Pill>{complaint.status}</Pill>
              {complaint.refund && <small>Reembolso: {complaint.refund.refundStatus ?? complaint.refund.status} · {money(complaint.refund.amount)}</small>}
            </article>
          ))}
          {!complaints.length && <Empty title="Sin reclamos" detail="Puedes reclamar un pedido entregado desde esta pantalla." />}
        </div>
      </section>
    </main>
  );
}

function CustomerReviewsPage() {
  const action = useAction();
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ orderId: '', rating: 5, comment: '' });

  async function load() {
    const orderData = await api<Order[]>('/orders/my-history');
    setOrders(orderData);
    setForm((current) => ({ ...current, orderId: current.orderId || orderData.find((order) => order.status === 'DELIVERED')?.id || '' }));
  }

  async function submit() {
    await action.run(async () => {
      await api('/reviews', { method: 'POST', body: { orderId: form.orderId, rating: Number(form.rating), comment: form.comment || undefined } });
      setForm({ orderId: '', rating: 5, comment: '' });
      await load();
    }, 'Calificacion enviada.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header"><div><p className="eyebrow">Cliente</p><h1>Calificaciones</h1></div><Pill>1 a 5</Pill></div>
        <Notice {...action} />
        <div className="form-grid">
          <label>Pedido entregado<select value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}>{orders.filter((order) => order.status === 'DELIVERED').map((order) => <option key={order.id} value={order.id}>{order.id.slice(0, 8)} · {money(order.totalAmount)}</option>)}</select></label>
          <label>Puntaje<select value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)} ({rating})</option>)}</select></label>
          <label>Comentario opcional<textarea value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} /></label>
          <button className="primary" onClick={submit} disabled={!form.orderId}>Enviar calificacion</button>
        </div>
      </section>
    </main>
  );
}

function RestaurantHome() {
  return (
    <>
      <PeakDemandBanner />
      <DashboardCards title="Restaurante" cards={['Crea tu establecimiento', 'Gestion del menu', 'Horarios', 'Pedidos recibidos', 'Confirmacion automatiza delivery']} />
    </>
  );
}

const dayNames = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

function todayDayOfWeek() {
  const javascriptDay = new Date().getDay();
  return javascriptDay === 0 ? 7 : javascriptDay;
}

function dayLabel(dayOfWeek: number) {
  return dayNames[dayOfWeek - 1] ?? `Dia ${dayOfWeek}`;
}

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

function completeWeeklySchedules(schedules: RestaurantSchedule[]) {
  const schedulesByDay = new Map(
    schedules
      .filter((schedule) => schedule.dayOfWeek >= 1 && schedule.dayOfWeek <= 7)
      .map((schedule) => [schedule.dayOfWeek, schedule])
  );

  return scheduleDefaults().map((defaultSchedule) => ({
    ...defaultSchedule,
    ...schedulesByDay.get(defaultSchedule.dayOfWeek),
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

  async function uploadRestaurantImage(file: File) {
    if (!restaurant) return;
    const updated = await uploadFile<Restaurant>(`/restaurants/${restaurant.id}/image`, file);
    fillForm(updated);
  }

  async function deleteRestaurantImage() {
    if (!restaurant) return;
    await api<void>(`/restaurants/${restaurant.id}/image`, { method: 'DELETE' });
    setRestaurant((current) => current ? { ...current, imageUrl: undefined } : current);
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Restaurante</p>
            <h1>{restaurant ? 'Perfil del establecimiento' : 'Crear establecimiento'}</h1>
            {restaurant && <small>{ratingLabel(restaurant.averageRating, restaurant.reviewCount)}</small>}
          </div>
          {restaurant && <Pill>{restaurant.open ? 'Abierto ahora' : 'Cerrado ahora'}</Pill>}
        </div>
        <PeakDemandBanner />
        <Notice {...action} />
        <ImageUploader
          title="Imagen del restaurante"
          imageUrl={restaurant?.imageUrl}
          disabled={!restaurant}
          onUpload={uploadRestaurantImage}
          onDelete={restaurant?.imageUrl ? deleteRestaurantImage : undefined}
        />
        <div className="form-grid three">
          <label>Nombre<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label>Telefono<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label className="span-2">Descripcion<input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <label>Ciudad<input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label>
          <label className="span-2">Direccion<input value={form.streetAddress} onChange={(event) => setForm((current) => ({ ...current, streetAddress: event.target.value }))} /></label>
          <label>Estado<input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} /></label>
          <div className="span-full"><CoordinatePicker value={form} onChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))} /><small className="coordinate-readout">Punto del restaurante: {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</small></div>
          <div className="form-actions span-full"><button className="primary" onClick={save}>{restaurant ? 'Guardar cambios' : 'Crear restaurante'}</button></div>
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
  type ProductForm = { name: string; description: string; price: string; categoryId: string; available: boolean };
  type CategoryForm = { name: string; description: string };
  const emptyProductForm = (categoryId = ''): ProductForm => ({ name: '', description: '', price: '', categoryId, available: true });
  const emptyCategoryForm = (): CategoryForm => ({ name: '', description: '' });
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm());
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm());
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit' | 'image'; product?: Product } | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ mode: 'create' | 'edit'; category?: Category } | null>(null);

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
      setProductForm((value) => ({ ...value, categoryId: value.categoryId || categoryData[0]?.id || '' }));
    }
  }

  function openCategoryModal(category?: Category) {
    setCategoryForm(category ? { name: category.name, description: category.description ?? '' } : emptyCategoryForm());
    setCategoryModal(category ? { mode: 'edit', category } : { mode: 'create' });
  }

  async function createCategory() {
    if (!restaurant) return;
    await action.run(async () => {
      await api<Category>('/categories', { method: 'POST', body: { ...categoryForm, restaurantId: restaurant.id } });
      setCategoryForm(emptyCategoryForm());
      setCategoryModal(null);
      await load();
    }, 'Categoria creada.');
  }

  async function updateCategory() {
    if (!categoryModal?.category) return;
    const category = categoryModal.category;
    await action.run(async () => {
      await api<Category>(`/categories/${category.id}`, { method: 'PUT', body: categoryForm });
      setCategoryModal(null);
      await load();
    }, 'Categoria actualizada.');
  }

  async function deactivateCategory(category: Category) {
    await action.run(async () => {
      await api<null>(`/categories/${category.id}/deactivate`, { method: 'PATCH' });
      await load();
    }, 'Categoria desactivada.');
  }

  function openProductModal(product?: Product) {
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description ?? '',
        price: normalizeMoneyText(String(product.price ?? '')),
        categoryId: String(product.categoryId ?? categories[0]?.id ?? ''),
        available: product.available ?? true,
      });
      setProductModal({ mode: 'edit', product });
      return;
    }
    setProductForm(emptyProductForm(categories[0]?.id ?? ''));
    setProductModal({ mode: 'create' });
  }

  async function create() {
    if (!restaurant) return;
    await action.run(async () => {
      const price = parseMoneyInput(productForm.price, 'Precio');
      await api<Product>('/products', { method: 'POST', body: { ...productForm, price, categoryId: Number(productForm.categoryId), restaurantId: restaurant.id } });
      setProductForm(emptyProductForm(categories[0]?.id ?? ''));
      setProductModal(null);
      await load();
    }, 'Producto creado.');
  }

  async function updateProduct() {
    if (!productModal?.product) return;
    const product = productModal.product;
    await action.run(async () => {
      const price = parseMoneyInput(productForm.price, 'Precio');
      await api<Product>(`/products/${product.id}`, {
        method: 'PUT',
        body: {
          ...productForm,
          price,
          categoryId: Number(productForm.categoryId),
        },
      });
      setProductModal(null);
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

  async function uploadProductImage(product: Product, file: File) {
    const updated = await uploadFile<Product>(`/products/${product.id}/image`, file);
    setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
    setProductModal((current) => current?.product?.id === updated.id ? { ...current, product: updated } : current);
  }

  async function deleteProductImage(product: Product) {
    await api<void>(`/products/${product.id}/image`, { method: 'DELETE' });
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, imageUrl: undefined } : item));
    setProductModal((current) => current?.product?.id === product.id ? { ...current, product: { ...current.product, imageUrl: undefined } } : current);
  }

  useEffect(() => {
    action.run(() => load());
  }, []);

  if (!restaurant && !action.loading) {
    return <main className="dashboard-grid"><section className="panel"><Empty title="Primero crea tu restaurante" detail="Ve a Perfil y registra tu establecimiento antes de gestionar menu." /><Link className="button-link" to="/restaurante/perfil">Crear restaurante</Link></section></main>;
  }

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Restaurante</p>
            <h1>Menu</h1>
            <span className="muted">Gestion de categorias y platillos de {restaurant?.name}</span>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => openCategoryModal()}>Nueva categoria</button>
            <button className="primary" type="button" onClick={() => openProductModal()} disabled={categories.length === 0}>Nuevo producto</button>
          </div>
        </div>
        <Notice {...action} />
        <div className="menu-toolbar">
          <strong>Categorias</strong>
          <div className="chip-row">
            {categories.map((category) => (
              <span className="chip category-chip" key={category.id}>
                {category.name}
                <IconButton label="Editar categoria" icon="edit" onClick={() => openCategoryModal(category)} />
                <IconButton label="Desactivar categoria" icon="trash" danger onClick={() => deactivateCategory(category)} />
              </span>
            ))}
            {categories.length === 0 && <small className="muted">Crea una categoria antes de registrar productos.</small>}
          </div>
        </div>
        {products.length === 0 && <Empty title="Sin productos" detail="Crea categorias y luego agrega productos al menu." />}
        <div className="menu-list">
          {products.map((product) => (
            <article className="menu-item-card" key={product.id}>
              <div className="line-item-media">
                {product.imageUrl ? <img src={assetUrl(product.imageUrl)} alt={product.name} /> : <span>Sin imagen</span>}
              </div>
              <div className="menu-item-copy">
                <strong>{product.name}</strong>
                <span>{product.description || 'Sin descripcion'}</span>
                <small>{product.categoryName ?? 'Sin categoria'} · {money(product.price)}</small>
              </div>
              <Pill>{product.available ? 'Disponible' : 'Pausado'}</Pill>
              <div className="icon-actions">
                <IconButton label="Editar" icon="edit" onClick={() => openProductModal(product)} />
                <IconButton label="Imagen" icon="image" onClick={() => setProductModal({ mode: 'image', product })} />
                <IconButton label={product.available ? 'Pausar' : 'Activar'} icon={product.available ? 'pause' : 'play'} onClick={() => toggleAvailability(product)} />
                <IconButton label="Eliminar" icon="trash" danger onClick={() => deactivateProduct(product)} />
              </div>
            </article>
          ))}
        </div>
      </section>
      {categoryModal && (
        <Modal title={categoryModal.mode === 'create' ? 'Nueva categoria' : 'Editar categoria'} onClose={() => setCategoryModal(null)}>
          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); categoryModal.mode === 'create' ? createCategory() : updateCategory(); }}>
            <label>Nombre<input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>Descripcion<input value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <div className="button-row"><button className="primary">{categoryModal.mode === 'create' ? 'Crear categoria' : 'Guardar categoria'}</button><button className="ghost dark" type="button" onClick={() => setCategoryModal(null)}>Cancelar</button></div>
          </form>
        </Modal>
      )}
      {productModal && (
        <Modal title={productModal.mode === 'create' ? 'Nuevo producto' : productModal.mode === 'edit' ? 'Editar producto' : 'Imagen del producto'} subtitle={productModal.product?.name} onClose={() => setProductModal(null)}>
          {productModal.mode === 'image' && productModal.product ? (
            <ImageUploader
              title={`Imagen ${productModal.product.name}`}
              imageUrl={productModal.product.imageUrl}
              onUpload={(file) => uploadProductImage(productModal.product!, file)}
              onDelete={productModal.product.imageUrl ? () => deleteProductImage(productModal.product!) : undefined}
            />
          ) : (
            <form className="form-grid three" onSubmit={(event) => { event.preventDefault(); productModal.mode === 'create' ? create() : updateProduct(); }}>
              <label>Nombre<input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Precio<MoneyInput min={0.01} placeholder="5.50" value={productForm.price} onChange={(value) => setProductForm((current) => ({ ...current, price: value }))} /></label>
              <label>Categoria<select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="span-full">Descripcion<textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="checkbox-label span-full"><input type="checkbox" checked={productForm.available} onChange={(event) => setProductForm((current) => ({ ...current, available: event.target.checked }))} /> Disponible en menu</label>
              <div className="button-row span-full"><button className="primary">{productModal.mode === 'create' ? 'Crear producto' : 'Guardar producto'}</button><button className="ghost dark" type="button" onClick={() => setProductModal(null)}>Cancelar</button></div>
            </form>
          )}
        </Modal>
      )}
    </main>
  );
}

function RestaurantSchedulesPage() {
  const action = useAction();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [schedules, setSchedules] = useState<RestaurantSchedule[]>(scheduleDefaults());
  const currentDay = todayDayOfWeek();

  async function load() {
    const ownRestaurant = await api<Restaurant>('/restaurants/my');
    setRestaurant(ownRestaurant);
    const data = await api<RestaurantSchedule[]>(`/restaurants/${ownRestaurant.id}/schedules`);
    setSchedules(completeWeeklySchedules(data));
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
      payload
        .filter((schedule) => !schedule.closed)
        .forEach((schedule) => {
          if (!schedule.opensAt || !schedule.closesAt) {
            throw new Error(`Completa apertura y cierre para ${dayLabel(schedule.dayOfWeek)}.`);
          }
          if (schedule.closesAt <= schedule.opensAt) {
            throw new Error(`El cierre debe ser posterior a la apertura en ${dayLabel(schedule.dayOfWeek)}.`);
          }
        });
      const updated = await api<RestaurantSchedule[]>(`/restaurants/${restaurant.id}/schedules`, { method: 'PUT', body: payload });
      setSchedules(completeWeeklySchedules(updated));
    }, 'Horarios actualizados.');
  }

  useEffect(() => {
    action.run(load);
  }, []);

  return (
    <main className="dashboard-grid">
      <section className="panel span-2">
        <h1>Horarios</h1>
        <PeakDemandBanner />
        <Notice {...action} />
        <div className="schedule-grid">
          {schedules.map((schedule, index) => (
            <div className={`schedule-row ${schedule.dayOfWeek === currentDay ? 'today' : ''}`} key={schedule.dayOfWeek}>
              <strong>{dayLabel(schedule.dayOfWeek)} {schedule.dayOfWeek === currentDay && <span className="today-pill">Hoy</span>}</strong>
              <label><input type="checkbox" checked={schedule.closed} onChange={(event) => setSchedules((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, closed: event.target.checked, opensAt: event.target.checked ? item.opensAt : (item.opensAt ?? '09:00'), closesAt: event.target.checked ? item.closesAt : (item.closesAt ?? '21:00') } : item))} /> Cerrado</label>
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
        <PeakDemandBanner />
        <Notice {...action} />
        <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Estado</th><th>Items</th><th>Envio</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.id.slice(0, 8)}<br /><small>{order.createdAt}</small></td><td><Pill>{order.status}</Pill></td><td>{order.items?.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}</td><td>{money(order.deliveryFee)}</td><td>{money(order.totalAmount)}</td><td><button disabled={order.status !== 'CREATED'} onClick={() => confirm(order.id)}>Confirmar</button><button className="danger" disabled={order.status !== 'CREATED'} onClick={() => reject(order.id)}>Rechazar</button></td></tr>)}</tbody></table></div>
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
      <div className="delivery-route">
        <div>
          <span>Pickup</span>
          <strong>{delivery.restaurantAddress ?? 'Sin direccion de restaurante'}</strong>
        </div>
        <div>
          <span>Entrega</span>
          <strong>{delivery.deliveryAddress ?? 'Sin direccion de entrega'}</strong>
        </div>
      </div>
      {delivery.orderSummary && <p className="delivery-summary">{delivery.orderSummary}</p>}
      <div className="delivery-metrics">
        <div><span>Distancia</span><strong>{delivery.distanceKm ?? '-'} km</strong></div>
        <div><span>Envio</span><strong>{money(delivery.deliveryFee)}</strong></div>
        <div><span>Propina</span><strong>{money(delivery.tipAmount)}</strong></div>
        <div><span>Total</span><strong>{money(delivery.totalAmount)}</strong></div>
      </div>
      {children && <div className="delivery-actions">{children}</div>}
    </article>
  );
}

function deliveryStatusLabel(status: DeliveryStatus) {
  return {
    PICKED_UP: 'Recogido',
    ON_THE_WAY: 'En camino',
    DELIVERED: 'Entregado',
    ASSIGNED: 'Asignado',
    CANCELLED: 'Cancelado',
  }[status];
}

function nextDeliveryStep(status: DeliveryStatus | string) {
  if (status === 'ASSIGNED') return { status: 'PICKED_UP' as DeliveryStatus, label: 'Marcar como recogido' };
  if (status === 'PICKED_UP') return { status: 'ON_THE_WAY' as DeliveryStatus, label: 'Salir a entregar' };
  if (status === 'ON_THE_WAY') return { status: 'DELIVERED' as DeliveryStatus, label: 'Finalizar entrega' };
  return null;
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
              <div className="button-row compact-actions"><button onClick={() => accept(delivery.id)}>Aceptar</button><button className="danger" onClick={() => reject(delivery.id)}>Rechazar</button></div>
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
          {deliveries.map((delivery) => {
            const next = nextDeliveryStep(delivery.status);
            return (
              <DeliveryCard key={delivery.id} delivery={delivery}>
                {next && (
                  <div className="button-row compact-actions">
                    <button onClick={() => status(delivery.id, next.status)}>{next.label}</button>
                  </div>
                )}
              </DeliveryCard>
            );
          })}
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
        {profile && <div className="tracking-card"><strong>{profile.deliveryUserName}</strong><Pill>{profile.available ? 'Disponible' : 'No disponible'}</Pill><small>{ratingLabel(profile.averageRating, profile.reviewCount)}</small><small>Ultimo registro: {profile.locationRecordedAt ?? 'sin ubicacion'}</small></div>}
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
        {stats && <div className="metric-grid"><div><span>Solicitudes</span><strong>{stats.pendingRequests}</strong></div><div><span>Activas</span><strong>{stats.activeDeliveries}</strong></div><div><span>Completadas</span><strong>{stats.completedDeliveries}</strong></div><div><span>Rechazadas</span><strong>{stats.rejectedRequests}</strong></div><div><span>Envios</span><strong>{money(stats.estimatedDeliveryEarnings)}</strong></div><div><span>Propinas</span><strong>{money(stats.tipsReceived)}</strong></div><div><span>Ganancia bruta</span><strong>{money(stats.grossEarnings ?? ((stats.estimatedDeliveryEarnings ?? 0) + (stats.tipsReceived ?? 0)))}</strong></div><div><span>Comision plataforma</span><strong>{money(stats.platformCommissionAmount)}</strong></div><div><span>Ganancia neta</span><strong>{money(stats.netEarnings)}</strong></div></div>}
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
            <tbody>{restaurants.map((restaurant) => <tr key={restaurant.id}><td><strong>{restaurant.name}</strong><br /><small>{restaurant.email ?? '-'}</small></td><td>{restaurant.city}, El Salvador<br /><small>{restaurant.streetAddress}</small></td><td><Pill>{restaurant.open ? 'Abierto' : 'Cerrado'}</Pill><br /><small>{restaurant.active === false ? 'Inactivo' : 'Activo'}</small></td><td><small>{restaurant.ownerId ?? '-'}</small></td><td><button className="danger" disabled={restaurant.active === false} onClick={() => deactivate(restaurant)}>Desactivar</button></td></tr>)}</tbody>
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
  const [decisions, setDecisions] = useState<Record<string, { resolution: string; refundType: RefundType; refundAmount: string }>>({});

  async function load(nextStatus = status) {
    const queryString = nextStatus === 'ALL' ? '' : `?status=${nextStatus}`;
    setComplaints(await api<Complaint[]>(`/complaints${queryString}`));
  }

  function decisionFor(complaint: Complaint) {
    return decisions[complaint.id] ?? { resolution: complaint.resolution ?? '', refundType: 'TOTAL' as RefundType, refundAmount: normalizeMoneyText(String(complaint.refund?.amount ?? '')) };
  }

  function updateDecision(complaint: Complaint, patch: Partial<{ resolution: string; refundType: RefundType; refundAmount: string }>) {
    setDecisions((current) => ({ ...current, [complaint.id]: { ...decisionFor(complaint), ...patch } }));
  }

  async function update(complaint: Complaint, nextStatus: string) {
    const decision = decisionFor(complaint);
    await action.run(async () => {
      const refundAmount = nextStatus === 'RESOLVED' && decision.refundType === 'PARTIAL'
        ? parseMoneyInput(decision.refundAmount, 'Monto parcial')
        : undefined;
      await api<Complaint>(`/complaints/${complaint.id}/status`, {
        method: 'PATCH',
        body: {
          status: nextStatus,
          resolution: decision.resolution.trim() || undefined,
          refundType: nextStatus === 'RESOLVED' ? decision.refundType : 'NONE',
          refundAmount,
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
              return <tr key={complaint.id}><td><strong>{complaint.subject}</strong><br /><small>{complaint.description}</small><br /><small>Resolucion: {complaint.resolution ?? '-'}</small></td><td>{complaint.customerName ?? complaint.customerUserId}<br /><small>{complaint.customerEmail}</small></td><td>{complaint.orderId.slice(0, 8)}<br /><small>{complaint.restaurantName ?? '-'}</small><br /><small>{complaint.orderStatus ?? '-'}</small></td><td><Pill>{complaint.status}</Pill></td><td>{complaint.refund?.refundStatus ?? 'NONE'}<br /><small>{money(complaint.refund?.amount)}</small></td><td><div className="form-grid admin-inline-form"><label>Comentario<textarea value={decision.resolution} onChange={(event) => updateDecision(complaint, { resolution: event.target.value })} placeholder="Resolucion administrativa" disabled={complaint.status === 'RESOLVED' || complaint.status === 'REJECTED'} /></label><label>Reembolso<select value={decision.refundType} onChange={(event) => updateDecision(complaint, { refundType: event.target.value as RefundType })} disabled={complaint.status !== 'IN_PROGRESS'}><option value="TOTAL">Total</option><option value="PARTIAL">Parcial</option><option value="NONE">Sin reembolso</option></select></label>{decision.refundType === 'PARTIAL' && <label>Monto parcial<MoneyInput min={0.01} placeholder="5.00" value={decision.refundAmount} onChange={(value) => updateDecision(complaint, { refundAmount: value })} disabled={complaint.status !== 'IN_PROGRESS'} /></label>}<div className="button-row"><button disabled={complaint.status !== 'OPEN'} onClick={() => update(complaint, 'IN_PROGRESS')}>Tomar</button><button disabled={complaint.status !== 'IN_PROGRESS'} onClick={() => update(complaint, 'RESOLVED')}>Resolver</button><button className="danger" disabled={complaint.status !== 'IN_PROGRESS'} onClick={() => update(complaint, 'REJECTED')}>Rechazar</button></div></div></td></tr>;
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
  type CouponForm = {
    code: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: string;
    minimumOrderAmount: string;
    maxDiscountAmount?: string;
    usageLimit: number;
    startsAt: string;
    expiresAt: string;
    active: boolean;
  };
  const [form, setForm] = useState<CouponForm>({
    code: 'ADMINDEMO',
    description: 'Cupon demo administrativo',
    discountType: 'PERCENTAGE' as CouponForm['discountType'],
    discountValue: '10',
    minimumOrderAmount: '',
    maxDiscountAmount: '5',
    usageLimit: 100,
    startsAt: dateTimeLocal(0),
    expiresAt: dateTimeLocal(30),
    active: true,
  });
  const isPercentage = form.discountType === 'PERCENTAGE';

  async function load() {
    setCoupons(await api<Coupon[]>('/coupons'));
  }

  function edit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      discountValue: normalizeMoneyText(String(coupon.discountValue ?? '')),
      minimumOrderAmount: normalizeMoneyText(String(coupon.minimumOrderAmount ?? '')),
      maxDiscountAmount: coupon.maxDiscountAmount === undefined || coupon.maxDiscountAmount === null ? undefined : normalizeMoneyText(String(coupon.maxDiscountAmount)),
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
      const payload = {
        ...form,
        discountValue: parseMoneyInput(form.discountValue, isPercentage ? 'Porcentaje de descuento' : 'Monto fijo de descuento', { max: isPercentage ? 100 : undefined }),
        minimumOrderAmount: parseMoneyInput(form.minimumOrderAmount || '0', 'Monto minimo', { allowZero: true }),
        maxDiscountAmount: isPercentage && Number(form.maxDiscountAmount ?? 0) > 0 ? parseMoneyInput(form.maxDiscountAmount ?? '', 'Maximo descuento') : undefined,
        usageLimit: Number(form.usageLimit),
      };
      await api<Coupon>(path, { method, body: payload });
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
          <label>Tipo<select value={form.discountType} onChange={(event) => {
            const nextType = event.target.value as CouponForm['discountType'];
            setForm({
              ...form,
              discountType: nextType,
              discountValue: nextType === 'PERCENTAGE' ? normalizeMoneyText(String(Math.min(Number(form.discountValue) || 10, 100))) : normalizeMoneyText(form.discountValue || '5'),
              maxDiscountAmount: nextType === 'PERCENTAGE' ? (form.maxDiscountAmount ?? '5') : undefined,
            });
          }}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED">Monto fijo</option></select></label>
          {isPercentage ? (
            <>
              <label>Porcentaje de descuento<MoneyInput min={0.01} max={100} placeholder="10" value={form.discountValue} onChange={(value) => setForm({ ...form, discountValue: value })} /></label>
              <label>Maximo descuento opcional<MoneyInput min={0} placeholder="5.00" value={form.maxDiscountAmount ?? ''} onChange={(value) => setForm({ ...form, maxDiscountAmount: value })} /></label>
            </>
          ) : (
            <label>Monto fijo de descuento<MoneyInput min={0.01} placeholder="5.00" value={form.discountValue} onChange={(value) => setForm({ ...form, discountValue: value })} /></label>
          )}
          <label>Monto minimo<MoneyInput min={0} placeholder="0.00" value={form.minimumOrderAmount} onChange={(value) => setForm({ ...form, minimumOrderAmount: value })} /></label>
          <label>Limite usos<input type="number" min="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: Number(event.target.value) })} /></label>
          <div className="coupon-preview">
            <span>Vista previa</span>
            <strong>{isPercentage ? `${form.discountValue || '0'}% de descuento` : `${money(Number(form.discountValue || 0))} de descuento fijo`}</strong>
            <small>{isPercentage && Number(form.maxDiscountAmount ?? 0) > 0 ? `Tope maximo: ${money(Number(form.maxDiscountAmount))}` : 'Sin tope adicional'}</small>
          </div>
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
      <ReportTable title="Top repartidores" rows={topDeliveries.map((row) => [row.deliveryUserName, `${row.deliveries} entregas`, `Envios ${money(row.earnings)}`])} />
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
  const [form, setForm] = useState({ commissionPercentage: '12', deliveryCommissionPercentage: '10', startsAt: dateTimeLocal(0), endsAt: '' });

  async function load() {
    setCommissions(await api<CommissionConfig[]>('/admin/commissions'));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(async () => {
      await api<CommissionConfig>('/admin/commissions', {
        method: 'POST',
        body: {
          ...form,
          commissionPercentage: parseMoneyInput(form.commissionPercentage, 'Porcentaje', { allowZero: true, max: 100 }),
          deliveryCommissionPercentage: parseMoneyInput(form.deliveryCommissionPercentage, 'Comision de repartidor', { allowZero: true, max: 100 }),
          endsAt: form.endsAt || null,
        },
      });
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
        <p className="notice neutral">Estas comisiones globales aplican para todos los restaurantes y repartidores. La comision de repartidor se descuenta solo sobre el envio; la propina queda libre para el repartidor.</p>
        <form className="form-grid" onSubmit={submit}>
          <label>Comision restaurantes (%)<MoneyInput min={0} max={100} placeholder="12" value={form.commissionPercentage} onChange={(value) => setForm({ ...form, commissionPercentage: value })} /></label>
          <label>Comision repartidores (%)<MoneyInput min={0} max={100} placeholder="10" value={form.deliveryCommissionPercentage} onChange={(value) => setForm({ ...form, deliveryCommissionPercentage: value })} /></label>
          <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
          <label>Fin opcional<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
          <button className="primary">Guardar comision global</button>
        </form>
      </section>
      <section className="panel">
        <h1>Historial de comisiones</h1>
        <div className="table-wrap"><table><thead><tr><th>Alcance</th><th>Restaurantes</th><th>Repartidores</th><th>Vigencia</th></tr></thead><tbody>{commissions.map((commission) => <tr key={commission.id}><td>{commission.global ? 'Global' : 'Configuracion heredada'}</td><td>{commission.commissionPercentage}%</td><td>{commission.deliveryCommissionPercentage ?? 0}%</td><td>{shortDate(commission.startsAt)}<br /><small>{commission.endsAt ? `hasta ${shortDate(commission.endsAt)}` : 'sin fin'}</small></td></tr>)}</tbody></table></div>
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

        <Route path="/cliente/*" element={<RequireRole user={user} roles={['CUSTOMER']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<CustomerHome />} /><Route path="restaurantes" element={<RestaurantsPage />} /><Route path="restaurantes/:id" element={<RestaurantDetailPage />} /><Route path="carrito" element={<CartPage />} /><Route path="checkout" element={<CartPage checkout />} /><Route path="pedidos" element={<OrdersPage />} /><Route path="pedidos/:id" element={<TrackingPage />} /><Route path="tracking/:id" element={<TrackingPage />} /><Route path="direcciones" element={<CustomerAddressesPage />} /><Route path="perfil" element={<CustomerProfilePage />} /><Route path="fidelidad" element={<CustomerLoyaltyPage />} /><Route path="reclamos" element={<CustomerComplaintsPage />} /><Route path="calificaciones" element={<CustomerReviewsPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/restaurante/*" element={<RequireRole user={user} roles={['RESTAURANT']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<RestaurantHome />} /><Route path="perfil" element={<RestaurantProfilePage user={user!} />} /><Route path="menu" element={<RestaurantProductsPage />} /><Route path="productos" element={<RestaurantProductsPage />} /><Route path="horarios" element={<RestaurantSchedulesPage />} /><Route path="pedidos" element={<RestaurantOrdersPage />} /><Route path="pedidos/:id" element={<RestaurantOrdersPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/repartidor/*" element={<RequireRole user={user} roles={['DELIVERY']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<DeliveryHome />} /><Route path="perfil" element={<DeliveryProfilePage />} /><Route path="solicitudes" element={<DeliveryRequestsPage />} /><Route path="entregas" element={<DeliveryActivePage />} /><Route path="entregas/:id" element={<DeliveryActivePage />} /><Route path="historial" element={<DeliveryHistoryPage />} /><Route path="estadisticas" element={<DeliveryStatsPage />} /></Routes></AppLayout></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole user={user} roles={['ADMIN']}><AppLayout user={user!} onLogout={logout}><Routes><Route index element={<AdminHome />} /><Route path="usuarios" element={<AdminUsersPage />} /><Route path="restaurantes" element={<AdminRestaurantsPage />} /><Route path="reclamos" element={<AdminComplaintsPage />} /><Route path="cupones" element={<AdminCouponsPage />} /><Route path="reportes" element={<AdminReportsPage />} /><Route path="comisiones" element={<AdminCommissionsPage />} /></Routes></AppLayout></RequireRole>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
