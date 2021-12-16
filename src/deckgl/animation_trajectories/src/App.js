import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {PointCloudLayer, PathLayer, LineLayer} from "@deck.gl/layers";
import {StaticMap} from "react-map-gl";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import {COORDINATE_SYSTEM} from "@deck.gl/core";
import * as dat from "dat.gui";
import {ANIMATION_URLS} from "./animation_urls";
import {BASEMAP} from '@deck.gl/carto';
import {TripsLayer} from "@deck.gl/geo-layers";
import {scaleLinear} from "d3-scale";

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    visualizationType: "tripsLayer"
}
let guiAnimType = gui.add(settings, "visualizationType", ["lineLayer", "tripsLayer", "tripsLayerSegmented"]).name("Visualization type").listen();
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

let minMaxFrames = [0, 1]
let minMaxAbsChange = [100000, -1000]
let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    // .scale(["#2eaaac", "#0c1db8", "#7046aa", "#c8699e", "#ff7882", "#fda34b"])
    .domain([-30, 10]);

let colorScaleMinMaxChange = chroma
    .scale(['#3288bd', '#99d594', '#e6f598', '#ffffbf', '#fee08b', '#fc8d59', '#d53e4f'])
    // .scale(['#018294', '#5cac90', '#a2d586', '#f9f871', '#fcad75', '#e76086', '#aa01b0'])
    // .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

let widthScaleMinMaxChange = scaleLinear()
    .domain([0, 10])
    .range([1, 5]);

let minMaxChange = [10000, -1000]

