import React, { Component } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { StaticMap } from "react-map-gl";
import { JSONLoader } from "@loaders.gl/json";
import chroma from "chroma-js";
import { load } from "@loaders.gl/core";

const INITIAL_VIEW_STATE = {
  longitude: 120.81321,
  latitude: 14.7569,
  zoom: 10,
};

const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiSGF2TGdwZyJ9.B0N8ybRGG38wmRK_VfxPoA";

const URLS = [
  "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/142_decimated.json",
  "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/32.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/vertg/142.json",
  // "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/vertg/32.json",
];

let colorScale = chroma
  .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
  .domain([-30, 10]);

export default class App extends Component {
  state = {
    jsonData: [],
  };

  componentDidMount() {
    this._loadData().then((data) => {
      this.setState({ jsonData: data });
    });
  }

  componentWillUnmount() {}

  _loadData = async () => {
    let promisedData = [];
    URLS.forEach((url) =>
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

    if (this.state.jsonData.length > 0) {
      layers.push(
        new GeoJsonLayer({
          id: "geojson-layer",
          data: this.state.jsonData,
          pickable: true,
          stroked: false,
          filled: true,
          extruded: false,
          pointType: "circle",
          lineWidthScale: 20,
          lineWidthMinPixels: 2,
          getFillColor: (d) => [...colorScale(d.properties.vel_avg).rgb(), 180],
          getPointRadius: 100,
        })
      );
    }

    return (
      <div>
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          getTooltip={({ object }) => object && `${object.properties.vel_avg}`}
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
