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
import arrayShuffle from "array-shuffle";

const INITIAL_VIEW_STATE = {
  longitude: 120.81321,
  latitude: 14.7569,
  zoom: 8,
};

const COLUMNS = false;
const HEATMAP = false;
const HEXAGONS = false;
const POINTS = false;
const TERRAIN = false;
const BUILDINGS = false;
const POINTCLOUD = false;
const ANIMATED_POINTS = true;

//animation constants
const FRAME_MIN_TIME = 100;
const ANIMATED_POINTS_COUNT = 1000;
let lastFrameTime = 0;
let frameCount = 0;
let currentFrame = 0;
let timelineDates = [];

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiSGF2TGdwZyJ9.B0N8ybRGG38wmRK_VfxPoA";

const SHP_URL = "./data/manila_buildings_clip_larger_than_250.shp";

const POINT_URLS = [
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/142_decimated.json",
  "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/32.json",
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
    animatedData: [],
    shpData: [],
    terrainData: [],
    terrainBoundingBox: [],
  };

  componentDidMount() {
    if (
      POINTS ||
      POINTCLOUD ||
      COLUMNS ||
      HEXAGONS ||
      HEATMAP ||
      ANIMATED_POINTS
    ) {
      this._loadData().then((data) => {
        this.setState({ jsonData: data });
        if (ANIMATED_POINTS) {
          this._loadAnimatedData(data).then((animatedData) => {
            this.setState({ animatedData });
            this._createTimeArrays();
            window.requestAnimationFrame(this._animate);
          });
        }
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
  _loadAnimatedData = (entireDataset) => {
    let idList = entireDataset.map((item) => item.id);
    let idListShorten = arrayShuffle(idList).slice(0, ANIMATED_POINTS_COUNT);

    let promisedData = [];
    idListShorten.forEach((id) => {
      const url = `https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/32/${id}.json`;
      promisedData.push(
        new Promise((resolve) => resolve(load(url, JSONLoader)))
      );
    });
    return Promise.all(promisedData).then((values) => values);
  };

  _createTimeArrays = () => {
    let animatedData = this.state.animatedData;
    animatedData.forEach((item, index) => {
      let timelineValues = [];
      Object.entries(item.properties).forEach(([key, value]) => {
        if (key.startsWith("d_")) {
          timelineValues.push(value == null ? 0 : value);
          if (index === 0) timelineDates.push(key);
        }
      });
      if (index === 0) frameCount = timelineValues.length;
      animatedData[index].d_timeline = timelineValues;
      animatedData[index].modified_height = item.properties.h_cop30m + 10000;
      animatedData[index].coordinate_update = timelineValues[0];
    });

    this.setState({ animatedData });
  };

  _animate = (time) => {
    if (time - lastFrameTime < FRAME_MIN_TIME) {
      window.requestAnimationFrame(this._animate);
      return;
    }

    lastFrameTime = time;

    if (currentFrame < frameCount) currentFrame++;
    else currentFrame = 0;

    let animatedData = [...this.state.animatedData];
    animatedData.forEach((item, index) => {
      animatedData[index].coordinate_update = item.d_timeline[currentFrame];
      if (currentFrame === 0) {
        animatedData[index].modified_height = item.properties.h_cop30m + 10000;
      }
      animatedData[index].modified_height =
        item.modified_height + item.d_timeline[currentFrame] / 10;
      animatedData[index].properties.color = chroma.random().rgb();
    });

    this.setState({ animatedData });
    window.requestAnimationFrame(this._animate);
  };

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

    if (this.state.animatedData.length > 0 && ANIMATED_POINTS) {
      layers.push(
        new PointCloudLayer({
          id: "animated-layer",
          data: this.state.animatedData,
          pickable: false,
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          pointSize: 6,
          getPosition: (d) => [...d.geometry.coordinates, d.modified_height],
          getColor: (d) => colorScale(d.properties.vel_avg).rgb(),
        })
      );

      // layers.push(
      //   new ColumnLayer({
      //     id: "animated-column-layer",
      //     data: this.state.animatedData,
      //     diskResolution: 12,
      //     radius: 250,
      //     extruded: true,
      //     pickable: true,
      //     elevationScale: 500,
      //     getPosition: (d) => d.geometry.coordinates,
      //     getFillColor: (d) => colorScale(d.properties.vel_avg).rgb(),
      //     getLineColor: [0, 0, 0],
      //     getElevation: (d) => d.modified_height / 500,
      //   })
      // );
    }

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
          Measurement time: {timelineDates[currentFrame]}
        </DeckGL>
      </div>
    );
  }
}
