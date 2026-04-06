# Identidad de Marca: Vitali Suites

Este documento establece la identidad visual corporativa extraída del sitio web principal [vitalisuites.com](https://vitalisuites.com), con el objetivo de ser utilizada como guía para el desarrollo de nuevas aplicaciones y simuladores de crédito, manteniendo la coherencia de marca con una estética moderna, profesional y lujosa.

## 🎨 Paleta de Colores

La marca utiliza una paleta sofisticada que combina la seriedad del azul oscuro con la elegancia del dorado:

- **Vitali Blue (Primario):** 
  - `HEX: #002B5B`
  - `RGB: rgb(0, 43, 91)`
  - *Uso sugerido:* Fondos principales, cabeceras, pies de página o textos principales para alto contraste.

- **Vitali Gold (Secundario/Acento):** 
  - `HEX: #D4BE77`
  - `RGB: rgb(212, 190, 119)`
  - *Uso sugerido:* Botones de acción principales (Call to Actions), detalles decorativos, iconos y elementos a resaltar.

- **Blanco & Neutros:** 
  - `HEX: #FFFFFF` para textos sobre fondos oscuros (ej. sobre Vitali Blue) y tarjetas de contenido flotantes.
  - Se recomienda usar grises muy claros (`#F3F4F6` o similares en Tailwind) para secciones de fondo con el fin de generar profundidad sin perder limpieza visual.

## 🔤 Tipografía

Las fuentes utilizadas comunican modernidad y legibilidad. Ambas son fuentes disponibles en Google Fonts.

- **Títulos y Encabezados (Headings):**
  - **Fuente:** `Raleway, sans-serif`
  - *Estilo:* Geométrica, comunica lujo, elegancia y limpieza.
  
- **Texto en Cuerpo (Body Text):**
  - **Fuente:** `Lato, sans-serif`
  - *Estilo:* Excelente legibilidad para textos largos, campos de formulario e instrucciones generales en el simulador.

## 📱 Guía de Estética y UI (User Interface)

Para que el simulador se vea "muy moderno" pero siga esta identidad gráfica, se deben aplicar las siguientes directrices de diseño:

1. **Bordes redondeados:** Los botones y ciertos elementos interactivos clave deben utilizar un radio completo (`border-radius: 9999px` o `rounded-full` en Tailwind CSS) para dar una sensación táctil y contemporánea.
2. **Profundidad y Sombras:** Uso moderado de sombras suaves y amplias (`box-shadow` tipo `shadow-lg` o `shadow-2xl`) para las tarjetas ("cards") del simulador que flotan sobre fondos sutiles.
3. **Imágenes de alta calidad:** El simulador puede estar rodeado por alguna fotografía inspiradora de fondo relacionada con el estilo de vida Premium o arquitectónico (alegórico a los suites de Vitali), oscurecido con un velo azul marino para hacer resaltar la UI.
4. **Minimalismo y Espaciado:** Usar amplios márgenes y "espaciado en blanco" (White Space) para no abrumar al usuario con los datos financieros.

## 🖼️ Logotipo Corporativo

- **Ubicación local:** El logotipo en formato WebP se ha descargado y guardado en la carpeta web: `assets/logo_vitalisuites_blanco.webp`.
- Es una variante de logotipo en color blanco puro, por lo que es ideal para colocar en la cabecera del simulador sobre un fondo de color **Vitali Blue**.

---

*Configuración Sugerida en Tailwind CSS (tailwind.config.js):*

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'vitali-blue': '#002B5B',
        'vitali-gold': '#D4BE77',
      },
      fontFamily: {
        heading: ['Raleway', 'sans-serif'],
        body: ['Lato', 'sans-serif'],
      }
    }
  }
}
```
