# Delivery Frontend

Frontend MVP en React + Vite + TypeScript para probar el backend del proyecto
Delivery. La app esta pensada para demostrar flujos reales por rol sin modificar
la logica del backend.

## Stack

- React 19
- Vite
- TypeScript
- CSS propio responsive
- API REST con proxy de desarrollo hacia el backend

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Backend corriendo en `http://localhost:8080`

## Configuracion

Copia el ejemplo de variables:

```bash
cp .env.example .env
```

Variables disponibles:

```bash
VITE_API_BASE_URL=/api
```

El proxy de Vite envia `/api`, `/restaurants`, `/products`, `/categories` y
`/promotions` hacia `http://localhost:8080`.

La pantalla de direcciones usa Leaflet con OpenStreetMap para colocar un pin y
guardar latitud/longitud. No requiere API key ni geocoding externo.

Si necesitas cambiar el backend target durante desarrollo:

```bash
VITE_BACKEND_TARGET=http://localhost:8080 npm run dev
```

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

## Credenciales seed

Todas usan:

```text
Password123!
```

Usuarios:

```text
admin.dev@example.com
cliente.dev@example.com
restaurante.dev@example.com
repartidor.dev@example.com
```

## Flujos disponibles

- `ADMIN`: usuarios, reclamos, cupones, reportes y comisiones.
- `CUSTOMER`: catalogo, carrito, direcciones con mapa, checkout con pago
  simulado, tracking, reclamos, fidelidad y calificaciones.
- `RESTAURANT`: productos, categorias y confirmacion/rechazo de pedidos.
- `DELIVERY`: entregas asignadas automaticamente y cambio de estado.

## Validacion manual sugerida

1. Iniciar backend en `localhost:8080` con seed dev.
2. Ejecutar `npm run dev`.
3. Login como cliente y agregar productos al carrito.
4. Crear pedido con direccion seed y cupon `DEV10`.
5. Login como restaurante y confirmar/rechazar pedidos.
6. Login como repartidor y actualizar estado de entrega.
7. Login como admin y revisar usuarios, reclamos, cupones y reportes.

## Notas tecnicas

- La sesion usa `localStorage` para `accessToken`, `refreshToken` y usuario.
- El cliente HTTP intenta refrescar token automaticamente ante `401`.
- La UI evita librerias pesadas para que el equipo pueda modificarla rapido.
- Es un MVP funcional; no intenta ser CRUD exhaustivo de cada tabla.
