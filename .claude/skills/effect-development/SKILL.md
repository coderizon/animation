---
name: effect-development
description: CSS/SVG effect techniques reference for building visual effects on canvas elements and logos. Use when creating new effects, discussing effect ideas, or implementing advanced visual treatments like shadows, glows, distortions, reveals, or SVG-based animations.
argument-hint: "[effect-idea or technique]"
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Effekt-Entwicklung — Referenz & Patterns

Du entwickelst Effekte für einen DOM-basierten Canvas-Editor (1920×1080). Effekte sind CSS-`@keyframes`-Animationen auf Wrapper-Divs um den Element-Content. Sie laufen als `infinite` Loop unabhängig von Framer Motion Eingangsanimationen.

## Projekt-Integration

Neue Effekte folgen diesem Pattern (5 Schritte):

1. `EffectType` Union erweitern in `src/types/project.ts`
2. `EFFECT_DEFINITIONS` Record ergänzen (displayName, icon, description — deutsch)
3. `EFFECT_CSS_MAP` in `src/editor/utils/effectStyles.ts` ergänzen (animationName, baseDuration)
4. `@keyframes` in `src/index.css` definieren (mit `var(--effect-intensity, 1)` und `var(--effect-speed, 1)`)
5. `allTypes` Array in `src/editor/PropertiesPanel.tsx` erweitern

Spezial-Properties (wie `color` bei Glow): Conditional in `wrapWithEffects()` + `EffectSlot` UI.

Jeder Effekt hat: `intensity` (0.1–2.0), `speed` (0.5–3.0x), `enabled` boolean.
Duration = `baseDuration / speed`. Easing = `ease-in-out` (oder `linear` für Rotation).

## Verfügbare CSS-Techniken (DOM-kompatibel)

### Transform-basiert
Gut für Bewegung, Skalierung, Rotation. **Achtung**: Nur EIN transform pro Wrapper, daher separate Wrapper pro transform-Effekt.

| Technik | CSS | Gut für |
|---------|-----|---------|
| Translate X/Y | `translateX()`, `translateY()` | Schweben, Schütteln, Slide |
| Scale | `scale()` | Pulsieren, Heartbeat, Breathing |
| Rotate | `rotate()` | Wackeln, Drehen, Pendeln |
| Skew | `skewX()`, `skewY()` | Verzerrungs-Effekte, Glitch |
| Perspective + Rotate3d | `perspective() rotateX/Y()` | 3D-Kippen, Flip, Tilt |

### Filter-basiert
Können gestackt werden da filter kein transform ist. Mehrere filter in einer Deklaration möglich.

| Technik | CSS | Gut für |
|---------|-----|---------|
| `drop-shadow()` | `filter: drop-shadow(x y blur color)` | Glow, Neon, Schatten-Pulsieren |
| `blur()` | `filter: blur(px)` | Unschärfe-Pulse, Focus-Effekt |
| `brightness()` | `filter: brightness(1.5)` | Aufblitzen, Dimmen |
| `contrast()` | `filter: contrast(1.5)` | Dramatische Pulse |
| `saturate()` | `filter: saturate(2)` | Farb-Intensitäts-Pulse |
| `hue-rotate()` | `filter: hue-rotate(deg)` | Regenbogen, Farbverschiebung |
| `grayscale()` / `sepia()` | `filter: grayscale(1)` | Ein/Ausblenden von Farbe |
| `invert()` | `filter: invert(1)` | Negativ-Blitz |
| Kombiniert | `filter: brightness(1.2) saturate(1.5)` | Komplexe Licht-Effekte |

### Clip-Path-basiert
Dynamische Masken — animierbar mit `@keyframes`.

| Technik | CSS | Gut für |
|---------|-----|---------|
| `circle()` | `clip-path: circle(50% at 50% 50%)` | Radiale Reveals, Pulsierender Rand |
| `polygon()` | `clip-path: polygon(...)` | Geometrische Transitions, Wipe |
| `inset()` | `clip-path: inset(0 0 0 0)` | Rechteckige Reveals, Border-Animation |
| `path()` | `clip-path: path('M...')` | Organische Formen (limitierte Browser-Support) |

