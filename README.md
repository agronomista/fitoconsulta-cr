> La cobertura vigente del último lote publicado se documenta en [COBERTURA_ACTUAL.md](COBERTURA_ACTUAL.md) y `data_manifest.json`; las cifras históricas de este README corresponden al corte que allí se indica.

# FitoConsulta CR 🇨🇷

Consulta documental independiente de registros de fungicidas, herbicidas e insecticidas del Servicio Fitosanitario del Estado (SFE) de Costa Rica.

**Aplicación:** https://agronomista.github.io/fitoconsulta-cr/

No es una plataforma oficial del SFE. No constituye recomendación de aplicación, certificación de vigencia ni autorización para un cultivo o una plaga. Comprueba siempre el registro y la etiqueta vigentes.

## Consulta

- **Presentación automática para celular y PC**, sin selector: una columna hasta 600 px y distribución amplia y fluida por encima. No se fuerza ancho de escritorio ni desplazamiento horizontal en teléfonos o tablets.
- Dos entradas principales: **Molécula** y **Nombre comercial**.
- Autocompletado con hasta **6 coincidencias** y opción para mostrar las demás en un panel de altura limitada.
- Filtros adicionales de cultivo, plaga/maleza, grupo de productos, tipo y estado.
- Fichas con las dosis, unidades, condiciones e intervalos publicados para cada producto y cultivo, sin extrapolarlos entre registros.
- Referencias **FRAC**, **HRAC** e **IRAC** por ingrediente, con etiquetas de colores orientativos, estados pendientes y fuentes.
- Exportación CSV e impresión de fichas.
- Roboto con peso 300, alternativas Helvetica/Arial y tipografía incluida sin depender de un CDN.

## Cobertura del corte documental

| Grupo consultado | Registros activos | Con fichas de cultivo | Fichas | Filas producto–cultivo–plaga/maleza |
|---|---:|---:|---:|---:|
| Fungicidas | 759 | 565 | 3.621 | 6.315 |
| Herbicidas | 1.009 | 720 | 3.480 | 40.004 |
| Insecticidas | 774 | 543 | 3.109 | 6.868 |

Total conciliado: **2.541 registros activos**, **1.827 con fichas**, **10.207 fichas**, **53.184 filas** y **233 pares de cultivo común/científico**. El registro compartido Bayfidan Duo 4931 y sus usos se cuentan una sola vez en el total.

Fechas de censo según el reloj local de extracción: 17 y 18 de noviembre de 2026. No son una comprobación de vigencia jurídica actual. Las fechas originales se conservan en cada ficha.

Consulta [COBERTURA_ACTUAL.md](COBERTURA_ACTUAL.md) y [data_manifest.json](data_manifest.json) para conocer alcance, limitaciones, fechas y hashes.

## Fuentes y uso responsable

- [Consulta pública SFE](https://app.sfe.go.cr/SFEInsumos/aspx/Insumos/ConsultaRegistroPlaguicida.aspx).
- [FRAC Code List 2026](https://www.frac.info/knowledge-database/downloads/).
- [HRAC Global 2026](https://hracglobal.com/tools/2026-hrac-global-herbicide-moa-classification).
- [IRAC: clasificación oficial](https://irac-online.org/documents/moa-classification/), edición 11.5 de febrero de 2026.
- [PubChem](https://pubchem.ncbi.nlm.nih.gov/) para las identidades químicas de referencia contrastadas.

Se conservan nombres, grafías, vacíos y dosis de origen. Los códigos de resistencia y las identidades de referencia no autorizan usos ni garantizan la composición exacta o intercambiabilidad de los formulados. Los componentes o cepas no confirmados no reciben un código por analogía.

Este sitio es de consulta documental y educativa. El material de referencia puede estar sujeto a condiciones de sus titulares: FRAC requiere autorización escrita previa para uso comercial de su material. Revisa los términos de cada fuente antes de reutilizarla comercialmente. No se redistribuyen los PDF o Excel oficiales originales en este repositorio. Roboto se incluye bajo [SIL Open Font License 1.1](fonts/OFL.txt), con su [procedencia](fonts/README.md).

## Privacidad y funcionamiento

La presentación se adapta automáticamente mediante CSS al ancho disponible, al girar el teléfono y al redimensionar la ventana, sin modificar búsquedas, filtros, URL, cultivo seleccionado ni datos. No hay botones de vista ni preferencias que elegir o guardar. Las preferencias manuales de versiones anteriores se ignoran. Funciona también con almacenamiento bloqueado y desde archivo sin conexión.

La búsqueda y el filtrado se realizan en el navegador. La app no incorpora cuentas, analítica ni consultas automáticas al SFE o a los clasificadores. Los enlaces a las fuentes se abren solo a petición. GitHub Pages sirve los archivos y está sujeto a las políticas de GitHub.

**La base no se actualiza automáticamente.** Esta publicación no activa un scraper ni una actualización periódica.

La versión web necesita conexión para su carga inicial; no se promete recarga offline de la web. Para uso local sin conexión, descarga este repositorio completo y abre `index.html`, conservando `fonts/` y el resto de los archivos juntos. No se requiere instalar paquetes ni Node.js.

## Publicación

Sitio estático con GitHub Pages desde la rama `main`, carpeta raíz. El archivo `.nojekyll` evita procesamiento innecesario. No se necesitan claves, API, backend ni base de datos.

Solo se incluyen archivos de publicación. Las evidencias HTML, CSV de trabajo, respuestas de consulta, scripts, pruebas, logs y dependencias del proyecto completo no se publican aquí. Las referencias a carpetas de trabajo en la documentación de cobertura o fuentes se refieren al proyecto local, no a carpetas incluidas en este repositorio.

La versión de origen pasó 42 pruebas unitarias y 41 de navegador (83 en total), incluidas regresión de datos, móvil, teclado, accesibilidad automática, carga de fuentes y apertura local sin conexión; adaptación automática, ausencia de selector, preferencias antiguas ignoradas, conservación de búsquedas y cultivo, ausencia de desbordamiento, impresión, HTML anterior en caché y almacenamiento bloqueado. Las pruebas automáticas no sustituyen una auditoría manual completa.
