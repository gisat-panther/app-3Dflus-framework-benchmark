import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {PointCloudLayer, PathLayer} from "@deck.gl/layers";
import {StaticMap} from "react-map-gl";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import {COORDINATE_SYSTEM} from "@deck.gl/core";
import * as dat from "dat.gui";
import {ANIMATION_URLS} from "./animation_urls";
import {BASEMAP} from '@deck.gl/carto';
import {TripsLayer} from "@deck.gl/geo-layers";

// ---- GUI definition - start
// const gui = new dat.GUI();
// const settings = {
//     animationType: "real data 1 000"
// }
// let guiAnimType = gui.add(settings, "animationType", ["real data 1 000", "random data 10 000", "random data 100 000", "random data 400 000"]).name("Animation type").listen();
// ---- GUI definition - end

const INITIAL_VIEW_STATE = {
    longitude: 120.81321,
    latitude: 14.7569,
    zoom: 10,
};

// if you want to use mapbox background layers fill in your mapbox token
// when MAPBOX_ACCESS_TOKEN is empty, background layer from "CARTO basemaps" is used instead
const MAPBOX_ACCESS_TOKEN = "";


const step = 1;
const intervalMS = 30;

let maxMinFrames = [0, 1]

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

const getDate = (dateNumber) => {
    if (dateNumber){
        const dateString = dateNumber.toString()
        return `${dateString.substring(0,4)}-${dateString.substring(4,6)}-${dateString.substring(6,8)}`
    }
    else return ""
}


export default class App extends Component {
    state = {
        time: maxMinFrames[0],
        jsonData: [],
        tripData: [],
        animatedData: [],
        timestampsGeneral: [],
        timestampsGenralIndex: [],
        mapStyle: MAPBOX_ACCESS_TOKEN.length > 0 ? 'mapbox://styles/mapbox/satellite-v9' : BASEMAP.POSITRON,
    };

    componentDidMount() {
        this._loadAnimatedData()
        this.timerID = setInterval(() => this._setTime(), intervalMS);
    }

    componentWillUnmount() {
    }

    _setTime = () => {
        let newTime = this.state.time + step;
        if (newTime >= maxMinFrames[1]){
            newTime = maxMinFrames[0]
        }
        this.setState({
            time: newTime,
        });
    }

    _loadAnimatedData = () => {
        this._loadData(ANIMATION_URLS).then((animatedData) => {
            this.setState({animatedData})
            this._createTimeArrays();
        });
    }

    _createTimeArrays = () => {
        let animatedData = this.state.animatedData;
        let tripData = [];
        // for timestamps that are same for all points, timestamps can be saved only once, not associating the same array for each trip
        let timestampsGeneral = []
        let timestampsCreated = false
        animatedData.forEach((item, index) => {
            let tripTrajectory = {
                id: item.id,
                path: [],
                // timestamps: []
            }
            let timestampIdx = 0
            Object.entries(item.properties).forEach(([key, value]) => {
                if (key.startsWith("d_")) {
                    const previousHeight = timestampIdx === 0 ? item.properties.h_cop30m + 50000 : tripTrajectory.path[timestampIdx - 1][2]
                    tripTrajectory.path.push([item.geometry.coordinates[0]+timestampIdx/10000, item.geometry.coordinates[1]+timestampIdx/10000, previousHeight + value])
                    if (!timestampsCreated){
                        timestampsGeneral.push(parseInt(key.substring(2)))
                    }
                    // tripTrajectory.timestamps.push(parseInt(key.substring(2)))
                    timestampIdx++
                }
            });
            tripData.push(tripTrajectory)
            if (!timestampsCreated && this.state.timestampsGeneral.length === 0 ){
                maxMinFrames[1] = timestampsGeneral.length
                this.setState({timestampsGeneral:  timestampsGeneral, timestampsGeneralIndex: [...Array(maxMinFrames[1]).keys()]})
                timestampsCreated = true
            }
        });
        this.setState({tripData})
    };


    _loadData = async (urls) => {
        let promisedData = [];
        urls.forEach((url) =>
            promisedData.push(
                new Promise((resolve, reject) => resolve(load(url, JSONLoader)))
            )
        );
        return Promise.all(promisedData).then((values) => values.flat());
    };

    render() {
        let layers = [];
        if (this.state.tripData.length > 0) {
            layers.push(
                new PointCloudLayer({
                    id: "point-layer",
                    data: this.state.tripData,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    pointSize: 2,
                    getPosition: (d) => d.path[80],
                    getColor: [253, 5, 255],
                }),
                new TripsLayer({
                    id: "trips-layer",
                    data: this.state.tripData,
                    getPath: (d) => d.path,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    getTimestamps: (d) => this.state.timestampsGeneralIndex,
                    getColor: [5, 128, 93],
                    widthMinPixels: 5,
                    fadeTrail: true,
                    trailLength: 100000,
                    currentTime: this.state.time,
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
                    <div>Current Time: {getDate(this.state.timestampsGeneral[this.state.time])}</div>
                </DeckGL>
            </div>
        );
    }
}