### Outline/Border-basiert
Für Kontur-Animationen ohne Layout-Shift.

| Technik | CSS | Gut für |
|---------|-----|---------|
| `outline` | `outline: 2px solid color` | Pulsierende Umrandung |
| `box-shadow` | `box-shadow: 0 0 10px color` | Glow (rechteckig, nicht form-angepasst) |
| `box-shadow inset` | `box-shadow: inset 0 0 20px` | Inneres Leuchten, Vignette |
| Multi-shadow | Mehrere `box-shadow` Werte | Schichtweise Glow-Ringe |

### Opacity/Blend
| Technik | CSS | Gut für |
|---------|-----|---------|
| `opacity` | `opacity: 0-1` | Blinken, Pulsierendes Erscheinen |
| `mix-blend-mode` | `mix-blend-mode: screen/overlay/...` | Licht-Überlagerung, Verschmelzung |

### Background-basiert (für spezielle Effekte)
| Technik | CSS | Gut für |
|---------|-----|---------|
| Gradient-Animation | `background-position` animieren | Schimmern, Sweep-Highlight |
| `background-size` | Animierte Größe | Breathing-Hintergrund |

## SVG-Filter-Effekte

SVG-Filter können via `filter: url(#filterId)` auf jedes DOM-Element angewendet werden. Dafür ein verstecktes `<svg>` mit `<defs>` ins DOM einfügen.

### Pattern: SVG-Filter als React-Component

```tsx
// Hidden SVG mit Filter-Definitionen
const SvgFilters = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      <filter id="effect-distort">
        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
      </filter>
    </defs>
  </svg>
);

// Anwendung via CSS:
// filter: url(#effect-distort)
```

### Verfügbare SVG-Filter-Primitives

| Filter | Was es tut | Effekt-Ideen |
|--------|-----------|--------------|
| `feTurbulence` | Perlin/Turbulence Noise | Wasser, Feuer, Verzerrung |
| `feDisplacementMap` | Pixel verschieben basierend auf Map | Glitch, Wellen, Hitze-Flimmern |
| `feGaussianBlur` | Gausssche Unschärfe | Weicher Glow, Tiefenschärfe |
| `feMorphology` | Erode/Dilate | Outline erzeugen, Fett/Dünn |
| `feColorMatrix` | Farb-Transformation (Matrix) | Farbton-Shift, Sepia, Invertieren |
| `feConvolveMatrix` | Kernel-basierte Filter | Schärfe, Emboss, Edge-Detection |
| `feComposite` | Zusammensetzen von Layern | Masking, Blending |
| `feFlood` + `feComposite` | Farbfläche + Compositing | Eingefärbte Overlays |
| `feDiffuseLighting` | Diffuse Beleuchtung | 3D-Oberflächen-Look |
| `feSpecularLighting` | Spekular-Highlights | Metallischer Glanz |

### Animierte SVG-Filter

SVG-Filter-Attribute können per `<animate>` animiert werden:

```xml
<filter id="effect-wave">
  <feTurbulence baseFrequency="0.02" numOctaves="2" result="noise">
    <animate attributeName="baseFrequency" values="0.02;0.04;0.02" dur="3s" repeatCount="indefinite" />
  </feTurbulence>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" />
</filter>
```

Oder per JavaScript (requestAnimationFrame) für bessere Kontrolle.

## SVG-Interne Animationstechniken

Für Logo-/Shape-Effekte die das SVG selbst manipulieren:

