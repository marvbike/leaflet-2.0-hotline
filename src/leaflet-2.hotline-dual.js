/*
 * Leaflet.hotline for Leaflet 2.0.0-alpha (Dual Renderer Version)
 * A modern, ES6 module version that supports both SVG and Canvas renderers.
 * Original plugin by iosphere GmbH.
 * https://github.com/iosphere/Leaflet.hotline/
 */

import { SVG, Canvas, Polyline, LatLng, LineUtil } from 'leaflet';

// A utility class to manage the color palette, used by both renderers.
class Palette {
    constructor() {
        this.palette({ 0.0: 'green', 0.5: 'yellow', 1.0: 'red' });
    }

    palette(palette) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        canvas.width = 1;
        canvas.height = 256;
        for (const i in palette) {
            gradient.addColorStop(Number(i), palette[i]);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);
        this._palette = ctx.getImageData(0, 0, 1, 256).data;
        return this;
    }

    getRGBForValue(value, min, max) {
        const valueRelative = Math.min(Math.max((value - min) / (max - min), 0), 0.999);
        const paletteIndex = Math.floor(valueRelative * 256) * 4;
        return [this._palette[paletteIndex], this._palette[paletteIndex + 1], this._palette[paletteIndex + 2]];
    }
}

// A stateful utility object for clipping, used by the Polyline.
const HotlineUtil = {
    _lastCode: undefined,
    clipSegment(a, b, bounds, useLastCode, round) {
        let codeA = useLastCode ? this._lastCode : LineUtil._getBitCode(a, bounds);
        let codeB = LineUtil._getBitCode(b, bounds);
        let codeOut, p, newCode;
        this._lastCode = codeB;
        while (true) {
            if (!(codeA | codeB)) { return [a, b]; }
            if (codeA & codeB) { return false; }
            codeOut = codeA || codeB;
            p = LineUtil._getEdgeIntersection(a, b, codeOut, bounds, round);
            newCode = LineUtil._getBitCode(p, bounds);
            if (codeOut === codeA) { p.z = a.z; a = p; codeA = newCode; }
            else { p.z = b.z; b = p; codeB = newCode; }
        }
    }
};


// --- Canvas Renderer Implementation ---

class HotlineCanvasRenderer extends Canvas {
    constructor(options) {
        super(options);
        this._palette = new Palette();
    }

