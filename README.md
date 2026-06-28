# Delivery Frontend

Frontend del sistema Delivery construido con React, Vite y TypeScript. La
aplicacion consume el backend REST del proyecto y ofrece rutas separadas por
rol para clientes, restaurantes, repartidores y administradores.

## Propósito

Este frontend existe para demostrar el flujo completo del negocio sin usar
mockups artificiales:

- autenticacion;
- catalogo y carrito;
- checkout y pago simulado;
- tracking de pedidos;
- gestion de restaurante;
- gestion de delivery;
- panel administrativo;
- reclamos, calificaciones, cupones, fidelidad y reportes.

## Stack

- React 19
- Vite
- TypeScript
- `react-router-dom`
- CSS propio responsive
- Leaflet + OpenStreetMap para selecciones de coordenadas

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Backend corriendo y accesible por red

## Configuracion

Crear el archivo de entorno:

```bash
cp .env.example .env
```

Variables principales:

```env
VITE_API_BASE_URL=/api
```

Si desarrollas en local con el backend en otra URL, el proyecto usa el proxy de
Vite definido en `vite.config.ts`.

## Instalacion

```bash
npm install
```

## Ejecucion Local

```bash
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## Build De Produccion

```bash
npm run build
```

Para previsualizar el build:

```bash
npm run preview
```

## Docker

La aplicacion puede servirse como imagen Docker con Nginx.

Construir:

```bash
docker build -t delivery-frontend .
```

Ejecutar:

```bash
docker run --rm \
  --name delivery-frontend \
  -p 5173:80 \
  delivery-frontend
```

Si el backend corre en otra maquina, el frontend debe apuntar a la misma URL
base definida en el entorno o en el proxy de Nginx del despliegue.

## Despliegue

En EC2 el frontend se integra con el backend y Nginx en una sola instancia.

La configuracion habitual usa:

- `sslip.io` como dominio basado en IP;
- HTTPS con Let's Encrypt;
- backend y frontend tras Nginx;
- rutas SPA manejadas con `try_files`.

## Rutas Principales

### Publicas

- `/`
- `/login`
- `/register`

### Cliente

- `/cliente`
- `/cliente/restaurantes`
- `/cliente/restaurantes/:id`
- `/cliente/carrito`
- `/cliente/checkout`
- `/cliente/pedidos`
- `/cliente/pedidos/:id`
- `/cliente/tracking/:id`
- `/cliente/direcciones`
- `/cliente/perfil`
- `/cliente/fidelidad`
- `/cliente/reclamos`
- `/cliente/calificaciones`

### Restaurante

- `/restaurante`
- `/restaurante/perfil`
- `/restaurante/menu`
- `/restaurante/productos`
- `/restaurante/horarios`
- `/restaurante/pedidos`
- `/restaurante/pedidos/:id`

### Repartidor

- `/repartidor`
- `/repartidor/entregas`
- `/repartidor/entregas/:id`
- `/repartidor/historial`

### Admin

- `/admin`
- `/admin/usuarios`
- `/admin/restaurantes`
- `/admin/reclamos`
- `/admin/cupones`
- `/admin/reportes`
- `/admin/comisiones`

### Errores

- `/403`
- `*` para `/404`

## Flujo Funcional

### Cliente

- login;
- explorar restaurantes;
- ver productos por categoria;
- agregar al carrito;
- revisar resumen con envio, propina, cupon y saldo;
- pagar con flujo simulado;
- ver tracking;
- crear reclamos y calificar desde modales en pedidos realizados;
- usar monedero digital y puntos de fidelidad.

### Restaurante

- ver su dashboard;
- editar perfil;
- crear y editar categorias desde modales;
- crear y editar productos desde modales;
- administrar horarios;
- revisar pedidos;
- confirmar o rechazar pedidos.

### Repartidor

- ver entregas activas;
- avanzar estados con una sola accion;
- revisar historial;
- consultar su ubicacion actual en coordenadas con precision.

### Admin

- buscar y activar/desactivar usuarios;
- gestionar reclamos con reembolso parcial o total;
- crear y administrar cupones;
- revisar reportes;
- administrar comisiones globales.

## Mapa Y Geolocalizacion

El frontend usa Leaflet con OpenStreetMap para capturar coordenadas:

- direccion del cliente;
- ubicacion del restaurante;
- ubicacion del repartidor cuando aplica;
- busquedas por cercania cuando el backend lo soporta.

### Comportamiento

- se puede colocar un pin sobre el mapa;
- el punto se guarda en latitud y longitud;
- no se usa geocoding pesado;
- si el mapa falla, la app muestra campos alternativos cuando corresponda.

## Imagenes

Las imagenes de restaurantes y productos:

- se muestran desde `/uploads`;
- se cargan desde el backend;
- se previsualizan en formularios;
- se pueden reemplazar o eliminar desde la UI.

### Formato esperado

El backend almacena archivos optimizados, normalmente en WebP. El frontend solo
consume la URL relativa devuelta por la API.

## Autenticacion

La sesion se guarda en `localStorage`:

- `accessToken`
- `refreshToken`
- usuario actual

El cliente HTTP intenta refrescar token automaticamente si recibe `401`.

## Credenciales Seed

Password:

```text
Password123!
```

Usuarios demo:

```text
admin.dev@example.com
cliente.dev@example.com
restaurante.dev@example.com
repartidor.dev@example.com
```

## Como Probar

1. Levanta el backend con seed activo.
2. Ejecuta `npm run dev`.
3. Inicia sesion como cliente.
4. Agrega un producto al carrito.
5. Revisa checkout, cupones y monedero.
6. Crea el pedido.
7. Inicia sesion como restaurante y confirma el pedido.
8. Inicia sesion como repartidor y avanza el estado.
9. Regresa como cliente y revisa tracking, reclamos y calificaciones.
10. Inicia sesion como admin y revisa usuarios, cupones, reclamos y reportes.

## Notas Tecnicas

- El proyecto evita librerias UI pesadas.
- El layout es responsive con sidebar en escritorio y navegacion compacta en
  mobile.
- Las vistas usan datos reales del backend.
- El frontend no calcula montos finales por su cuenta: los consulta al backend.
- Las rutas protegidas dependen del rol autenticado.

## Variables De Entorno En Desarrollo

Ejemplo minimo:

```env
VITE_API_BASE_URL=/api
```

## Documentacion Relacionada

- [`../delevery_backend/README.md`](/home/armandoaguilar/Desktop/delevery_backend/README.md)
- [`../delevery_backend/PROJECT_TECHNICAL_EXPLANATION_GUIDE.md`](/home/armandoaguilar/Desktop/delevery_backend/PROJECT_TECHNICAL_EXPLANATION_GUIDE.md)
- [`../delevery_backend/DEPLOYMENT_SETUP_GUIDE.md`](/home/armandoaguilar/Desktop/delevery_backend/DEPLOYMENT_SETUP_GUIDE.md)

## Resumen

Este frontend funciona como una SPA real de producción ligera:

- rutas por rol;
- consumo de API REST;
- manejo de mapas e imagenes;
- checkout con calculo seguro en backend;
- despliegue sencillo con Docker y Nginx.