| Technik | Wie | Gut für |
|---------|-----|---------|
| Stroke-Dasharray Animation | `stroke-dasharray` + `stroke-dashoffset` animieren | Logo-Zeichnen (Draw-On), Pfad-Animation |
| Path Morphing | `d`-Attribut interpolieren (Bibliothek nötig: flubber/d3) | Form-Übergänge |
| SVG `<animate>` | SMIL-Animation auf SVG-Attributen | Filter-Parameter, Positionen |
| CSS auf SVG-Elemente | `fill`, `stroke`, `opacity` per CSS animieren | Farb-Pulse auf SVG-Teile |
| `<animateTransform>` | Transform auf SVG-Gruppen | Rotation einzelner SVG-Teile |

## Effekt-Ideen nach Kategorie

### Bewegung
- **Schwingen/Pendeln**: `rotate()` mit asymmetrischer Kurve (wie ein Pendel)
- **Vibrieren**: Schnelle kleine `translate` Änderungen (Shake)
- **Bounce**: `translateY` mit `cubic-bezier` für natürlichen Abprall
- **Orbit**: `rotate()` auf einem Offset-Wrapper (Kreisbewegung)

### Licht & Farbe
- **Neon-Flicker**: `drop-shadow` + `opacity` mit unregelmäßigem Timing
- **Regenbogen-Schimmer**: `hue-rotate()` Animation 0→360deg
- **Spotlight-Sweep**: Gradient `background-position` Animation als Overlay
- **Glint/Shine**: Diagonaler weißer Streifen der über das Element fährt (`clip-path` + `transform`)
- **Farbwechsel**: `filter: hue-rotate()` oder direkte `fill`/`color` Animation

### Verzerrung
- **Glitch**: `clip-path: inset()` mit `translateX`-Versatz auf mehreren Wrappern
- **Wellen/Ripple**: SVG `feTurbulence` + `feDisplacementMap`
- **Hitze-Flimmern**: Animierte `feTurbulence baseFrequency`
- **Pixelate**: SVG `feConvolveMatrix` oder Canvas-basiert

### Erscheinen/Verschwinden (Loop)
- **Blinken**: `opacity` Animation
- **Morphing Border**: `border-radius` Animation (Kreis↔Rechteck)
- **Scan-Line**: Horizontale Linie die wiederholt durchläuft

## Performance-Richtlinien

1. **CSS-Animationen bevorzugen** — laufen auf dem Compositor-Thread (transform, opacity)
2. **`filter` ist teurer** — GPU-beschleunigt aber bei vielen Elementen spürbar
3. **SVG-Filter sind am teuersten** — nur für Highlight-Effekte, nicht auf 20+ Elemente gleichzeitig
4. **`will-change: transform`** auf Wrapper setzen wenn nötig
5. **Keine `layout`-Properties animieren** (width, height, top, left) — immer `transform` nutzen
6. **`clip-path` ist moderat teuer** — OK für einzelne Elemente, nicht massenweise
7. DOM-Limit beachten: ~50-100 Elemente, jeder Effekt-Wrapper = zusätzliches DOM-Element

## Glint/Shine Effekt — Beispiel-Implementation

Zeigt wie ein fortgeschrittener Effekt aussehen könnte (diagonaler Lichtstreifen):

```css
@keyframes effect-shine {
  0% {
    -webkit-mask-position: -200% 0;
    mask-position: -200% 0;
  }
  100% {
    -webkit-mask-position: 200% 0;
    mask-position: 200% 0;
  }
}
```

Wrapper braucht:
```css
-webkit-mask-image: linear-gradient(
  -75deg,
  rgba(0,0,0,1) 30%,
  rgba(0,0,0,0.5) 50%,
  rgba(0,0,0,1) 70%
);
-webkit-mask-size: 200% 100%;
```

## Hinweise

- UI-Texte immer auf **Deutsch** (displayName, description)
- Effekt-Icons: Einzelnes ASCII-Zeichen oder kurzer Text
- Neue Custom Properties: `--effect-` Prefix beibehalten
- Testen in Editor UND Player (beide nutzen `wrapWithEffects`)
- Export/Import funktioniert automatisch da `effects` auf dem Element-Objekt liegt
