import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {GeoJsonLayer} from "@deck.gl/layers";
import {StaticMap} from "react-map-gl";
import {ShapefileLoader} from "@loaders.gl/shapefile";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import * as dat from 'dat.gui'


// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "900 000",
    showBuildings: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['40 000', '400 000', '900 000', '1 700 000']).name('Number of points').listen();
let guiBuildings = gui.add(settings, 'showBuildings').name('Show buildings').listen()

// ---- GUI definition - end


const INITIAL_VIEW_STATE = {
    longitude: 120.81321,
    latitude: 14.7569,
    zoom: 10,
};

const MAPBOX_ACCESS_TOKEN =
    "pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiSGF2TGdwZyJ9.B0N8ybRGG38wmRK_VfxPoA";

const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "los142Decimated": "../../../data/interferometry/los/142_decimated.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
    "buildings": "./data/buildings/manila_buildings_larger_than_250.shp"
}

const getPointUrls = (number) => {
    switch (number) {
        case "40 000":
            point_urls = [DATA_URLS.los142Decimated]
            break;
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

const getShpUrl = (showBuilding) => {
    if (showBuilding) shp_url = DATA_URLS.buildings
    else shp_url = ""
}

let point_urls = [];
let shp_url = [];

getShpUrl(settings.showBuildings)
getPointUrls(settings.numOfPoints)

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

let heightColorScale = chroma
    .scale(["#A0FAB4", "#88CA97", "#6E9B78", "#536E59"])
    .domain([0, 20]);

export default class App extends Component {
    state = {
        mapStyle: 'mapbox://styles/mapbox/satellite-v9',
        jsonData: [],
        shpData: [],
    };

    componentDidMount() {
        guiNumOfPoints.onChange(value => {
            this.setState({jsonData: []});
            getPointUrls(value)
            this._loadPoints()
        })

        guiBuildings.onChange(showBuildings => {
            this.setState({shpData: []})
            getShpUrl(showBuildings)
            this._loadBuildings()
        })

        this._loadPoints()

        if (settings.showBuildings) {
            this._loadBuildings()
        }
    }

    componentWillUnmount() {
        gui.destroy()
    }

    _loadPoints = () => {
        this._loadData().then((data) => {
            this.setState({jsonData: data});
        });
    }

    _loadBuildings = () => {
        this._loadShpData().then((shpData) => {
            this.setState({shpData});
        });
    }

    _loadShpData = async () => {
        if (shp_url.length > 0) {
            let promisedData = await load(shp_url, ShapefileLoader);
            return promisedData.data;
        } else return []

    };

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


        if (this.state.shpData.length > 0) {
            if (settings.showBuildings) {
                layers.push(
                    new GeoJsonLayer({
                        id: "buildings-geojson-layer",
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
            layers.push(
                new GeoJsonLayer({
                    id: "points-geojson-layer",
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
                        255,
                    ],
                    getPointRadius: 20,
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
                            mapStyle={this.state.mapStyle}
                    />
                </DeckGL>
            </div>
        );
    }
}
