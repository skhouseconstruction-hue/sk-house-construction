SK HOUSE CONSTRUCTION — SISTEMA DE PLANTILLAS V3

Esta versión corrige el sistema de plantillas para permitir instalar archivos .skhctemplate externos.

REGLAS DE SEGURIDAD
- Una plantilla contiene únicamente información visual: id, nombre, descripción, colores y layout.
- Nunca contiene clientes, productos, cotizaciones, notas, folios, bancos, IVA, teléfonos, correos ni logotipo.
- Las plantillas instaladas se guardan dentro de la configuración local de la aplicación.
- Se admiten hasta 100 plantillas personalizadas instaladas.
- Las plantillas integradas no se pueden sobrescribir mediante un archivo externo.
- Si se instala nuevamente una plantilla personalizada con el mismo ID, se actualiza esa plantilla.

INSTALAR
1. Abra Plantillas.
2. Pulse «Instalar plantilla».
3. Seleccione un archivo .skhctemplate o .json válido.
4. La plantilla se valida y se aplica automáticamente.

DESCARGAR
Cada plantilla disponible tiene un botón «Descargar». El archivo descargado puede instalarse en otra copia de la aplicación.

FORMATO
{
 "type": "sk-house-template",
 "version": "3.1",
 "template": {
 "id": "mi-plantilla",
 "name": "Mi Plantilla",
 "desc": "Diseño personalizado",
 "accent": "#1f5f8b",
 "soft": "#eaf3f8",
 "ink": "#17324d",
 "layout": "classic"
 }
}

Layouts admitidos: classic, premium, dark, band, industrial, minimal, modern, editorial, executive, split, grid, soft.