const getDate = (dateNumber) => {
    if (dateNumber) {
        const dateString = dateNumber.toString()
        return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`
    } else return ""
}


export default class App extends Component {
    state = {
        time: minMaxFrames[0],
        tripSegmentedData: [],
        jsonData: [],
        tripData: [],
        animatedData: [],
        lineData: [],
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
        if (newTime >= minMaxFrames[1]) {
            newTime = minMaxFrames[0]
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
        const POS_INCREMENT = 10000
        let animatedData = this.state.animatedData;
        let tripData = [];
        let tripSegmentedData = []
        let lineData = [];
        // for timestamps that are same for all points, timestamps can be saved only once, not associating the same array for each trip
        let timestampsGeneral = []
        let timestampsCreated = false
        animatedData.forEach((item, index) => {
            let tripTrajectory = {
                id: item.id,
                path: [],
                heightChange: 0
                // timestamps: []
            }

            let timestampIdx = 0
            let modifiedHeights = []
            let heightIncrement = []
            Object.entries(item.properties).forEach(([key, value]) => {
                if (key.startsWith("d_")) {
                    if (value === null) {
                        value = timestampIdx === 0 ? 0 : modifiedHeights[timestampIdx - 1];
                    }
                    tripTrajectory.heightChange += Number(value)
                    const previousHeight = timestampIdx === 0 ? item.properties.h_cop30m + 50000 : tripTrajectory.path[timestampIdx - 1][2]
                    heightIncrement.push(timestampIdx === 0 ? 0 : value - modifiedHeights[timestampIdx - 1])
                    modifiedHeights.push(value)
                    tripTrajectory.path.push([item.geometry.coordinates[0] + timestampIdx / 10000, item.geometry.coordinates[1] + timestampIdx / 10000, previousHeight + value])
                    // tripTrajectory.path.push([item.geometry.coordinates[0] + timestampIdx / 10000, item.geometry.coordinates[1] + timestampIdx / 10000, item.properties.h_cop30m + 50000 + value * 100])
                    lineData.push({
                        pathIdx: index,
                        heightIdx: timestampIdx
                    })
                    if (!timestampsCreated) {
                        timestampsGeneral.push(parseInt(key.substring(2)))
                    }
                    // tripTrajectory.timestamps.push(parseInt(key.substring(2)))
                    timestampIdx++
                }
            });

            modifiedHeights.forEach((height, index) => {
                if (index + 1 < modifiedHeights.length) {
                    tripSegmentedData.push({
                        path: [
                            [item.geometry.coordinates[0] + index / POS_INCREMENT, item.geometry.coordinates[1] + index / POS_INCREMENT, item.properties.h_cop30m + 50000 + height * 100],
                            [item.geometry.coordinates[0] + (index + 1) / POS_INCREMENT, item.geometry.coordinates[1] + (index + 1) / POS_INCREMENT, item.properties.h_cop30m + 50000 + modifiedHeights[index + 1] * 100],
                        ],
                        timestamps: [index, index + 1],
                        colorValue: height
                    })
                }
            })

            animatedData[index].modifiedHeights = modifiedHeights;
            animatedData[index].heightIncrement = heightIncrement;
            minMaxChange[0] = Math.min(...heightIncrement) < minMaxChange[0] ? Math.min(...heightIncrement) : minMaxChange[0];
            minMaxChange[1] = Math.max(...heightIncrement) > minMaxChange[1] ? Math.max(...heightIncrement) : minMaxChange[1];
            minMaxAbsChange[0] = tripTrajectory.heightChange < minMaxAbsChange[0] ? tripTrajectory.heightChange : minMaxAbsChange[0];
            minMaxAbsChange[1] = tripTrajectory.heightChange > minMaxAbsChange[1] ? tripTrajectory.heightChange : minMaxAbsChange[1];
            tripData.push(tripTrajectory)
            if (!timestampsCreated && this.state.timestampsGeneral.length === 0) {
                minMaxFrames[1] = timestampsGeneral.length
                this.setState({
                    timestampsGeneral: timestampsGeneral,
                    timestampsGeneralIndex: [...Array(minMaxFrames[1]).keys()],

                })
                timestampsCreated = true
            }
        });
        colorScale.domain(minMaxAbsChange)
        widthScaleMinMaxChange.domain([0,Math.max.apply(null, minMaxChange.map(Math.abs))])
        colorScaleMinMaxChange.domain(minMaxChange)
        this.setState({
            tripSegmentedData,
            tripData,
            animatedData,
            lineData
        })
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
            if (settings.visualizationType === "lineLayer"){
                layers.push(
                    new LineLayer({
                        id: 'line-layer',
                        data: this.state.lineData,
                        pickable: true,
                        opoacity: 0.5,
                        getWidth: d => widthScaleMinMaxChange(Math.abs(this.state.animatedData[d.pathIdx].heightIncrement[d.heightIdx])),
                        getSourcePosition: d => [
                            ...this.state.animatedData[d.pathIdx].geometry.coordinates,
                            d.heightIdx === 0 ? this.state.animatedData[d.pathIdx].properties.h_cop30m + 50000 : this.state.animatedData[d.pathIdx].properties.h_cop30m + this.state.animatedData[d.pathIdx].modifiedHeights[d.heightIdx - 1] * 100 + 50000
                        ],
                        getTargetPosition: d => [
                            ...this.state.animatedData[d.pathIdx].geometry.coordinates,
                            this.state.animatedData[d.pathIdx].modifiedHeights[d.heightIdx] + 50000
                        ],
                        getColor: (d) => colorScaleMinMaxChange(this.state.animatedData[d.pathIdx].modifiedHeights[d.heightIdx]).rgb(),
                    })
                )
            }
            else if (settings.visualizationType === "tripsLayer"){
                layers.push(
                    new TripsLayer({
                        id: "trips-layer",
                        data: this.state.tripData,
                        getPath: (d) => d.path,
                        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                        getTimestamps: (d) => this.state.timestampsGeneralIndex,
                        getColor: (d) => colorScale(d.heightChange).rgb(),
                        widthMinPixels: 4,
                        fadeTrail: true,
                        trailLength: 100000,
                        currentTime: this.state.time,
                    }),
                )
            }
            else if (settings.visualizationType === "tripsLayerSegmented"){
                layers.push(
                    new TripsLayer({
                        id: "trips-layer",
                        data: this.state.tripSegmentedData,
                        getPath: (d) => d.path,
                        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                        getTimestamps: (d) => d.timestamps,
                        getColor: (d) => colorScaleMinMaxChange(d.colorValue).rgb(),
                        widthMinPixels: 4,
                        fadeTrail: false,
                        trailLength: 200,
                        currentTime: this.state.time,
                    })
                )
            }

            layers.push(
                new PointCloudLayer({
                    id: "point-layer",
                    data: this.state.tripData,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    pointSize: 1,
                    getPosition: (d) => d.path[80],
                    getColor: [253, 5, 255],
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
