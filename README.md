# Shopify Profit

Panel que se conecta a tu tienda Shopify y calcula solo, con cada venta:

- Facturación, comisión de Shopify (2,5 %), coste de producto y **profit neto de hoy**
- Lo mismo **acumulado del mes**, con gráfico día a día
- **Clientes que han comprado** este mes, cuánto ha gastado cada uno y su total histórico
- Últimos pedidos con el profit de cada uno

Los datos se leen directamente de Shopify y se actualizan solos cada 2 minutos.

---

## Instalación (unos 15 minutos)

### 1. Crea la app de conexión en Shopify

1. Entra en **[dev.shopify.com](https://dev.shopify.com)** con la cuenta dueña de la tienda.
2. Crea una app nueva (por ejemplo, "Shopify Profit").
3. En la configuración de acceso, activa estos permisos (scopes):
   `read_orders`, `read_products`, `read_inventory`, `read_customers`
4. En **Protected customer data**, solicita acceso a **nombre** y **email** (sin esto, los clientes salen sin nombre).
5. Publica la versión e **instala la app en tu tienda**.
6. Copia el **Client ID** y el **Client secret** de la app.

### 2. Rellena el "Coste por artículo" de tus productos

En Shopify → Productos → cada producto/variante → **Coste por artículo**.
Es lo que el panel usa como coste de producto. Si está vacío, cuenta como 0 € y el profit saldrá más alto de lo real.

### 3. Crea tu panel en Vercel

Pulsa este botón (necesitas una cuenta gratuita de Vercel):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fportavidalvictor-code%2Fshopify-prfofit&project-name=shopify-profit&repository-name=shopify-profit&env=SHOPIFY_STORE_DOMAIN,SHOPIFY_CLIENT_ID,SHOPIFY_CLIENT_SECRET,DASHBOARD_PASSWORD&envDescription=Dominio%20de%20tu%20tienda%20(tutienda.myshopify.com)%2C%20Client%20ID%20y%20Client%20secret%20de%20tu%20app%20de%20Shopify%2C%20y%20la%20contrase%C3%B1a%20que%20quieras%20para%20entrar%20al%20panel)

Vercel te pedirá 4 datos:

| Campo | Qué poner |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | El dominio interno de tu tienda: `tutienda.myshopify.com` (lo ves en Shopify → Configuración → Dominios) |
| `SHOPIFY_CLIENT_ID` | El Client ID del paso 1 |
| `SHOPIFY_CLIENT_SECRET` | El Client secret del paso 1 |
| `DASHBOARD_PASSWORD` | La contraseña que quieras para entrar al panel |

Pulsa **Deploy**. En un minuto tendrás tu panel en una dirección tipo `https://shopify-profit-xxxx.vercel.app`: ábrela, pon tu contraseña y listo.

---

## Ajustes opcionales

En Vercel → tu proyecto → Settings → Environment Variables (después, **Redeploy**):

| Variable | Para qué |
|---|---|
| `FEE_RATE` | Comisión de Shopify como decimal. Por defecto `0.025` (2,5 %) |
| `SHOPIFY_API_VERSION` | Versión de la API de Shopify. Por defecto `2026-07` |

## Cómo se calcula

- **Facturación** = total cobrado de cada pedido pagado (descontando devoluciones), IVA y envío incluidos.
- **Comisión Shopify** = facturación × 2,5 %.
- **Coste de producto** = unidades vendidas × "Coste por artículo" de cada variante.
- **Profit neto** = facturación − comisión − coste de producto.

## Problemas frecuentes

- **Sale "Datos de demostración"**: falta alguna de las 4 variables en Vercel, o no has hecho Redeploy tras añadirlas.
- **"Shopify rechazó las credenciales"**: el Client ID/secret no es correcto, o la app no está instalada en la tienda.
- **Los clientes salen sin nombre**: falta el acceso a *Protected customer data* (paso 1.4).
