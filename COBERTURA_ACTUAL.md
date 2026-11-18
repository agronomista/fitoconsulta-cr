# Cobertura actual: fungicidas, herbicidas e insecticidas SFE

Base integrada: **2.541 registros activos**, **1.827 con fichas de cultivo**, **10.207 fichas**, **53.184 filas producto–cultivo–plaga/maleza** y **233 pares de cultivo común/científico**.

| Consulta SFE | Clases | Activos | Con fichas | Sin fichas | Fichas | Filas |
|---|---:|---:|---:|---:|---:|---:|
| Fungicidas | 15 | 759 | 565 | 194 | 3.621 | 6.315 |
| Herbicidas | 4 | 1.009 | 720 | 289 | 3.480 | 40.004 |
| Insecticidas | 21 | 774 | 543 | 231 | 3.109 | 6.868 |

Los subtotales de las consultas se solapan: **Bayfidan Duo, registro 4931**, aparece como fungicida e insecticida. Se conserva una sola ficha comercial, ambas categorías y los dos censos; sus tres fichas y tres filas se cuentan una sola vez en el total integrado. Los filtros por categoría conservan íntegramente cada conjunto de origen.

## Insecticidas e IRAC

- Censo: **2026-11-18T09:37:51-06:00**, según el reloj local. Se consultaron las 21 clases que contienen «insecticida», incluidas combinaciones, botánicos, microbiológicos, invertebrados, técnicos y fundas; sin filtros de tipo o cultivo. No es un inventario independiente de clases exclusivamente acaricidas o nematicidas.
- 1.181 registros censados: 625 Activo, 149 activos de uso restringido, 406 cancelados y uno suspendido. La app conserva los **774 activos**, incluidos los restringidos.
- Tipos reales de ficha: **471 químicos formulados o sustancias afines, 228 IAGT, 18 microbiológicos, 6 botánicos y 51 invertebrados**. El tipo se verifica en el formulario, no se infiere del nombre de la clase.
- **543 registros con usos**, **3.109 fichas**, **6.868 filas** y **168 pares de cultivo común/científico** en la fuente insecticida.
- **231 sin fichas**: 228 IAGT y tres formulados. Permanecen en el inventario sin cultivos ni dosis inventados.
- Extracción completa, sin errores pendientes. Se recuperaron los fallos transitorios y se incorporó el formulario específico de invertebrados con cultivos.

### Clasificación IRAC

