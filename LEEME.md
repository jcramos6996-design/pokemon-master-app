# Pokédex de Cartas

Buscador de cartas para el juego de mesa, con diseño pensado para el móvil
(filtros a pantalla completa, rejilla táctil, ficha con deslizamiento, zoom).

## Estructura

```
index.html          La página
style.css           Estilos
app.js              Buscador, filtros y fichas
data/cards.csv      Se genera desde tu Excel (tools/excel_a_csv.py)
data/extras.csv     Variantes y cartas que no están en el Excel (se edita a mano)
data/cards.js       Se genera desde los CSV (no tocar)
cards/              Aquí van las imágenes de tus cartas
tools/excel_a_csv.py    Excel -> cards.csv
tools/csv_a_cartas.py   CSV -> cards.js
```

## Actualizar desde tu Excel

```
pip install openpyxl                      # solo la primera vez
python3 tools/excel_a_csv.py PKMTUE.xlsx  # lee las hojas "Pokemon Gen ..." y crea data/cards.csv
python3 tools/csv_a_cartas.py             # crea data/cards.js
```
Toma del Excel: nombre, tipos, color, evolución, megaevolución, Surf / Teletransporte / Vuelo,
y para la ficha: habilidad (con su descripción), captura y ataques. La generación y la región
se deducen del número de Pokédex. Una hoja nueva (p. ej. «Pokemon Gen II») se procesa sola.
Las variantes van en `data/extras.csv`, que el script nunca sobrescribe.

## Añadir tus cartas

1. Guarda la imagen de cada carta en `cards/` con el número de Pokédex como nombre:
   `cards/025.webp` (también vale `.png`, `.jpg` o `.jpeg`).
   Si una carta tiene otro nombre de archivo, ponlo en la columna `image` del CSV.
2. Añade o edita una fila en `data/extras.csv` (o en el Excel). Las listas van separadas por `;`
   (por ejemplo `types` = `grass;poison`). Las evoluciones se indican con `evolvesTo`
   y la web calcula sola las etapas, las líneas evolutivas y las evoluciones ramificadas.
3. Ejecuta `python3 tools/csv_a_cartas.py` para regenerar `data/cards.js`.

Mientras una carta no tenga imagen, se muestra un marcador con su nombre y número.

### Variantes (cada una es una carta propia)

Una variante es otra carta del mismo Pokémon: Pikachu de Ash, Growlithe de Hisui,
Meowth de Alola, Meowth del Team Rocket... Se identifica añadiendo un sufijo al id:

| id | name | imagen |
|---|---|---|
| `025` | Pikachu | `cards/025.png` |
| `025_ash` | Pikachu de Ash | `cards/025_ash.png` |
| `058_hisui` | Growlithe de Hisui | `cards/058_hisui.webp` |
| `052_rocket` | Meowth del Team Rocket | `cards/052_rocket.png` |

- Cada variante tiene sus propios tipos, regiones y etiquetas (por ejemplo `props` = `starter`).
- Para que una variante evolucione a otra variante, usa su id completo en `evolvesTo`
  (`058_hisui` → `059_hisui`).
- Una variante **sin** `evolvesTo` propio hereda la línea de su carta base
  (Pikachu de Ash cuenta como Pikachu: etapa, "puede evolucionar", etc.).
- Todas llevan automáticamente la etiqueta `variant` (filtro «Variante»).
- Buscar `025` muestra la base y todas sus variantes; `025_ash` solo esa carta;
  `meowth` muestra todas las versiones de Meowth y su línea.
- En la ficha aparece una sección «Otras versiones» para saltar entre ellas.
- Puedes mezclar `.png`, `.webp` y `.jpg` libremente.

### Imágenes alternativas de una misma carta (opcional)

Para reversos o versiones brillantes de la MISMA carta, usa la columna `forms`:
`Reverso:025_back.png;Brillante:025_shiny.png`. En la ficha salen como botones.

## Consejos para que vaya fluida en el móvil

- Exporta las cartas en **WebP** (unos 400–600 px de ancho bastan para la rejilla).
- Con cientos de cartas, la web carga las imágenes poco a poco según haces scroll.

## Publicarla (gratis)

Subid la carpeta a un repositorio de GitHub y activad **Settings → Pages**
(rama `main`, carpeta raíz). Quedará en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.
También funciona abriendo `index.html` directamente en el navegador del ordenador.

## Búsqueda

| Escribes | Significa |
|---|---|
| `agua gen1` | Y (secciones distintas) |
| `agua/tierra` | O |
| `agua+tierra` | Y dentro del mismo término (doble tipo) |
| `-fuego` | excluir |
| `025` | por número de Pokédex |
| `eevee` | muestra toda su línea evolutiva |

Los botones de filtro: toca = activar, mantén pulsado = excluir. Los tipos se pueden
escribir en español (`agua`, `fuego`, `planta`…).
