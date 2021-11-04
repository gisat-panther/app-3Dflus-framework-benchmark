import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {StaticMap} from "react-map-gl";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import {SimpleMeshLayer} from "@deck.gl/mesh-layers";
import {OBJLoader} from "@loaders.gl/obj";
import {scaleLinear} from "d3-scale";
import * as dat from 'dat.gui'
import {BASEMAP} from '@deck.gl/carto';

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "400 000",
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['400 000', '900 000', '1 700 000']).name('Number of arrows').listen();
// ---- GUI definition - end

const INITIAL_VIEW_STATE = {
    longitude: 120.81321,
    latitude: 14.7569,
    zoom: 10,
};


// if you want to use mapbox background layers fill in your mapbox token
// when MAPBOX_ACCESS_TOKEN is empty, background layer from "CARTO basemaps" is used instead
const MAPBOX_ACCESS_TOKEN = "";

const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
    "arrow": "./obj/arrow.obj"
}

const getPointUrls = (number) => {
    switch (number) {
        case "400 000":
            point_urls = [DATA_URLS.los142]
            break;
        case "900 000":
            point_urls = [DATA_URLS.los32, DATA_URLS.los142]
            break;
        case "1 700 000":
            point_urls = [DATA_URLS.los32, DATA_URLS.los142, DATA_URLS.vertg32, DATA_URLS.vertg142]
            break;
        default:
            point_urls = [DATA_URLS.los142]
    }
}

let point_urls = [];

getPointUrls(settings.numOfPoints)

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

let sizeScale = scaleLinear().domain([-30, 10]).range([4, 1]);


export default class App extends Component {
    state = {
        jsonData: [],
        mapStyle: MAPBOX_ACCESS_TOKEN.length > 0 ? 'mapbox://styles/mapbox/satellite-v9' : BASEMAP.POSITRON,
    };

    componentDidMount() {
        guiNumOfPoints.onChange(value => {
            this.setState({jsonData: []});
            getPointUrls(value)
            this._loadPoints()
        })
        this._loadPoints()
    }

    componentWillUnmount() {
        gui.destroy()
    }

    _loadPoints = () => {
        this._loadData().then((data) => {
            this.setState({jsonData: data});
        });
    }

    _loadData = async () => {
        let promisedData = [];
        point_urls.forEach((url) =>
            promisedData.push(
                new Promise((resolve, reject) => resolve(load(url, JSONLoader)))
            )
        );
        return Promise.all(promisedData).then((values) => values.flat());
    };

    render() {
        let layers = [];

        if (this.state.jsonData.length > 0) {
            layers.push(
                new SimpleMeshLayer({
                    id: "mesh-layer",
                    data: this.state.jsonData,
                    mesh: DATA_URLS.arrow,
                    loaders: [OBJLoader],
                    getScale: (d) => [1, sizeScale(d.properties.vel_avg), 1],
                    sizeScale: 100,
                    getPosition: (d) => d.geometry.coordinates,
                    getColor: (d) => colorScale(d.properties.vel_avg).rgb(),
                    getOrientation: (d) => [
                        0,
                        d.properties.az_ang,
                        d.properties.inc_ang,
                    ],
                    getTranslation: (d) => [0, 0, d.properties.h_cop30m * 100],
                })
            );
        }

        return (
            <div>
                <DeckGL
                    initialViewState={INITIAL_VIEW_STATE}
                    controller={true}
                    layers={layers}
                >
                    <StaticMap
                        mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
                        mapStyle={this.state.mapStyle}/>
                </DeckGL>
            </div>
        );
    }
}
