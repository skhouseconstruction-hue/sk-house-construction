SK House Construction — Versión estable profesional

Esta carpeta contiene una única versión de producción de la aplicación.

Archivos principales:
- index.html — entrada de la aplicación
- app.js — lógica de la aplicación
- cloud.js — autenticación y sincronización con Supabase
- styles.css — interfaz
- sw.js — PWA y caché de recursos estáticos
- manifest.webmanifest — instalación como aplicación

Funciones:
- Cotizaciones y notas de venta
- Clientes y productos
- Historial y búsqueda
- Listas de herramientas con imágenes
- PDF y JPG
- Compartir por WhatsApp y correo
- Respaldar y restaurar
- Cuenta bancaria principal y cuenta adicional opcional
- Número completo de tarjeta en documentos
- Sincronización con Supabase para usar los mismos datos en varios dispositivos

Sincronización:
1. Usa la misma cuenta de Supabase en todos los dispositivos.
2. En un dispositivo nuevo, inicia sesión antes de capturar información.
3. La aplicación descarga primero los datos existentes y después sincroniza cambios.
4. La aplicación utiliza control de versión y comparación por fecha para reducir sobrescrituras accidentales.

Versión interna: stable-2.4.2