Fuente: [esquema oficial IRAC 11.5, febrero de 2026](https://irac-online.org/documents/moa-classification/), contrastado con la [tabla oficial en línea](https://irac-online.org/mode-of-action/classification-online/). Cada código asignado se comprobó contra el nodo oficial, la página de la tabla principal y la fila exacta del anexo 5.

- **140 denominaciones SFE revisadas**: **96 con código de referencia**, **16 no localizadas de manera inequívoca** y **28 de enemigos naturales sin código aplicable**. Son denominaciones, no necesariamente sustancias distintas. Una de las 96 asignaciones es parcial por un isómero adicional no identificado.
- De los 774 registros: **705 con cobertura completa de sus ingredientes identificados, 2 parciales, 41 de enemigos naturales fuera del alcance y 26 sin asignación verificada**.
- De los 543 con fichas: **477 completos, uno parcial, 41 de enemigos naturales y 24 sin asignación verificada**. La falta de código IRAC no elimina sus usos SFE publicados.
- Se conserva el código completo, incluido el subgrupo: 1A, 1B, 3A, 4A, etc. ENGEO muestra **4A + 3A**, por sus dos componentes.
- UN, UNF y UNM son códigos oficiales explícitos; no se usan como sustitutos de un dato faltante. Metarhizium anisopliae y las cepas no confirmadas de otros hongos no reciben UNF por analogía.
- Los enemigos naturales no se convierten automáticamente en UN. En las fichas de invertebrados se preserva la dosis de liberación y se mantiene **Estadío** separado del nombre científico de la plaga, que queda sin informar cuando la fuente no lo proporciona. Se conserva la composición de cinco columnas, incluidos orden, familia y concentración.
- Las notas distinguen activo de referencia, sal, forma estereoisomérica y denominaciones parciales. El código no confirma una identidad química exacta ni vuelve intercambiables los productos.

Fuentes, catálogo, pendientes y validación: `../enriquecimiento_irac/`. En cada ficha, abrir **Grupo IRAC por ingrediente activo**. El PDF original no se redistribuye en el ZIP.

## FRAC y HRAC conservados

FRAC 2026: 138 denominaciones fungicidas, 108 con código contrastado y 30 sin código verificado. Se conservan las identidades químicas de referencia y sus limitaciones.

HRAC 2026: 77 denominaciones herbicidas, 76 con código del activo de referencia y una pendiente (`3,4-Dicloroanilida`, registro técnico sin cultivos). Los 720 herbicidas con fichas mantienen clasificación de sus ingredientes. Quinclorac conserva **4/29** y MSMA/fosamina conservan **0** explícito. FRAC, HRAC e IRAC no se sustituyen entre sí.

Censos fungicida y herbicida: **2026-11-17T22:57:56-06:00** y **2026-11-18T06:24:58-06:00**. Las extracciones reutilizadas conservan sus fechas y evidencias originales.

## Pantalla y controles

La tipografía utiliza **Roboto con peso 300 en toda la interfaz**, con alternativas Helvetica y Arial. La escala legible mantiene campos y datos de ficha a 16 px, ingredientes a 15 px, nombres comerciales a 18 px, códigos a 13 px e información auxiliar desde 12 px; la jerarquía se distingue por tamaño, color y espacio. Se comprobó el diseño sin desbordamiento a 320, 390, 768 y 1440 px. Roboto normal e itálica están integradas para funcionar sin conexión y sin CDN; se incluye la licencia SIL OFL 1.1 en `fonts/`.

Se mantienen **Molécula** y **Nombre comercial** como las únicas dos entradas principales. Cada entrada tiene autocompletado con un máximo inicial de seis coincidencias; «Mostrar el resto de los resultados» permite consultar las demás en un panel de altura limitada con desplazamiento. No se muestra el catálogo completo al enfocar un campo vacío; cada nueva búsqueda restablece el límite. Las sugerencias repetidas por mayúsculas o acentos se consolidan sin fusionar registros comerciales. Se mantiene selección con teclado, ratón y pantalla táctil. Las marcas e ingredientes llevan etiquetas FRAC/HRAC/IRAC de colores orientativos, no oficiales. Los estados pendientes y parciales se distinguen en gris; «sin código» no equivale a HRAC 0 ni a IRAC UN.

Cultivo y plaga/maleza permanecen ocultos inicialmente. En **Más opciones → Grupo de productos** se elige Fungicidas, Herbicidas o Insecticidas. La ficha conserva dosis, condiciones, intervalos, carencia, reingreso y restricciones del registro, sin extrapolarlos entre productos.

## Validación y archivos

- Todos los campos principales de las fichas fueron cotejados con sus HTML; las plagas y estadíos de invertebrados también fueron cotejados.
- Comparación como multiconjuntos contra los CSV originales: **6.315 filas fungicidas, 40.004 herbicidas y 6.868 insecticidas** conservan registro, cultivo, plaga/maleza, dosis, unidades, volúmenes, intervalos, carencia, reingreso, alcance y estadío cuando corresponde.
- **42 pruebas unitarias y 34 de navegador aprobadas**, sin omisiones: regresión FRAC/HRAC, IRAC, mezclas, pendientes, registros compartidos, CSV, móvil, offline, teclado y accesibilidad automática.
- La app no consulta el SFE ni los clasificadores automáticamente. Las fechas son documentales; no certifican vigencia jurídica, exhaustividad nacional ni autorizan aplicaciones.

En el proyecto completo, `../base_integrada/` contiene:

- `fitosanitarios_usos.csv`: todos los grupos, sin duplicar registros compartidos.
- `insecticidas_usos_por_cultivo_y_plaga.csv`: una fila por producto–cultivo–plaga.
- `insecticidas_producto_cultivo.csv`: una fila por ficha, con plagas y estadíos en JSON.
- `herbicidas_usos_por_cultivo_y_maleza.csv` y `herbicidas_producto_cultivo.csv`.
- `fungicidas_y_herbicidas_usos.csv`: conserva el alcance histórico, sin introducir insecticidas puros bajo ese nombre.
- `inventario_activos.csv`, `resumen_integracion.json` y `validacion_conservacion.json`.

Fuentes originales y controles de extracción: `../nacional_todos_cultivos/`, `../herbicidas_todos_cultivos/` y `../insecticidas_todos_cultivos/`.
