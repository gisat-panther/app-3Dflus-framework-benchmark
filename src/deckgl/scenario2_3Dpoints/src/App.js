import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {PointCloudLayer} from "@deck.gl/layers";
import {StaticMap} from "react-map-gl";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import {COORDINATE_SYSTEM} from "@deck.gl/core";
import * as dat from 'dat.gui'
import {TerrainLayer} from '@deck.gl/geo-layers';


// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "400 000"
}
// let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['40 000', '400 000', '900 000', '1 700 000']).name('Number of points').listen();
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['400 000', '900 000', '1 700 000']).name('Number of points').listen();

// ---- GUI definition - end

const INITIAL_VIEW_STATE = {
    longitude: 120.81321,
    latitude: 14.7569,
    zoom: 10,
};


const MAPBOX_ACCESS_TOKEN =
    "pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiSGF2TGdwZyJ9.B0N8ybRGG38wmRK_VfxPoA";

// const TERRAIN_IMAGE = `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.png?access_token=${MAPBOX_ACCESS_TOKEN}`;
const SURFACE_IMAGE = `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=${MAPBOX_ACCESS_TOKEN}`;
const EXAGG = 50;

const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
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

export default class App extends Component {
    state = {
        mapStyle: 'mapbox://styles/mapbox/satellite-v9',
        jsonData: []
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
                new PointCloudLayer({
                    id: "point-cloud-layer",
                    data: this.state.jsonData,
                    pickable: false,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    pointSize: 2,
                    getPosition: (d) => [
                        ...d.geometry.coordinates,
                        10 + d.properties.h_cop30m * 75,
                    ],
                    getColor: (d) => colorScale(d.properties.vel_avg).rgb(),
                })
            );

            layers.push(
                new TerrainLayer({
                    //https://github.com/tilezen/joerd/blob/master/docs/formats.md
                    elevationDecoder: {
                        rScaler: 256*EXAGG,
                        gScaler: EXAGG,
                        bScaler: 1/256/EXAGG,
                        offset: -32768*EXAGG
                    },
                    // texture: SURFACE_IMAGE,
                    elevationData: './data/Copernicus_DSM_10_merged_height-image_1000.png',
                    bounds: [119.99986111111112, 13.999861111111109, 122.0001388888889, 16.000138888888888],
                })
            )
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
