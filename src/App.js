import React, { Component } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, ColumnLayer, PointCloudLayer } from "@deck.gl/layers";
import { HeatmapLayer, HexagonLayer } from "@deck.gl/aggregation-layers";
import { StaticMap } from "react-map-gl";
import { TerrainLayer } from "@deck.gl/geo-layers";
import { ShapefileLoader } from "@loaders.gl/shapefile";
import { JSONLoader } from "@loaders.gl/json";
import chroma from "chroma-js";
import { load } from "@loaders.gl/core";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { fromUrl } from "geotiff";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { CubeGeometry } from "@luma.gl/core";

const INITIAL_VIEW_STATE = {
  longitude: 120.81321,
  latitude: 14.7569,
  zoom: 10,
};

const COLUMNS = false;
const HEATMAP = false;
const HEXAGONS = false;
const POINTS = false;
const TERRAIN = true;
const BUILDINGS = false;
const POINTCLOUD = false;
const ARROW = true;

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiSGF2TGdwZyJ9.B0N8ybRGG38wmRK_VfxPoA";

const SHP_URL = "./data/manila_buildings_clip_larger_than_250.shp";

const POINT_URLS = [
  "./data/od_Michala/32.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/142_decimated.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/32.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/142.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/vertg/142.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/vertg/32.json",
];

const TERRAIN_URL = "./data/Copernicus_DSM_10_merged.tif";

let colorScale = chroma
  .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
  .domain([-30, 10]);

let heightColorScale = chroma
  .scale(["#A0FAB4", "#88CA97", "#6E9B78", "#536E59"])
  .domain([0, 20]);

export default class App extends Component {
  state = {
    jsonData: [],
    shpData: [],
    terrainData: [],
    terrainBoundingBox: [],
  };

  componentDidMount() {
    if (POINTS || POINTCLOUD || COLUMNS || HEXAGONS || HEATMAP || ARROW) {
      this._loadData().then((data) => {
        this.setState({ jsonData: data });
      });
    }

    if (BUILDINGS) {
      this._loadShpData().then((shpData) => {
        this.setState({ shpData });
      });
    }

    if (TERRAIN) {
      this._loadTIFData().then((terrainData) => {
        debugger;
        this.setState({ terrainData });
      });
    }
  }

  componentWillUnmount() {}

  _loadTIFData = async () => {
    try {
      let tiffData = await fromUrl(TERRAIN_URL);
      let imageData = await tiffData.getImage();
      debugger;
      this.setState({ terrainBoundingBox: imageData.getBoundingBox() });
      return imageData;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  _loadShpData = async () => {
    let promisedData = await load(SHP_URL, ShapefileLoader);
    return promisedData.data;
  };

  _loadData = async () => {
    let promisedData = [];
    POINT_URLS.forEach((url) =>
      promisedData.push(
        new Promise((resolve) => resolve(load(url, JSONLoader)))
      )
    );
    return Promise.all(promisedData).then((values) => {
      const data = values.flat();
      console.log("Data length: ", data.length);
      return data;
    });
  };

  render() {
    let layers = [];

    if (this.state.terrainData.length > 0 && TERRAIN) {
      layers.push(
        new TerrainLayer({
          elevationDecoder: {
            rScaler: 2,
            gScaler: 0,
            bScaler: 0,
            offset: 0,
          },
          // Digital elevation model from https://www.usgs.gov/
          elevationData: this.state.terrainData,
          texture:
            "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/terrain-mask.png",
          bounds: this.state.terrainBoundingBox,
        })
      );
    }

    if (this.state.shpData.length > 0) {
      if (BUILDINGS) {
        layers.push(
          new GeoJsonLayer({
            id: "geojson-layer",
            data: this.state.shpData,
            pickable: false,
            filled: true,
            extruded: true,
            getFillColor: (d) => [
              ...heightColorScale(Math.random() * 20).rgb(),
              255,
            ],
            getElevation: (d) => Math.random() * 20,
            elevationScale: 3,
          })
        );
      }
    }

    if (this.state.jsonData.length > 0) {
      if (HEATMAP) {
        layers.push(
          new HeatmapLayer({
            id: "heatmapLayer",
            data: this.state.jsonData,
            getPosition: (d) => d.geometry.coordinates,
            getWeight: (d) => d.properties.vel_avg,
            aggregation: "MEAN",
          })
        );
      }

      if (HEXAGONS) {
        layers.push(
          new HexagonLayer({
            id: "hexagon-layer",
            data: this.state.jsonData,
            pickable: true,
            extruded: true,
            radius: 200,
            elevationScale: 4,
            getColorWeight: (d) => d.properties.vel_avg,
            colorAggregation: "MEAN",
            getElevationWeight: (d) => d.properties.vel_avg,
            elevationAggregation: "SUM",
            elevationDomain: [-30, 10],
            colorDomain: [-30, 10],
            colorScale: [
              "#fda34b",
              "#ff7882",
              "#c8699e",
              "#7046aa",
              "#0c1db8",
              "#2eaaac",
            ],
            getPosition: (d) => d.geometry.coordinates,
          })
        );
      }

      if (COLUMNS) {
        layers.push(
          new ColumnLayer({
            id: "column-layer",
            data: this.state.jsonData,
            diskResolution: 12,
            radius: 250,
            extruded: true,
            pickable: true,
            elevationScale: 500,
            getPosition: (d) => d.geometry.coordinates,
            getFillColor: (d) => colorScale(d.properties.vel_avg).rgb(),
            getLineColor: [0, 0, 0],
            getElevation: (d) => 40 + d.properties.vel_avg,
          })
        );
      }

      if (POINTCLOUD) {
        layers.push(
          new PointCloudLayer({
            id: "point-cloud-layer",
            data: this.state.jsonData,
            pickable: false,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
            pointSize: 3,
            getPosition: (d) => [
              ...d.geometry.coordinates,
              Math.random() * 1000,
            ],
            getColor: (d) => colorScale(d.properties.vel_avg).rgb(),
          })
        );
      }

      if (ARROW) {
        layers.push(
          new SimpleMeshLayer({
            id: "mesh-layer",
            data: this.state.jsonData,
            // texture: "texture.png",
            mesh: new CubeGeometry(),
            getPosition: (d) => d.geometry.coordinates,
            getColor: (d) => colorScale(d.properties.vel_avg).rgb(),
            getOrientation: (d) => [
              d.properties.az_ang,
              d.properties.inc_ang,
              0,
            ],
          })
        );
      }

      if (POINTS) {
        layers.push(
          new GeoJsonLayer({
            id: "geojson-layer",
            data: this.state.jsonData,
            pickable: true,
            stroked: false,
            filled: true,
            extruded: true,
            pointType: "circle",
            lineWidthScale: 20,
            lineWidthMinPixels: 2,
            elevationValue: (d) => Math.random() * 100,
            getFillColor: (d) => [
              ...colorScale(d.properties.vel_avg).rgb(),
              180,
            ],
            getPointRadius: 20,
          })
        );
      }
    }

    return (
      <div>
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          // getTooltip={({ object }) =>
          //   object && `Vel avg: ${object.properties.vel_avg}`
          // }
        >
          <StaticMap
            mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={this.state.mapStyle}
          />
        </DeckGL>
      </div>
    );
  }
}
