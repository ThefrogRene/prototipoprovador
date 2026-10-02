# Probador virtual — Prototipo 01

Este prototipo:
1. Abre la cámara del computador.
2. Detecta una persona con MediaPipe Pose Landmarker.
3. Usa hombros y caderas para calcular el torso.
4. Coloca `assets/Polera.png` sobre el torso.
5. Suaviza el movimiento para que la prenda no salte demasiado.

## Cómo ejecutarlo

No abras `index.html` directamente con doble clic, porque los navegadores pueden bloquear
la cámara en archivos locales.

Necesitas ejecutar un servidor local dentro de esta carpeta.

### Opción A — Python

Si tienes Python instalado:

```bash
python -m http.server 8000
```

Luego abre:

http://localhost:8000

### Opción B — VS Code

Instala la extensión "Live Server", abre esta carpeta y ejecuta "Open with Live Server".

## Controles

- Activar cámara
- Mostrar/ocultar puntos corporales
- Ajuste vertical
- Tamaño

## Siguiente etapa

La primera versión usa una transformación rectangular de la PNG. No intenta deformar
la prenda alrededor de brazos, cintura o perspectiva. Para una segunda versión podemos
hacer que la ropa siga mejor el contorno corporal mediante una malla y/o segmentación.
