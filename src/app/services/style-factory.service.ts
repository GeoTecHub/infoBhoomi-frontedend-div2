import { getCenter } from 'ol/extent';
import { FeatureLike } from 'ol/Feature';
import { Point, Polygon } from 'ol/geom';
import { Fill, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import type { GeometryFunction } from 'ol/style/Style';

import type { Geometry } from 'ol/geom';

function has8DigitHex(hex: string) {
  return /^#([0-9a-f]{8})$/i.test(hex);
}
function stripAlpha(hex: string) {
  return has8DigitHex(hex) ? `#${hex.slice(1, 7)}` : hex;
}

const POLY_ALPHA = '4D';

function getBaseStyle(t: string, color: string) {
  const base = stripAlpha(color);

  if (t === 'Point' || t === 'MultiPoint') {
    return new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: `${base}${POLY_ALPHA}` }),
        stroke: new Stroke({ color: base, width: 1 }),
      }),
      zIndex: 1000,
    });
  }

  return new Style({
    stroke: new Stroke({ color: base, width: t.includes('Line') ? 2 : 1 }),
    fill: t.includes('Polygon') ? new Fill({ color: `${base}${POLY_ALPHA}` }) : undefined,
  });
}

export function makePerFeatureStyleFn(getShowLabels: () => boolean, getShowArea?: () => boolean) {
  return (feature: FeatureLike, resolution: number) => {
    const geom = feature.getGeometry();
    const type = geom?.getType() || 'Polygon';

    const baseHex = (feature.get && feature.get('baseHex')) || '#000000';
    const base = getBaseStyle(type, baseHex);

    const force = (feature as any).get?.('forceLabel');
    if (force !== undefined && force !== null && String(force).trim() !== '') {
      const scale = resolution < 1 ? 1.1 : resolution < 2.5 ? 1 : 0.9;

      const labelGeometryFn: GeometryFunction = (f: FeatureLike): Geometry | undefined => {
        const g = f.getGeometry();
        if (!g) return undefined;
        const extent = g.getExtent();
        const [cx, cy] = getCenter(extent);
        return new Point([cx, cy]);
      };

      const textStyle = new Style({
        text: new Text({
          text: String(force),
          padding: [2, 4, 2, 4],
          offsetY: -2,
          scale,
          font: '10px "Quicksand", Arial, sans-serif',
          textAlign: 'center',
          textBaseline: 'middle',
          offsetX: 0,
          fill: new Fill({ color: '#000' }),
          backgroundFill: new Fill({ color: '#ffffff' }),
        }),
        geometry: labelGeometryFn,
      });

      return [base, textStyle];
    }

    const showLabels = typeof getShowLabels === 'function' ? !!getShowLabels() : false;
    const showArea = typeof getShowArea === 'function' ? !!getShowArea() : false;

    if (!showLabels && !showArea) return base;

    const labelLines: string[] = [];

    if (showLabels && (type === 'Polygon' || type === 'MultiPolygon')) {
      const id = String(feature.get('feature_Id') ?? feature.get('su_id') ?? feature.getId() ?? '');
      if (id) labelLines.push('ID ' + id);
    }

    if (showArea) {
      const isPoly = type === 'Polygon' || type === 'MultiPolygon';
      const isLine = type === 'LineString' || type === 'MultiLineString';

      if (isPoly || isLine) {
        let val: any = (feature.get && feature.get('area')) ?? null;
        let labelType = isLine ? 'Length ' : 'Area ';
        let unit = isLine ? 'm' : 'm²';

        if (val === null || val === undefined || Number(val) === 0) {
          val = 0;
        }

        const valText = Number.isFinite(Number(val))
          ? `${Number(val).toFixed(2)} ${unit}`
          : String(val);

        labelLines.push(labelType + valText);
      }
    }

    const label = labelLines.join('\n');
    if (!label) return base;

    const scale = resolution < 1 ? 1.1 : resolution < 2.5 ? 1 : 0.9;

    const textStyle = new Style({
      text: new Text({
        text: label,
        font: '10px "Quicksand", Arial, sans-serif',
        textAlign: 'center',
        textBaseline: 'middle',
        offsetX: 0,
        offsetY: 0,
        scale,
        fill: new Fill({ color: '#000' }),
      }),
      geometry: (f) => {
        const geom = f.getGeometry();
        const type = geom?.getType();
        if (type === 'Polygon') return (geom as Polygon).getInteriorPoint();
        if (type === 'MultiPolygon') return new Point(getCenter(geom!.getExtent()));
        return geom!;
      },
    });

    return [base, textStyle];
  };
}

export function convertColorNameToHex(colorName: string): string {
  if (!colorName || typeof colorName !== 'string') return '#000000';
  if (colorName.startsWith('#') || colorName.startsWith('rgb')) return colorName;
  const normalizedColorName = colorName.replace(/\s+/g, '').toLowerCase();
  try {
    if (typeof document !== 'undefined') {
      const ctx = document.createElement('canvas').getContext('2d');
      if (ctx) {
        ctx.fillStyle = normalizedColorName;
        return ctx.fillStyle;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return '#000000';
}
