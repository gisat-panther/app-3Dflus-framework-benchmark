import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {GeoJsonLayer} from "@deck.gl/layers";
import {BitmapLayer} from '@deck.gl/layers';
import {TileLayer} from '@deck.gl/geo-layers';
import {StaticMap} from "react-map-gl";
import {ShapefileLoader} from "@loaders.gl/shapefile";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import * as dat from 'dat.gui'
import {BASEMAP} from '@deck.gl/carto';


// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "400 000",
    showBuildings: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['40 000', '400 000', '900 000', '1 700 000']).name('Number of points').listen();
let guiBuildings = gui.add(settings, 'showBuildings').name('Show buildings').listen()

// ---- GUI definition - end


const INITIAL_VIEW_STATE = {
    longitude: 14.4378,
    latitude: 50.0755,
    zoom: 8,
};

// if you want to use mapbox background layers fill in your mapbox token
// when MAPBOX_ACCESS_TOKEN is empty, background layer from "CARTO basemaps" is used instead
const MAPBOX_ACCESS_TOKEN = "";


export default class App extends Component {
    state = {
        mapStyle: MAPBOX_ACCESS_TOKEN.length > 0 ? 'mapbox://styles/mapbox/satellite-v9' : BASEMAP.POSITRON,
    };

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    render() {
        let layers = [];
        layers.push(
            new TileLayer({
                // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
                data: 'https://geoportal.cuzk.cz/WMS_ORTOFOTO_PUB/WMService.aspx.png',
                minZoom: 0,
                maxZoom: 19,
                tileSize: 256,


                renderSubLayers: props => {
                    const {
                        bbox: {west, south, east, north}
                    } = props.tile;

                    debugger

                    return new BitmapLayer(props, {
                        data: null,
                        image: props.data,
                        bounds: [west, south, east, north]
                    });
                }
            })
        )

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
