# leaflet-2-hotline

A Leaflet 2.0.0 plugin for drawing colored gradients along polylines. This is useful for visualizing values along a course, for example: elevation, velocity, or heart rate. Default library file (leaflet-2.hotline.js) supports only Canvas renderer. Library file (leaflet-2.hotline-dual.js) supports both Canvas and SVG renderers.

Inspired by [Leaflet.hotline](https://github.com/iosphere/Leaflet.hotline/) and [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat/).


## Requirements

leaflet-2-hotline works with **Leaflet 2.0.0**


## Installation

* Run `npm install leaflet-hotline`
* or download the latest package


## Demo

<https://iosphere.github.io/Leaflet.hotline/demo/>


## Basic usage

## Documentation

### `data`

The `data` parameter needs to be an array of `LatLng` points (a polyline) with an additional third element (z value) in each point; this determines which color from the `palette` to use. Multiple polylines are supported.

### `options`

You can use the following options to style the hotline:

- **weight** - Same as usual. `5` per default.
- **outlineWidth** - The width of the outline along the stroke in pixels. Can be `0`. `1` per default.
- **outlineColor** - The color of the outline. `'black'` per default.
- **palette** - The config for the palette gradient in the form of `{ <stop>: '<color>' }`. `{ 0.0: 'green', 0.5: 'yellow', 1.0: 'red' }` per default. Stop values should be between `0` and `1`.
- **min** - The smallest z value expected in the `data` array. This maps to the `0` stop value. Any z values smaller than this will be considered as `min` when choosing the color to use.
- **max** - The largest z value expected in the `data` array. This maps to the `1` stop value. Any z values greater than this will be considered as `max` when choosing the color to use.


## Credits

* [@mourner](https://github.com/mourner) for [Leaflet](https://github.com/Leaflet/Leaflet/) and [Leaflet.hotline](https://github.com/iosphere/Leaflet.hotline/)