    _updatePoly(layer) {
        if (!this._drawing) { return; }

        const parts = layer._parts;
        if (!parts.length) { return; }

        const options = layer.options;
        const ctx = this._ctx;

        this._palette.palette(options.palette);
        ctx.lineCap = 'round';

        if (options.outlineWidth) {
            ctx.lineWidth = options.weight + 2 * options.outlineWidth;
            ctx.strokeStyle = options.outlineColor;
            for (const path of parts) {
                for (let j = 1; j < path.length; j++) {
                    const p1 = path[j - 1];
                    const p2 = path[j];
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        ctx.lineWidth = options.weight;
        for (const path of parts) {
            for (let j = 1; j < path.length; j++) {
                const p1 = path[j - 1];
                const p2 = path[j];
                const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                const c1 = this._palette.getRGBForValue(p1.z, options.min, options.max);
                const c2 = this._palette.getRGBForValue(p2.z, options.min, options.max);
                gradient.addColorStop(0, `rgb(${c1.join(',')})`);
                gradient.addColorStop(1, `rgb(${c2.join(',')})`);
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
}


// --- SVG Renderer Implementation ---

class HotlineSVGRenderer extends SVG {
    constructor(options) {
        super(options);
        this._palette = new Palette();
    }

    _initContainer() {
        super._initContainer();
        this._hotlineDefs = SVG.create('defs');
        this._container.appendChild(this._hotlineDefs);
    }

    _initPath(layer) {
        const g = layer._path = SVG.create('g');
        if (layer.options.className) {
            g.classList.add(...layer.options.className.split(' '));
        }
        if (layer.options.interactive) {
            g.classList.add('leaflet-interactive');
        }
    }

    _updateStyle() {
        // Do nothing. Styles are applied to individual segments in _updatePoly.
    }

    _updatePoly(layer) {
        if (!this._container) { return; }
        this._hotlineDefs.innerHTML = '';
        const group = layer._path;
        group.innerHTML = '';

        const parts = layer._parts;
        if (!parts.length) { return; }

        const options = layer.options;
        this._palette.palette(options.palette);

        const outlineGroup = SVG.create('g');
        const hotlineGroup = SVG.create('g');

        for (let i = 0; i < parts.length; i++) {
            const pathSegments = parts[i];
            for (let j = 1; j < pathSegments.length; j++) {
                const p1 = pathSegments[j - 1];
                const p2 = pathSegments[j];
                const gradId = `hotline-grad-${i}-${j}`;

                const grad = SVG.create('linearGradient');
                grad.setAttribute('id', gradId);
                grad.setAttribute('x1', p1.x); grad.setAttribute('y1', p1.y);
                grad.setAttribute('x2', p2.x); grad.setAttribute('y2', p2.y);
                grad.setAttribute('gradientUnits', 'userSpaceOnUse');

                const c1 = this._palette.getRGBForValue(p1.z, options.min, options.max);
                const stop1 = SVG.create('stop');
                stop1.setAttribute('offset', '0%');
                stop1.setAttribute('stop-color', `rgb(${c1.join(',')})`);
                grad.appendChild(stop1);

                const c2 = this._palette.getRGBForValue(p2.z, options.min, options.max);
                const stop2 = SVG.create('stop');
                stop2.setAttribute('offset', '100%');
                stop2.setAttribute('stop-color', `rgb(${c2.join(',')})`);
                grad.appendChild(stop2);
                this._hotlineDefs.appendChild(grad);

                if (options.outlineWidth > 0) {
                    const outline = SVG.create('path');
                    outline.setAttribute('d', `M${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
                    outline.setAttribute('stroke', options.outlineColor);
                    outline.setAttribute('stroke-width', (options.weight + 2 * options.outlineWidth).toString());
                    outline.setAttribute('stroke-linecap', 'round');
                    outline.setAttribute('fill', 'none');
                    outlineGroup.appendChild(outline);
                }

                const line = SVG.create('path');
                line.setAttribute('d', `M${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
                line.setAttribute('stroke', `url(#${gradId})`);
                line.setAttribute('stroke-width', options.weight.toString());
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('fill', 'none');
                hotlineGroup.appendChild(line);
            }
        }
        group.appendChild(outlineGroup);
        group.appendChild(hotlineGroup);
    }
}


// --- Renderer Factory and Main Polyline Class ---

const hotlineRenderer = (options) => {
    if (options.rendererType === 'canvas') {
        return new HotlineCanvasRenderer(options);
    }
    return new HotlineSVGRenderer(options);
};

export class HotlinePolyline extends Polyline {
    constructor(latlngs, options) {
        super(latlngs, options);
    }

    beforeAdd(map) {
        this.options.renderer = hotlineRenderer(this.options);
        super.beforeAdd(map);
    }

    onAdd(map) {
        super.onAdd(map);
        this._map.on('zoom', this._reset, this);
    }

    onRemove(map) {
        this._map.off('zoom', this._reset, this);
        super.onRemove(map);
    }

    _projectLatlngs(latlngs, result, projectedBounds) {
        const flat = latlngs[0] instanceof LatLng;
        if (flat) {
            const ring = [];
            for (let i = 0; i < latlngs.length; i++) {
                ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
                ring[i].z = latlngs[i].alt;
                projectedBounds.extend(ring[i]);
            }
            result.push(ring);
        } else {
            for (let i = 0; i < latlngs.length; i++) {
                this._projectLatlngs(latlngs[i], result, projectedBounds);
            }
        }
    }

    _clipPoints() {
        if (this.options.noClip) {
            this._parts = this._rings;
            return;
        }
        this._parts = [];
        if (!this._renderer || !this._renderer._bounds) { return; }
        const parts = this._parts;
        const bounds = this._renderer._bounds;
        for (let i = 0, k = 0, len = this._rings.length; i < len; i++) {
            const points = this._rings[i];
            for (let j = 0, len2 = points.length; j < len2 - 1; j++) {
                const segment = HotlineUtil.clipSegment(points[j], points[j + 1], bounds, j, true);
                if (!segment) { continue; }
                parts[k] = parts[k] || [];
                parts[k].push(segment[0]);
                if ((segment[1] !== points[j + 1]) || (j === len2 - 2)) {
                    parts[k].push(segment[1]);
                    k++;
                }
            }
        }
    }

    // *** THE FIX ***
    // This custom setStyle method ensures a redraw is triggered for both renderers.
    setStyle(style) {
        Object.assign(this.options, style);
        // The redraw() method is inherited from L.Path and correctly
        // triggers the renderer's update cycle.
        return this.redraw();
    }
}

export function hotline(latlngs, options) {
    return new HotlinePolyline(latlngs, options);
}

export default HotlinePolyline;
